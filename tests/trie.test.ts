import { describe, expect, it } from 'vitest';
import { CIDRTrie } from '../src/trie.js';

describe('CIDRTrie', () => {
  it('matches an IPv4 CIDR', () => {
    const t = new CIDRTrie();
    t.insert({ cidr: '10.0.0.0/8', provider: 'aws' });
    t.insert({ cidr: '10.1.0.0/16', provider: 'aws', region: 'us-east-1' });
    expect(t.lookup('10.1.2.3')?.region).toBe('us-east-1');
    expect(t.lookup('10.2.0.1')?.provider).toBe('aws');
    expect(t.lookup('11.0.0.1')).toBeUndefined();
  });

  it('prefers the most specific CIDR', () => {
    const t = new CIDRTrie();
    t.insert({ cidr: '192.168.0.0/16', provider: 'a' });
    t.insert({ cidr: '192.168.1.0/24', provider: 'b' });
    expect(t.lookup('192.168.1.5')?.provider).toBe('b');
    expect(t.lookup('192.168.2.5')?.provider).toBe('a');
  });

  it('matches IPv6 CIDRs', () => {
    const t = new CIDRTrie();
    t.insert({ cidr: '2606:4700::/32', provider: 'cloudflare' });
    expect(t.lookup('2606:4700:0::1')?.provider).toBe('cloudflare');
    expect(t.lookup('2607:f8b0::1')).toBeUndefined();
  });

  it('rejects malformed input', () => {
    const t = new CIDRTrie();
    t.insert({ cidr: '10.0.0.0/8', provider: 'aws' });
    expect(t.lookup('not-an-ip')).toBeUndefined();
    expect(t.lookup('999.999.999.999')).toBeUndefined();
  });
});
