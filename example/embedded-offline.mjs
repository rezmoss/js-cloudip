// Air-gapped / offline usage — never touches the network.
// Uses the cloudip.msgpack.gz bundled inside the npm package.
// Run with: node example/embedded-offline.mjs
import { lookup, getIPs, version } from 'js-cloudip/embedded';

console.log('embedded data version:', await version());
console.log('52.94.76.1 →', await lookup('52.94.76.1'));
console.log('first 3 AWS CIDRs:');
for (const e of (await getIPs('aws')).slice(0, 3)) console.log(' -', e.ip_address);
