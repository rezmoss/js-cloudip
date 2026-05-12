export async function loadEmbeddedGz(): Promise<Uint8Array | undefined> {
  if (typeof process === 'undefined' || !process.versions?.node) {
    return undefined;
  }
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const url = await import('node:url');
  let here: string;
  try {
    here = path.dirname(url.fileURLToPath(import.meta.url));
  } catch {
    here =
      typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  }
  const candidates = [
    path.join(here, '..', 'data', 'cloudip.msgpack.gz'),
    path.join(here, 'data', 'cloudip.msgpack.gz'),
    path.join(process.cwd(), 'data', 'cloudip.msgpack.gz'),
  ];
  for (const p of candidates) {
    try {
      return new Uint8Array(await readFile(p));
    } catch {
      // try next
    }
  }
  return undefined;
}
