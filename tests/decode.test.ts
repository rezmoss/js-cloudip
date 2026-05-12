import { describe, expect, it } from 'vitest';
import { encode } from '@msgpack/msgpack';
import { gzipSync } from 'node:zlib';
import { decodeDatabase, gunzip, sha256Hex } from '../src/decode.js';

describe('decode', () => {
  it('decodes a gzipped msgpack database', async () => {
    const raw = encode({
      version: '2026-05-12',
      build_time: 1,
      providers: ['aws'],
      ranges: [{ cidr: '1.2.3.0/24', p: 0, r: 'us-east-1', s: 'EC2' }],
    });
    const gz = gzipSync(raw);
    const db = await decodeDatabase(new Uint8Array(gz));
    expect(db.version).toBe('2026-05-12');
    expect(db.providers).toEqual(['aws']);
    expect(db.ranges[0]).toEqual({
      cidr: '1.2.3.0/24',
      provider: 'aws',
      region: 'us-east-1',
      service: 'EC2',
    });
  });

  it('gunzip round-trips', async () => {
    const raw = new TextEncoder().encode('hello world');
    const gz = gzipSync(raw);
    const out = await gunzip(new Uint8Array(gz));
    expect(new TextDecoder().decode(out)).toBe('hello world');
  });

  it('sha256Hex matches Node crypto', async () => {
    const buf = new TextEncoder().encode('abc');
    expect(await sha256Hex(buf)).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
