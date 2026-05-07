#!/usr/bin/env node
/**
 * Open a challenge or help deep link on the Android emulator via adb.
 *
 * Usage (via npm):
 *   npm run link:challenge -- 76HA597T
 *   npm run link:help     -- 9D4U28H4
 *
 * Direct usage:
 *   node scripts/open-deep-link.js challenge 76HA597T
 *   node scripts/open-deep-link.js help      9D4U28H4
 */

const { execSync } = require('child_process');
const os = require('os');

const [type, token] = process.argv.slice(2);

if (!type || !token) {
  console.error('Usage: node scripts/open-deep-link.js <challenge|help> <TOKEN>');
  process.exit(1);
}

if (!['challenge', 'help'].includes(type)) {
  console.error(`Unknown type "${type}". Must be "challenge" or "help".`);
  process.exit(1);
}

function detectHostIp() {
  const ifaces = os.networkInterfaces();
  for (const iface of Object.values(ifaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === 'IPv4' && !addr.internal && !addr.address.startsWith('169.')) {
        return addr.address;
      }
    }
  }
  return null;
}

const host = detectHostIp();
if (!host) {
  console.error('Could not detect host IP address.');
  process.exit(1);
}

const url = `exp://${host}:8081/--/games/${type}/${token}`;
console.log(`\n  ${type.padEnd(10)} ${token}`);
console.log(`  ${url}\n`);

execSync(`adb shell am start -a android.intent.action.VIEW -d "${url}" host.exp.exponent`, {
  stdio: 'inherit',
});
