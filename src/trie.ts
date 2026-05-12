import type { Range } from './types.js';

interface Node {
  zero?: Node;
  one?: Node;
  range?: Range;
}

export class CIDRTrie {
  private v4: Node = {};
  private v6: Node = {};

  insert(range: Range): void {
    const parsed = parseCIDR(range.cidr);
    if (!parsed) return;
    const root = parsed.bits.length === 32 ? this.v4 : this.v6;
    let node = root;
    for (let i = 0; i < parsed.prefix; i++) {
      const bit = parsed.bits[i] === 1 ? 'one' : 'zero';
      node[bit] ??= {};
      node = node[bit]!;
    }
    node.range ??= range;
  }

  lookup(ip: string): Range | undefined {
    const bits = ipToBits(ip);
    if (!bits) return undefined;
    const root = bits.length === 32 ? this.v4 : this.v6;
    let node: Node | undefined = root;
    let best = node.range;
    for (let i = 0; i < bits.length && node; i++) {
      node = bits[i] === 1 ? node.one : node.zero;
      if (node?.range) best = node.range;
    }
    return best;
  }
}

interface ParsedCIDR {
  bits: (0 | 1)[];
  prefix: number;
}

function parseCIDR(cidr: string): ParsedCIDR | null {
  const slash = cidr.indexOf('/');
  const ip = slash >= 0 ? cidr.slice(0, slash) : cidr;
  const bits = ipToBits(ip);
  if (!bits) return null;
  const prefix =
    slash >= 0 ? Number.parseInt(cidr.slice(slash + 1), 10) : bits.length;
  if (!Number.isFinite(prefix) || prefix < 0 || prefix > bits.length) {
    return null;
  }
  return { bits, prefix };
}

function ipToBits(ip: string): (0 | 1)[] | null {
  return ip.includes(':') ? ipv6ToBits(ip) : ipv4ToBits(ip);
}

function ipv4ToBits(ip: string): (0 | 1)[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const bits: (0 | 1)[] = [];
  for (const p of parts) {
    const n = Number.parseInt(p, 10);
    if (!Number.isFinite(n) || n < 0 || n > 255) return null;
    for (let i = 7; i >= 0; i--) bits.push(((n >> i) & 1) as 0 | 1);
  }
  return bits;
}

function ipv6ToBits(ip: string): (0 | 1)[] | null {
  const dbl = ip.split('::');
  if (dbl.length > 2) return null;
  const head = dbl[0] ? dbl[0].split(':') : [];
  const tail = dbl[1] ? dbl[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0 && dbl.length === 2) return null;
  if (dbl.length === 1 && head.length !== 8) return null;
  const groups: string[] =
    dbl.length === 2
      ? [...head, ...Array(missing).fill('0'), ...tail]
      : head;
  if (groups.length !== 8) return null;
  const bits: (0 | 1)[] = [];
  for (const g of groups) {
    const n = Number.parseInt(g || '0', 16);
    if (!Number.isFinite(n) || n < 0 || n > 0xffff) return null;
    for (let i = 15; i >= 0; i--) bits.push(((n >> i) & 1) as 0 | 1);
  }
  return bits;
}
