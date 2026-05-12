// Basic usage of js-cloudip.
// Run with: node example/basic.mjs
import {
  getIPs,
  getProvider,
  isAws,
  isCloudProvider,
  lookup,
  providers,
  rangeCount,
  version,
} from 'js-cloudip';

console.log('data version:', await version());
console.log('range count :', await rangeCount());
console.log('providers   :', (await providers()).join(', '));
console.log();

console.log('isAws("52.94.76.1")       =>', await isAws('52.94.76.1'));
console.log('getProvider("104.16.0.1") =>', await getProvider('104.16.0.1'));
console.log('isCloudProvider("8.8.8.8")=>', await isCloudProvider('8.8.8.8'));
console.log();

const r = await lookup('52.94.76.1');
console.log('lookup("52.94.76.1") =>', r);
console.log();

const cf = await getIPs('cloudflare');
console.log(`cloudflare has ${cf.length} ranges; first 3:`);
for (const e of cf.slice(0, 3)) console.log(' -', e.ip_address);
