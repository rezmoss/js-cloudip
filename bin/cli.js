#!/usr/bin/env node
import {
  checkUpdate,
  clearCache,
  getIPs,
  getProvider,
  lookup,
  providers,
  rangeCount,
  update,
  version,
} from '../dist/index.js';

const HELP = `cloudip — cloud provider IP utilities (js-cloudip)

Usage:
  cloudip lookup <ip>                Reverse-lookup an IP address
  cloudip get <provider>[,...]       Print CIDRs for one or more providers
  cloudip provider <ip>              Print provider name for an IP
  cloudip providers                  List supported providers
  cloudip version                    Print local data version + range count
  cloudip check-update               Check if a newer upstream version exists
  cloudip update                     Force a refresh from cloudip-db
  cloudip clear-cache                Delete the local cache
  cloudip help                       Show this help

Data source: rezmoss/cloudip-db
`;

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case undefined:
    case 'help':
    case '-h':
    case '--help':
      process.stdout.write(HELP);
      return;
    case 'lookup': {
      const ip = args[0];
      if (!ip) throw new Error('usage: cloudip lookup <ip>');
      const r = await lookup(ip);
      console.log(JSON.stringify(r, null, 2));
      if (!r.found) process.exitCode = 1;
      return;
    }
    case 'provider': {
      const ip = args[0];
      if (!ip) throw new Error('usage: cloudip provider <ip>');
      const p = await getProvider(ip);
      if (!p) {
        process.exitCode = 1;
        console.log('unknown');
      } else {
        console.log(p);
      }
      return;
    }
    case 'get': {
      const arg = args[0];
      if (!arg) throw new Error('usage: cloudip get <provider>[,<provider>]');
      const want = arg.split(',').map((s) => s.trim()).filter(Boolean);
      const entries = await getIPs(want);
      for (const e of entries) console.log(e.ip_address);
      return;
    }
    case 'providers': {
      const list = await providers();
      for (const p of list) console.log(p);
      return;
    }
    case 'version': {
      const v = await version();
      const n = await rangeCount();
      console.log(`${v} (${n} ranges)`);
      return;
    }
    case 'check-update': {
      const result = await checkUpdate();
      console.log(JSON.stringify(result, null, 2));
      if (!result.hasUpdate) process.exitCode = 1;
      return;
    }
    case 'update':
      await update();
      console.log('updated');
      return;
    case 'clear-cache':
      await clearCache();
      console.log('cache cleared');
      return;
    default:
      process.stderr.write(`unknown command: ${cmd}\n${HELP}`);
      process.exit(2);
  }
}

main().catch((err) => {
  process.stderr.write(`error: ${err?.message ?? err}\n`);
  process.exit(1);
});
