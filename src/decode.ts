import { decode as msgpackDecode } from '@msgpack/msgpack';
import type { Database, Range } from './types.js';

interface RawRange {
  cidr: string;
  p: number;
  r?: string;
  s?: string;
}

interface RawDatabase {
  version: string;
  build_time: number;
  providers: string[];
  ranges: RawRange[];
}

export async function gunzip(buf: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([buf as BlobPart]).stream().pipeThrough(ds);
    const out = await new Response(stream).arrayBuffer();
    return new Uint8Array(out);
  }
  const { gunzipSync } = await import('node:zlib');
  return new Uint8Array(gunzipSync(buf));
}

export async function decodeDatabase(gzBuf: Uint8Array): Promise<Database> {
  const raw = await gunzip(gzBuf);
  const obj = msgpackDecode(raw) as RawDatabase;
  const providers = obj.providers;
  const ranges: Range[] = obj.ranges.map((r) => {
    const provider = providers[r.p];
    if (!provider) throw new Error(`js-cloudip: unknown provider index ${r.p}`);
    const out: Range = { cidr: r.cidr, provider };
    if (r.r) out.region = r.r;
    if (r.s) out.service = r.s;
    return out;
  });
  return {
    version: obj.version,
    build_time: obj.build_time,
    providers,
    ranges,
  };
}

export async function sha256Hex(buf: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer;
    const digest = await crypto.subtle.digest('SHA-256', ab);
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(buf).digest('hex');
}
