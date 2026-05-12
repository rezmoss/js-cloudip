const isNode = typeof process !== 'undefined' && !!process.versions?.node;

export interface CachedData {
  version: string;
  bytes: Uint8Array;
}

function defaultCacheDir(): string {
  const home =
    process.env.HOME || process.env.USERPROFILE || process.env.TMPDIR || '/tmp';
  return `${home}/.cache/js-cloudip`;
}

export function resolveCacheDir(dir: string | null | undefined): string | null {
  if (dir === null) return null;
  if (!isNode) return null;
  return dir ?? defaultCacheDir();
}

export async function readCache(dir: string): Promise<CachedData | undefined> {
  try {
    const { readFile } = await import('node:fs/promises');
    const path = await import('node:path');
    const bytes = new Uint8Array(
      await readFile(path.join(dir, 'cloudip.msgpack.gz')),
    );
    const meta = JSON.parse(
      await readFile(path.join(dir, 'version.json'), 'utf8'),
    ) as { version: string; storedAt: number };
    return { version: meta.version, bytes };
  } catch {
    return undefined;
  }
}

export async function writeCache(
  dir: string,
  data: CachedData,
): Promise<void> {
  try {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const path = await import('node:path');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'cloudip.msgpack.gz'), data.bytes);
    await writeFile(
      path.join(dir, 'version.json'),
      JSON.stringify({ version: data.version, storedAt: Date.now() }),
    );
  } catch {
    // best-effort
  }
}

export async function cacheAge(dir: string): Promise<number | undefined> {
  try {
    const { readFile } = await import('node:fs/promises');
    const path = await import('node:path');
    const meta = JSON.parse(
      await readFile(path.join(dir, 'version.json'), 'utf8'),
    ) as { storedAt: number };
    return Date.now() - meta.storedAt;
  } catch {
    return undefined;
  }
}

export async function clearCache(dir?: string | null): Promise<void> {
  if (!isNode) return;
  const resolved = resolveCacheDir(dir);
  if (!resolved) return;
  try {
    const { rm } = await import('node:fs/promises');
    await rm(resolved, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}
