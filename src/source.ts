import type { VersionInfo } from './types.js';
import {
  DEFAULT_DATA_URL,
  DEFAULT_VERSION_URL,
} from './constants.js';
import { gunzip, sha256Hex } from './decode.js';

export interface FetchEnv {
  fetch: typeof fetch;
  dataURL: string;
  versionURL: string;
  signal?: AbortSignal;
}

export async function fetchVersion(env: Partial<FetchEnv> = {}): Promise<VersionInfo> {
  const doFetch = env.fetch ?? globalThis.fetch;
  const url = env.versionURL ?? DEFAULT_VERSION_URL;
  const res = await doFetch(url, { signal: env.signal });
  if (!res.ok) throw new Error(`js-cloudip: version.json HTTP ${res.status} from ${url}`);
  return (await res.json()) as VersionInfo;
}

export async function fetchData(
  env: Partial<FetchEnv> = {},
  verifyAgainst?: VersionInfo,
): Promise<{ bytes: Uint8Array; version: string }> {
  const doFetch = env.fetch ?? globalThis.fetch;
  const url = env.dataURL ?? DEFAULT_DATA_URL;
  const res = await doFetch(url, { signal: env.signal });
  if (!res.ok) throw new Error(`js-cloudip: data HTTP ${res.status} from ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const info = verifyAgainst ?? (await fetchVersion(env));
  const raw = await gunzip(bytes);
  const hash = await sha256Hex(raw);
  if (hash !== info.sha256) {
    throw new Error(
      `js-cloudip: sha256 mismatch (expected ${info.sha256}, got ${hash})`,
    );
  }
  return { bytes, version: info.version };
}
