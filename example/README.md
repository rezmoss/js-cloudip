# js-cloudip examples

| File | What it shows |
| --- | --- |
| `basic.mjs` | Package-level functions: `lookup`, `getProvider`, `isAws`, `isCloudProvider`, `getIPs`. |
| `custom-detector.mjs` | A configured `Detector` with `dataDir` + `autoUpdateMs`, plus `checkUpdate`. |
| `embedded-offline.mjs` | `js-cloudip/embedded` — never hits the network. |
| `express-middleware.mjs` | Tag incoming HTTP requests with the cloud provider owning the source IP. |

Run any of them after installing the package:

```bash
node example/basic.mjs
node example/custom-detector.mjs
node example/embedded-offline.mjs
```
