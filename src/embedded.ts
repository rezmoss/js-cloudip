import type {
  IPEntry,
  LookupResult,
  Provider,
} from './types.js';
import { Detector, newDetector } from './detector.js';

export type {
  Database,
  IPEntry,
  LookupResult,
  Provider,
  Range,
} from './types.js';
export { Detector } from './detector.js';
export {
  PROVIDER_AWS,
  PROVIDER_AZURE,
  PROVIDER_CLOUDFLARE,
  PROVIDER_DIGITALOCEAN,
  PROVIDER_GCP,
  PROVIDER_ORACLE,
} from './constants.js';

let defaultDetector: Detector | undefined;
let defaultPromise: Promise<Detector> | undefined;

async function getDefault(): Promise<Detector> {
  if (defaultDetector) return defaultDetector;
  if (defaultPromise) return defaultPromise;
  defaultPromise = newDetector({ offline: true, dataDir: null }).then((d) => {
    defaultDetector = d;
    return d;
  });
  return defaultPromise;
}

export async function lookup(ip: string): Promise<LookupResult> {
  return (await getDefault()).lookup(ip);
}

export async function getProvider(ip: string): Promise<Provider> {
  return (await getDefault()).getProvider(ip);
}

export async function isCloudProvider(ip: string): Promise<boolean> {
  return (await getDefault()).isCloudProvider(ip);
}

export async function isAws(ip: string): Promise<boolean> {
  return (await getDefault()).isAws(ip);
}

export async function isGcp(ip: string): Promise<boolean> {
  return (await getDefault()).isGcp(ip);
}

export async function isAzure(ip: string): Promise<boolean> {
  return (await getDefault()).isAzure(ip);
}

export async function isCloudflare(ip: string): Promise<boolean> {
  return (await getDefault()).isCloudflare(ip);
}

export async function isDigitalOcean(ip: string): Promise<boolean> {
  return (await getDefault()).isDigitalOcean(ip);
}

export async function isOracle(ip: string): Promise<boolean> {
  return (await getDefault()).isOracle(ip);
}

export async function getIPs(
  providers?: Provider | Provider[],
): Promise<IPEntry[]> {
  return (await getDefault()).getIPs(providers);
}

export async function version(): Promise<string> {
  return (await getDefault()).version();
}

export async function rangeCount(): Promise<number> {
  return (await getDefault()).rangeCount();
}

export async function providers(): Promise<readonly Provider[]> {
  return (await getDefault()).providers();
}

export async function ageDays(): Promise<number> {
  const d = await getDefault();
  return (Date.now() / 1000 - d.buildTime()) / 86400;
}
