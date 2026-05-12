import type {
  CheckUpdateResult,
  Database,
  DetectorOptions,
  IPEntry,
  LookupResult,
  Provider,
  VersionInfo,
} from './types.js';
import { CIDRTrie } from './trie.js';
import { decodeDatabase } from './decode.js';
import {
  cacheAge,
  clearCache,
  readCache,
  resolveCacheDir,
  writeCache,
} from './cache.js';
import { fetchData, fetchVersion } from './source.js';
import { loadEmbeddedGz } from './embedded-loader.js';
import {
  DEFAULT_DATA_URL,
  DEFAULT_TTL_MS,
  DEFAULT_VERSION_URL,
  HOUR_MS,
  PROVIDER_AWS,
  PROVIDER_AZURE,
  PROVIDER_CLOUDFLARE,
  PROVIDER_DIGITALOCEAN,
  PROVIDER_GCP,
  PROVIDER_ORACLE,
} from './constants.js';

interface State {
  db: Database;
  trie: CIDRTrie;
  byProvider: Map<string, IPEntry[]>;
}

function buildState(db: Database): State {
  const trie = new CIDRTrie();
  const byProvider = new Map<string, IPEntry[]>();
  for (const r of db.ranges) {
    trie.insert(r);
    const key = r.provider.toLowerCase();
    let arr = byProvider.get(key);
    if (!arr) {
      arr = [];
      byProvider.set(key, arr);
    }
    const entry: IPEntry = {
      ip_address: r.cidr,
      ip_type: r.cidr.includes(':') ? 'ipv6' : 'ipv4',
      provider: r.provider,
    };
    if (r.region) entry.region = r.region;
    if (r.service) entry.service = r.service;
    arr.push(entry);
  }
  return { db, trie, byProvider };
}

export class Detector {
  private state?: State;
  private readonly opts: Required<
    Pick<
      DetectorOptions,
      'autoUpdateMs' | 'offline' | 'dataURL' | 'versionURL' | 'verifySha256' | 'ttlMs'
    >
  > & {
    dataDir: string | null;
    fetch?: typeof fetch;
    signal?: AbortSignal;
  };
  private autoUpdateTimer?: ReturnType<typeof setInterval>;

  constructor(options: DetectorOptions = {}) {
    const autoUpdateMs = options.autoUpdateMs ?? 0;
    this.opts = {
      dataDir: resolveCacheDir(options.dataDir),
      autoUpdateMs:
        autoUpdateMs > 0 && autoUpdateMs < HOUR_MS ? HOUR_MS : autoUpdateMs,
      offline: options.offline ?? false,
      fetch: options.fetch,
      dataURL: options.dataURL ?? DEFAULT_DATA_URL,
      versionURL: options.versionURL ?? DEFAULT_VERSION_URL,
      verifySha256: options.verifySha256 ?? true,
      ttlMs: options.ttlMs ?? DEFAULT_TTL_MS,
      signal: options.signal,
    };
  }

  async ready(): Promise<this> {
    if (this.state) return this;
    await this.loadInitial();
    if (this.opts.autoUpdateMs > 0 && !this.opts.offline) {
      this.autoUpdateTimer = setInterval(() => {
        void this.update().catch(() => undefined);
      }, this.opts.autoUpdateMs);
      const t = this.autoUpdateTimer as { unref?: () => void };
      t.unref?.();
    }
    return this;
  }

  close(): void {
    if (this.autoUpdateTimer) clearInterval(this.autoUpdateTimer);
    this.autoUpdateTimer = undefined;
  }

  private fetchEnv() {
    return {
      fetch: this.opts.fetch,
      dataURL: this.opts.dataURL,
      versionURL: this.opts.versionURL,
      signal: this.opts.signal,
    };
  }

  private async loadInitial(): Promise<void> {
    if (!this.opts.offline) {
      try {
        const fresh = await fetchData(this.fetchEnv());
        const db = await decodeDatabase(fresh.bytes);
        this.state = buildState(db);
        if (this.opts.dataDir) await writeCache(this.opts.dataDir, fresh);
        return;
      } catch {
        // fall through
      }
    }
    if (this.opts.dataDir) {
      const age = await cacheAge(this.opts.dataDir);
      if (age !== undefined && (this.opts.offline || age <= this.opts.ttlMs)) {
        const cached = await readCache(this.opts.dataDir);
        if (cached) {
          try {
            const db = await decodeDatabase(cached.bytes);
            this.state = buildState(db);
            return;
          } catch {
            // fall through
          }
        }
      } else if (this.opts.dataDir) {
        const cached = await readCache(this.opts.dataDir);
        if (cached) {
          try {
            const db = await decodeDatabase(cached.bytes);
            this.state = buildState(db);
            return;
          } catch {
            // fall through
          }
        }
      }
    }
    const embedded = await loadEmbeddedGz();
    if (embedded) {
      const db = await decodeDatabase(embedded);
      this.state = buildState(db);
      return;
    }
    throw new Error(
      'js-cloudip: no data available (network failed, no cache, no embedded data)',
    );
  }

  async update(): Promise<void> {
    if (this.opts.offline) {
      throw new Error('js-cloudip: update disabled in offline mode');
    }
    const fresh = await fetchData(this.fetchEnv());
    const db = await decodeDatabase(fresh.bytes);
    this.state = buildState(db);
    if (this.opts.dataDir) await writeCache(this.opts.dataDir, fresh);
  }

  async checkUpdate(): Promise<CheckUpdateResult> {
    if (this.opts.offline) {
      throw new Error('js-cloudip: update check disabled in offline mode');
    }
    const info = await fetchVersion(this.fetchEnv());
    const local = this.state?.db.version ?? '';
    return { hasUpdate: info.version > local, info };
  }

  async clearCache(): Promise<void> {
    await clearCache(this.opts.dataDir);
  }

  private requireState(): State {
    if (!this.state) {
      throw new Error('js-cloudip: detector not ready — call await detector.ready() first');
    }
    return this.state;
  }

  lookup(ip: string): LookupResult {
    const r = this.requireState().trie.lookup(ip);
    if (!r) return { found: false };
    const result: LookupResult = {
      found: true,
      provider: r.provider,
      cidr: r.cidr,
      ip_type: r.cidr.includes(':') ? 'ipv6' : 'ipv4',
    };
    if (r.region) result.region = r.region;
    if (r.service) result.service = r.service;
    return result;
  }

  getProvider(ip: string): Provider {
    return this.lookup(ip).provider ?? '';
  }

  isCloudProvider(ip: string): boolean {
    return this.lookup(ip).found;
  }

  isAws(ip: string): boolean {
    return this.getProvider(ip) === PROVIDER_AWS;
  }
  isGcp(ip: string): boolean {
    return this.getProvider(ip) === PROVIDER_GCP;
  }
  isAzure(ip: string): boolean {
    return this.getProvider(ip) === PROVIDER_AZURE;
  }
  isCloudflare(ip: string): boolean {
    return this.getProvider(ip) === PROVIDER_CLOUDFLARE;
  }
  isDigitalOcean(ip: string): boolean {
    return this.getProvider(ip) === PROVIDER_DIGITALOCEAN;
  }
  isOracle(ip: string): boolean {
    return this.getProvider(ip) === PROVIDER_ORACLE;
  }

  getIPs(providers?: Provider | Provider[]): IPEntry[] {
    const s = this.requireState();
    if (providers === undefined) {
      const all: IPEntry[] = [];
      for (const arr of s.byProvider.values()) all.push(...arr);
      return all;
    }
    const want = Array.isArray(providers) ? providers : [providers];
    const out: IPEntry[] = [];
    for (const p of want) {
      const hit = s.byProvider.get(p.toLowerCase());
      if (hit) out.push(...hit);
    }
    return out;
  }

  version(): string {
    return this.state?.db.version ?? '';
  }

  buildTime(): number {
    return this.state?.db.build_time ?? 0;
  }

  rangeCount(): number {
    return this.state?.db.ranges.length ?? 0;
  }

  providers(): readonly Provider[] {
    return this.state?.db.providers ?? [];
  }
}

export async function newDetector(options?: DetectorOptions): Promise<Detector> {
  const d = new Detector(options);
  await d.ready();
  return d;
}

export async function loadVersion(
  options: Pick<DetectorOptions, 'fetch' | 'versionURL' | 'signal'> = {},
): Promise<VersionInfo> {
  return fetchVersion(options);
}
