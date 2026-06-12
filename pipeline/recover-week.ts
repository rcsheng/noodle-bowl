// Reconstructs contentVersions/{weekId} by re-merging its contentPacks from Firestore.
// Use when banks are empty or corrupted and local history.db is unavailable.
//
// Usage:         npm run pipeline:recover:week -- --week=2026-W24 [--yes]
// Manual dates:  npm run pipeline:recover:week -- --week=2026-W24 --dates=2026-06-08,2026-06-09 [--yes]

import * as https from 'https';
import * as readline from 'readline';
import { loadEnv } from './utils';
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
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

function fromFirestoreValue(val: FirestoreValue): unknown {
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) return (val.arrayValue.values ?? []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields)) obj[k] = fromFirestoreValue(v);
    return obj;
  }
  return null;
}

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

async function getIdToken(): Promise<string> {
  const { GoogleAuth } = require('google-auth-library') as {
    GoogleAuth: new (opts: unknown) => {
      getClient: () => Promise<{ getAccessToken: () => Promise<{ token: string }> }>;
    };
  };
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  return (await client.getAccessToken()).token;
}

async function firestoreGet(
  token: string,
  projectId: string,
  docPath: string,
): Promise<Record<string, unknown> | null> {
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: 'firestore.googleapis.com', path: urlPath, method: 'GET',
        headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode === 404) { resolve(null); return; }
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const doc = JSON.parse(data) as { fields?: Record<string, FirestoreValue> };
              if (!doc.fields) { resolve(null); return; }
              const result: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(doc.fields)) result[k] = fromFirestoreValue(v);
              resolve(result);
            } catch (e) {
              reject(new Error(`firestoreGet parse error: ${String(e)}`));
            }
          } else {
            reject(new Error(`Firestore GET ${res.statusCode}: ${data.slice(0, 300)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function firestorePatch(
  token: string,
  projectId: string,
  docPath: string,
  data: Record<string, unknown>,
): Promise<void> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);
  const body = JSON.stringify({ fields });
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: 'firestore.googleapis.com', path: urlPath, method: 'PATCH',
        headers: { 'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Bearer ${token}` } },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`Firestore PATCH ${res.statusCode}: ${buf.slice(0, 300)}`));
        });
      },
    );
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
  const autoYes = process.argv.includes('--yes');
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'noodle-bowl';

  const weekArg = process.argv.find((a) => a.startsWith('--week='));
  if (!weekArg) {
    console.error('Usage: npm run pipeline:recover:week -- --week=2026-W24 [--yes]');
    console.error('       npm run pipeline:recover:week -- --week=2026-W24 --dates=2026-06-08,2026-06-09 [--yes]');
    process.exit(1);
  }
  const weekId = weekArg.split('=')[1];
  const datesArg = process.argv.find((a) => a.startsWith('--dates='));

  console.log(`\nRecovering contentVersions/${weekId} from Firestore contentPacks...`);

  const token = await getIdToken();

  let publishedDates: string[];
  if (datesArg) {
    publishedDates = datesArg.split('=')[1].split(',').map((d) => d.trim());
    console.log(`Using provided dates: ${publishedDates.join(', ')}`);
  } else {
    const weekDoc = await firestoreGet(token, projectId, `contentVersions/${weekId}`);
    if (!weekDoc) {
      console.error(`contentVersions/${weekId} not found. Use --dates= to specify dates manually.`);
      process.exit(1);
    }
    publishedDates = (weekDoc.publishedDates as string[] | undefined) ?? [];
    if (!publishedDates.length) {
      console.error(`contentVersions/${weekId} has no publishedDates. Use --dates= to specify manually.`);
      process.exit(1);
    }
    console.log(`Found publishedDates: ${publishedDates.join(', ')}`);
  }

  // Fetch each contentPack and merge banks
  const seenLede = new Set<string>();
  const seenSpread = new Set<string>();
  const seenSof = new Set<string>();
  const merged: ContentBanks = { lede: [], spread: [], sof: [], quip: [], wave: [] };

  for (const date of publishedDates.sort()) {
    const pack = await firestoreGet(token, projectId, `contentPacks/${date}`);
    if (!pack) {
      console.warn(`  [skip] contentPacks/${date} — not found in Firestore`);
      continue;
    }
    const banks = pack.banks as ContentBanks | undefined;
    if (!banks) {
      console.warn(`  [skip] contentPacks/${date} — no banks field`);
      continue;
    }
    const { lede = [], spread = [], sof = [] } = banks;
    if (!lede.length && !spread.length && !sof.length) {
      console.warn(`  [skip] contentPacks/${date} — banks are empty`);
      continue;
    }

    let addedLede = 0, addedSpread = 0, addedSof = 0;
    lede.forEach((item) => { if (!seenLede.has(item.partialHeadline)) { seenLede.add(item.partialHeadline); merged.lede.push(item); addedLede++; } });
    spread.forEach((item) => { if (!seenSpread.has(item.question)) { seenSpread.add(item.question); merged.spread.push(item); addedSpread++; } });
    sof.forEach((item) => { if (!seenSof.has(item.topic)) { seenSof.add(item.topic); merged.sof.push(item); addedSof++; } });

    console.log(`  + ${date}: lede=${addedLede} spread=${addedSpread} sof=${addedSof}`);
  }

  console.log(`\nMerged totals — lede: ${merged.lede.length}  spread: ${merged.spread.length}  sof: ${merged.sof.length}`);

  if (!merged.lede.length && !merged.spread.length && !merged.sof.length) {
    console.error('\nAll contentPacks have empty banks — nothing to recover.');
    process.exit(1);
  }

  const ok = autoYes || (await confirm(`\nRewrite contentVersions/${weekId}? [y/N] `));
  if (!ok) { console.log('Cancelled.'); return; }

  const existingDoc = await firestoreGet(token, projectId, `contentVersions/${weekId}`);
  const now = new Date().toISOString();

  await firestorePatch(token, projectId, `contentVersions/${weekId}`, {
    contentWeek: weekId,
    publishedDates,
    createdAt: (existingDoc?.createdAt as string | undefined) ?? now,
    updatedAt: now,
    banks: merged,
  });

  console.log(`\n✓ Restored contentVersions/${weekId}`);
  console.log(`  lede: ${merged.lede.length}  spread: ${merged.spread.length}  sof: ${merged.sof.length}`);
}

main().catch((err: Error) => { console.error(err.message); process.exit(1); });
