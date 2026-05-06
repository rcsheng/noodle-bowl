import * as https from 'https';
import * as http from 'http';
import * as path from 'path';
import * as readline from 'readline';
import { loadEnv, readJson, dataPath, latestFile } from './utils';
import type { LedeItem, SpreadItem, SofItem, QuipPrompt, WaveItem } from '../constants/data';

loadEnv();

interface ContentBanks {
  lede: LedeItem[];
  spread: SpreadItem[];
  sof: SofItem[];
  quip: QuipPrompt[];
  wave: WaveItem[];
}

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
  throw new Error(`Unsupported Firestore type: ${typeof val}`);
}

async function getIdToken(isProd: boolean): Promise<string> {
  if (!isProd) return 'owner';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleAuth } = require('google-auth-library') as { GoogleAuth: new (opts: unknown) => { getClient: () => Promise<{ getAccessToken: () => Promise<{ token: string }> }> } };
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const tokenResult = await client.getAccessToken();
  return tokenResult.token;
}

async function firestorePatch(
  token: string,
  projectId: string,
  isProd: boolean,
  docPath: string,
  data: Record<string, unknown>
): Promise<void> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);

  const body = JSON.stringify({ fields });
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;

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
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Firestore HTTP ${res.statusCode}: ${responseData.slice(0, 300)}`));
        }
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
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

async function main() {
  const emulator = process.argv.includes('--emulator');
  const isProd = !emulator;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'noodle-bowl';

  const filePath = latestFile(dataPath('generated'), 'Run pipeline:generate first.');
  const banks = readJson<ContentBanks>(filePath);

  console.log(`\nReady to publish:`);
  console.log(`  lede: ${banks.lede.length}  spread: ${banks.spread.length}  sof: ${banks.sof.length}  quip: ${banks.quip.length}  wave: ${banks.wave.length}`);
  console.log(`  Source: ${path.basename(filePath)}`);
  console.log(`  Target: ${isProd ? `PRODUCTION (project: ${projectId})` : 'LOCAL EMULATOR'}`);

  const ok = await confirm('\nPublish? [y/N] ');
  if (!ok) {
    console.log('Cancelled.');
    return;
  }

  const token = await getIdToken(isProd);
  const docId = `v${Date.now()}`;
  const doc: Record<string, unknown> = {
    id: docId,
    active: true,
    createdAt: new Date().toISOString(),
    banks,
  };

  await firestorePatch(token, projectId, isProd, `contentVersions/${docId}`, doc);
  console.log(`\n✓ Published ContentVersion '${docId}'`);
  console.log(`  Set active: true — deactivate the previous version in the Firebase console if needed.`);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
