export type Provider = string;

export interface Range {
  cidr: string;
  provider: Provider;
  region?: string;
  service?: string;
}

export interface IPEntry {
  ip_address: string;
  ip_type: 'ipv4' | 'ipv6';
  provider: Provider;
  region?: string;
  service?: string;
}

export interface LookupResult {
  found: boolean;
  provider?: Provider;
  region?: string;
  service?: string;
  cidr?: string;
  ip_type?: 'ipv4' | 'ipv6';
}

export interface VersionInfo {
  version: string;
  build_time: number;
  sha256: string;
  ranges: number;
  size: number;
  size_gzip: number;
}

export interface Database {
  version: string;
  build_time: number;
  providers: Provider[];
  ranges: Range[];
}

export interface DetectorOptions {
  dataDir?: string | null;
  autoUpdateMs?: number;
  offline?: boolean;
  fetch?: typeof fetch;
  dataURL?: string;
  versionURL?: string;
  verifySha256?: boolean;
  ttlMs?: number;
  signal?: AbortSignal;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  info?: VersionInfo;
}
