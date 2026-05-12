import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';

const BASE =
  process.env.CLOUDIP_DB_BASE ??
  'https://raw.githubusercontent.com/rezmoss/cloudip-db/main/data';

async function main() {
  const outDir = path.resolve('data');
  await mkdir(outDir, { recursive: true });

  const versionRes = await fetch(`${BASE}/version.json`);
  if (!versionRes.ok) throw new Error(`version.json HTTP ${versionRes.status}`);
  const versionJson = (await versionRes.json()) as {
    version: string;
    sha256: string;
    ranges: number;
    size_gzip: number;
  };

  const dataRes = await fetch(`${BASE}/cloudip.msgpack.gz`);
  if (!dataRes.ok) throw new Error(`cloudip.msgpack.gz HTTP ${dataRes.status}`);
  const gz = new Uint8Array(await dataRes.arrayBuffer());

  const raw = gunzipSync(gz);
  const hash = createHash('sha256').update(raw).digest('hex');
  if (hash !== versionJson.sha256) {
    throw new Error(
      `sha256 mismatch: expected ${versionJson.sha256}, got ${hash}`,
    );
  }

  await writeFile(path.join(outDir, 'cloudip.msgpack.gz'), gz);
  await writeFile(
    path.join(outDir, 'version.json'),
    JSON.stringify(versionJson, null, 2),
  );

  console.log(
    `fetched cloudip-db version=${versionJson.version} ranges=${versionJson.ranges} size_gzip=${versionJson.size_gzip}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
