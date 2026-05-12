import { describe, expect, it, vi } from 'vitest';
import { encode } from '@msgpack/msgpack';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { Detector } from '../src/detector.js';

function buildFixture() {
  const db = {
    version: '2026-05-12',
    build_time: 1778548431,
    providers: ['aws', 'gcp', 'cloudflare'],
    ranges: [
      { cidr: '52.94.0.0/16', p: 0, r: 'us-east-1', s: 'EC2' },
      { cidr: '34.64.0.0/10', p: 1 },
      { cidr: '2606:4700::/32', p: 2 },
    ],
  };
  const raw = encode(db);
  const gz = gzipSync(raw);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  return { gz, sha256, version: db.version };
}

function makeFetch(fixture: ReturnType<typeof buildFixture>) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.endsWith('version.json')) {
      return new Response(
        JSON.stringify({
          version: fixture.version,
          build_time: 1,
          sha256: fixture.sha256,
          ranges: 3,
          size: 0,
          size_gzip: 0,
        }),
        { status: 200 },
      );
    }
    if (url.endsWith('cloudip.msgpack.gz')) {
      return new Response(fixture.gz, { status: 200 });
    }
    return new Response('not found', { status: 404 });
  });
}

describe('Detector', () => {
  it('loads data over fetch and answers lookups', async () => {
    const fixture = buildFixture();
    const detector = new Detector({
      fetch: makeFetch(fixture) as unknown as typeof fetch,
      dataDir: null,
    });
    await detector.ready();

    const r = detector.lookup('52.94.1.1');
    expect(r.found).toBe(true);
    expect(r.provider).toBe('aws');
    expect(r.region).toBe('us-east-1');
    expect(r.service).toBe('EC2');

    expect(detector.isAws('52.94.1.1')).toBe(true);
    expect(detector.isGcp('52.94.1.1')).toBe(false);
    expect(detector.isCloudflare('2606:4700::1')).toBe(true);
    expect(detector.isCloudProvider('8.8.8.8')).toBe(false);
    expect(detector.getProvider('34.64.5.5')).toBe('gcp');
    expect(detector.version()).toBe('2026-05-12');
    expect(detector.rangeCount()).toBe(3);
    expect(detector.providers()).toEqual(['aws', 'gcp', 'cloudflare']);
  });

  it('returns forward-lookup CIDRs per provider', async () => {
    const fixture = buildFixture();
    const detector = new Detector({
      fetch: makeFetch(fixture) as unknown as typeof fetch,
      dataDir: null,
    });
    await detector.ready();

    const aws = detector.getIPs('aws');
    expect(aws).toHaveLength(1);
    expect(aws[0]?.ip_address).toBe('52.94.0.0/16');
    expect(aws[0]?.ip_type).toBe('ipv4');

    const both = detector.getIPs(['aws', 'cloudflare']);
    expect(both.map((e) => e.ip_address).sort()).toEqual(
      ['2606:4700::/32', '52.94.0.0/16'].sort(),
    );
  });

  it('checkUpdate detects newer upstream version', async () => {
    const fixture = buildFixture();
    const detector = new Detector({
      fetch: makeFetch(fixture) as unknown as typeof fetch,
      dataDir: null,
    });
    await detector.ready();
    const result = await detector.checkUpdate();
    expect(result.hasUpdate).toBe(false);
    expect(result.info?.version).toBe(fixture.version);
  });

  it('falls back to cache when network fails', async () => {
    const fixture = buildFixture();
    let online = true;
    const mockFetch = vi.fn(async (input: string | URL | Request) => {
      if (!online) throw new Error('offline');
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('version.json')) {
        return new Response(
          JSON.stringify({
            version: fixture.version,
            build_time: 1,
            sha256: fixture.sha256,
            ranges: 3,
            size: 0,
            size_gzip: 0,
          }),
          { status: 200 },
        );
      }
      return new Response(fixture.gz, { status: 200 });
    });

    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const path = await import('node:path');
    const dir = mkdtempSync(path.join(tmpdir(), 'jsci-'));

    const first = new Detector({
      fetch: mockFetch as unknown as typeof fetch,
      dataDir: dir,
    });
    await first.ready();
    expect(first.version()).toBe(fixture.version);

    online = false;
    const second = new Detector({
      fetch: mockFetch as unknown as typeof fetch,
      dataDir: dir,
    });
    await second.ready();
    expect(second.version()).toBe(fixture.version);
  });
});
