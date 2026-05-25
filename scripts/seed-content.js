#!/usr/bin/env node
/**
 * Seeds a ContentVersion document into Firestore.
 * Uses the REST API with `Authorization: Bearer owner` to bypass security rules
 * in the emulator, or a service account key for production.
 *
 * Usage:
 *   node scripts/seed-content.js            # emulator (default)
 *   SEED_TARGET=prod node scripts/seed-content.js
 *
 * For prod, set GOOGLE_APPLICATION_CREDENTIALS to your service account key path
 * and FIREBASE_PROJECT_ID to your project ID.
 */

const https = require('https');
const http = require('http');

// ---- Load data constants via require (Node-compatible) ----
// We read the compiled output. Run `npx tsc --outDir /tmp/seed-build constants/data.ts`
// or just inline the data here for a one-off seed.
// For simplicity, we read the TypeScript file via ts-node if available,
// otherwise fall back to a pre-bundled JSON snapshot.

const path = require('path');
const fs = require('fs');

const IS_PROD = process.env.SEED_TARGET === 'prod';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'noodle-bowl';
const EMULATOR_HOST = 'localhost';
const EMULATOR_PORT = 8080;

async function getIdToken() {
  if (!IS_PROD) return 'owner'; // emulator bypass
  // For prod, use google-auth-library
  const { GoogleAuth } = require('google-auth-library');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function loadBanks() {
  // Try ts-node first
  try {
    require('ts-node').register({ transpileOnly: true });
    const data = require('../constants/data.ts');
    return {
      lede: data.LEDE_BANK,
      spread: data.SPREAD_BANK,
      sof: data.SOF_BANK,
      quip: data.QUIP_PROMPTS,
      wave: data.WAVE_BANK,
    };
  } catch {
    // Fallback: look for pre-built snapshot
    const snapshotPath = path.join(__dirname, 'seed-content-snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      return JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    }
    throw new Error(
      'Could not load bank data. Install ts-node (`npm i -D ts-node`) or provide scripts/seed-content-snapshot.json'
    );
  }
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported type: ${typeof val}`);
}

async function upsertDocument(token, docId, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);

  const body = JSON.stringify({ fields });
  const basePath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/contentVersions/${docId}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: IS_PROD ? 'firestore.googleapis.com' : EMULATOR_HOST,
      port: IS_PROD ? 443 : EMULATOR_PORT,
      path: basePath,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${token}`,
      },
    };

    const req = (IS_PROD ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Returns the ISO week string for the *previous* complete week (Mon–Sun UTC).
 * Mirrors computeActiveWeek() in lib/contentWeek.ts — the doc ID the app looks up. */
function computeActiveWeek() {
  const now = new Date();
  const prevWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
  // Shift to Thursday of that week (ISO pivot day)
  const d = new Date(prevWeek);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function main() {
  console.log(`Seeding content to ${IS_PROD ? 'PRODUCTION' : 'emulator'} (project: ${PROJECT_ID})`);

  const banks = await loadBanks();
  const token = await getIdToken();

  // Doc ID must match the ISO week the app will look up via findForWeek().
  // The app always serves the *previous* complete week's content.
  const docId = computeActiveWeek(); // e.g. "2026-W21"
  const doc = {
    id: docId,
    contentWeek: docId,   // required by ContentVersion schema
    createdAt: new Date().toISOString(),
    banks,
  };

  await upsertDocument(token, docId, doc);
  console.log(`✓ ContentVersion '${docId}' written with:`);
  console.log(`  lede: ${banks.lede.length} items`);
  console.log(`  spread: ${banks.spread.length} items`);
  console.log(`  sof: ${banks.sof.length} items`);
  console.log(`  quip: ${banks.quip.length} items`);
  console.log(`  wave: ${banks.wave.length} items`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
