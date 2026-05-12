export const PROVIDER_AWS = 'aws';
export const PROVIDER_GCP = 'gcp';
export const PROVIDER_AZURE = 'azure';
export const PROVIDER_CLOUDFLARE = 'cloudflare';
export const PROVIDER_DIGITALOCEAN = 'digitalocean';
export const PROVIDER_ORACLE = 'oracle';

export const DEFAULT_BASE_URL =
  'https://raw.githubusercontent.com/rezmoss/cloudip-db/main/data';
export const DEFAULT_DATA_URL = `${DEFAULT_BASE_URL}/cloudip.msgpack.gz`;
export const DEFAULT_VERSION_URL = `${DEFAULT_BASE_URL}/version.json`;

export const HOUR_MS = 60 * 60 * 1000;
export const DEFAULT_TTL_MS = 24 * HOUR_MS;
