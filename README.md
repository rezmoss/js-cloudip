# js-cloudip

[![npm version](https://img.shields.io/npm/v/js-cloudip.svg)](https://www.npmjs.com/package/js-cloudip)
[![npm downloads](https://img.shields.io/npm/dm/js-cloudip.svg)](https://www.npmjs.com/package/js-cloudip)
[![bundle size](https://img.shields.io/bundlephobia/minzip/js-cloudip)](https://bundlephobia.com/package/js-cloudip)
[![CI](https://github.com/rezmoss/js-cloudip/actions/workflows/ci.yml/badge.svg)](https://github.com/rezmoss/js-cloudip/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![types](https://img.shields.io/npm/types/js-cloudip)](https://www.npmjs.com/package/js-cloudip)

Fast cloud-provider IP detection for Node.js and the browser — the JavaScript port of [go-cloudip](https://github.com/rezmoss/go-cloudip).

Determine if an IP belongs to **AWS, GCP, Azure, Cloudflare, DigitalOcean, or Oracle Cloud**, with sub-millisecond lookups using a binary CIDR trie. Plus a forward-lookup mode JS apps actually want: *"give me every Cloudflare CIDR."*

Data comes from [cloudip-db](https://github.com/rezmoss/cloudip-db) (MessagePack, ~743 KB gzipped, SHA-256 verified).

## Install

```bash
npm install js-cloudip
```

## Quick start

```ts
import {
  lookup,
  getProvider,
  isAws,
  isCloudProvider,
  getIPs,
} from 'js-cloudip';

await isAws('52.94.76.1');             // true
await getProvider('34.64.0.1');        // "gcp"
await isCloudProvider('104.16.0.1');   // true

const r = await lookup('52.94.76.1');
// { found: true, provider: 'aws', region: 'us-east-1', service: 'EC2', cidr: '52.94.0.0/16', ip_type: 'ipv4' }

const cf = await getIPs('cloudflare');
// [{ ip_address: '104.16.0.0/13', ip_type: 'ipv4', provider: 'cloudflare' }, ...]
```

First call fetches the database from `cloudip-db`, verifies its SHA-256, and caches it in `~/.cache/js-cloudip/`. Subsequent calls reuse the in-memory copy.

## How data loads

The default `Detector` tries each source in order:

1. **Network** — fetches `cloudip.msgpack.gz` + `version.json` from `cloudip-db` and verifies SHA-256.
2. **Cache** — uses `~/.cache/js-cloudip/cloudip.msgpack.gz` if network is unavailable.
3. **Embedded** — falls back to the copy of `data/cloudip.msgpack.gz` shipped inside the package (air-gapped / browser-bundle friendly).

Use `offline: true` to skip step 1 entirely.

## Custom Detector

```ts
import { newDetector } from 'js-cloudip';

const detector = await newDetector({
  dataDir: './cache',          // null disables fs cache
  autoUpdateMs: 24 * 60 * 60 * 1000,
  offline: false,
  fetch: globalThis.fetch,
});

detector.lookup('52.94.76.1');
detector.isAws('52.94.76.1');
detector.getIPs('cloudflare');

await detector.update();
const { hasUpdate, info } = await detector.checkUpdate();

detector.close(); // stop the auto-update timer
```

### Options

| Option         | Default                | Notes                                                |
| -------------- | ---------------------- | ---------------------------------------------------- |
| `dataDir`      | `~/.cache/js-cloudip`  | `null` disables the filesystem cache                 |
| `autoUpdateMs` | `0`                    | Minimum effective interval is 1 hour                 |
| `offline`      | `false`                | Skip network; use cache → embedded only              |
| `fetch`        | `globalThis.fetch`     | Custom fetch (e.g., undici with a proxy)             |
| `dataURL`      | cloudip-db raw URL     | Override for a mirror                                |
| `versionURL`   | cloudip-db raw URL     | Override for a mirror                                |
| `verifySha256` | `true`                 | Disable only if you trust the transport              |
| `ttlMs`        | `24 * 60 * 60 * 1000`  | Cache freshness window before forcing a re-fetch     |

## Embedded entry point

```ts
import { lookup, getIPs } from 'js-cloudip/embedded';

await lookup('52.94.76.1'); // never touches the network
```

The `/embedded` subpath pre-configures `offline: true`, no fs cache. It loads the bundled `data/cloudip.msgpack.gz` shipped with the package. Good for tests, build pipelines, and air-gapped environments.

## CLI

```bash
npx cloudip lookup 52.94.76.1
npx cloudip get cloudflare
npx cloudip provider 34.64.0.1
npx cloudip providers
npx cloudip check-update
npx cloudip update
```

## Browser

The default entry uses `fetch` against `raw.githubusercontent.com`, which sets `Access-Control-Allow-Origin: *` — no proxy needed. The filesystem cache is a no-op in browsers; the in-memory cache still applies.

```ts
import { lookup } from 'js-cloudip';
const r = await lookup('1.1.1.1');
```

## API parity with go-cloudip

| Package-level (uses lazy default detector) | Detector instance method |
| ------------------------------------------ | ------------------------ |
| `lookup(ip)`                               | `detector.lookup(ip)`    |
| `getProvider(ip)`                          | `detector.getProvider(ip)` |
| `isCloudProvider(ip)`                      | `detector.isCloudProvider(ip)` |
| `isAws / isGcp / isAzure / isCloudflare / isDigitalOcean / isOracle` | same on `detector` |
| `getIPs(provider \| provider[])`           | `detector.getIPs(...)`   |
| `version()`                                | `detector.version()`     |
| `rangeCount()`                             | `detector.rangeCount()`  |
| `providers()`                              | `detector.providers()`   |
| `update()`                                 | `detector.update()`      |
| `checkUpdate()`                            | `detector.checkUpdate()` |
| `clearCache()`                             | `detector.clearCache()`  |
| `remoteVersion()`                          | —                        |

## Data source

IP ranges come from [rezmoss/cloudip-db](https://github.com/rezmoss/cloudip-db), which compiles official cloud-provider feeds into a MessagePack database. SHA-256 of the uncompressed payload is published in `version.json` and verified on every fetch.

## License

MIT — see [LICENSE](LICENSE).
