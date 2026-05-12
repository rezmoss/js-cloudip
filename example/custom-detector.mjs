// Custom Detector with auto-update + a dedicated cache directory.
// Run with: node example/custom-detector.mjs
import { newDetector } from 'js-cloudip';

const detector = await newDetector({
  dataDir: './cache',
  autoUpdateMs: 24 * 60 * 60 * 1000,
});

console.log('version:', detector.version());
console.log('ranges :', detector.rangeCount());

console.log('52.94.76.1 →', detector.lookup('52.94.76.1'));
console.log('isCloudflare(104.16.0.1) →', detector.isCloudflare('104.16.0.1'));

const { hasUpdate, info } = await detector.checkUpdate();
console.log(`upstream version: ${info?.version} (hasUpdate=${hasUpdate})`);

detector.close();
