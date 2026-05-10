// Republishes a specific date's content from local SQLite history to Firestore.
// Usage: npm run pipeline:recover -- --date=YYYY-MM-DD [--emulator] [--yes]
import * as readline from 'readline';
import { loadEnv } from './utils';
import { getContentPack, writePipelineRun } from './db';

loadEnv();

// Inlined minimal Firestore helpers (same pattern as publish.ts)
import * as https from 'https';
import * as http from 'http';

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

function toFirestoreValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported type: ${typeof val}`);
}

async function getIdToken(isProd: boolean): Promise<string> {
  if (!isProd) return 'owner';
  const { GoogleAuth } = require('google-auth-library') as { GoogleAuth: new (opts: unknown) => { getClient: () => Promise<{ getAccessToken: () => Promise<{ token: string }> }> } };
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  return (await client.getAccessToken()).token;
}

async function firestorePatch(
  token: string,
  projectId: string,
  isProd: boolean,
  docPath: string,
  data: Record<string, unknown>,
  fieldMask?: string[],
): Promise<void> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);
  const body = JSON.stringify({ fields });
  const maskQuery = fieldMask
    ? `?${fieldMask.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&')}`
    : '';
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}${maskQuery}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: isProd ? 'firestore.googleapis.com' : 'localhost',
      port: isProd ? 443 : 8080,
      path: urlPath,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${token}`,
      },
    };
    const transport = isProd ? https : http;
    const req = transport.request(options, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`Firestore HTTP ${res.statusCode}: ${buf.slice(0, 300)}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim().toLowerCase() === 'y'); });
  });
}

async function main() {
  const emulator = process.argv.includes('--emulator');
  const autoYes = process.argv.includes('--yes');
  const isProd = !emulator;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'noodle-bowl';

  const dateArg = process.argv.find((a) => a.startsWith('--date='));
  if (!dateArg) {
    console.error('Usage: npm run pipeline:recover -- --date=YYYY-MM-DD [--emulator] [--yes]');
    process.exit(1);
  }
  const date = dateArg.split('=')[1];

  const pack = getContentPack(date);
  if (!pack) {
    console.error(`No local history found for date ${date}. Check pipeline/data/history.db.`);
    process.exit(1);
  }

  console.log(`\nReady to recover:`);
  console.log(`  Date:   ${date}`);
  console.log(`  Stored: lede=${pack.ledeCount} spread=${pack.spreadCount} sof=${pack.sofCount}`);
  console.log(`  Target: ${isProd ? `PRODUCTION (project: ${projectId})` : 'LOCAL EMULATOR'}`);

  const ok = autoYes || (await confirm('\nRepublish? [y/N] '));
  if (!ok) { console.log('Cancelled.'); return; }

  const token = await getIdToken(isProd);
  const docId = `v${Date.now()}`;
  const publishedAt = new Date().toISOString();

  const banks = {
    lede: JSON.parse(pack.ledeJson),
    spread: JSON.parse(pack.spreadJson),
    sof: JSON.parse(pack.sofJson),
    quip: [],
    wave: [],
  };

  // Write new contentVersions doc
  await firestorePatch(token, projectId, isProd, `contentVersions/${docId}`, {
    id: docId, active: true, createdAt: publishedAt, banks,
  });
  console.log(`\n✓ Published ContentVersion '${docId}' (active: true)`);

  // Overwrite contentPacks/{date}
  await firestorePatch(token, projectId, isProd, `contentPacks/${date}`, {
    date, versionId: docId, publishedAt,
    ledeCount: pack.ledeCount, spreadCount: pack.spreadCount, sofCount: pack.sofCount,
    banks,
  });
  console.log(`✓ Restored ContentPack '${date}'`);

  writePipelineRun(date, 'recover', 'ok', `recovered from local history → ${docId}`);
  console.log(`✓ Done`);
}

main().catch((err: Error) => { console.error(err.message); process.exit(1); });
