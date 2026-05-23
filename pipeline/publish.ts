import * as https from 'https';
import * as http from 'http';
import * as path from 'path';
import * as readline from 'readline';
import { loadEnv, readJson, dataPath, latestFile } from './utils';
import { writeContentPack, writePipelineRun } from './db';
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

function fromFirestoreValue(val: FirestoreValue): unknown {
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) return (val.arrayValue.values ?? []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields)) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

/** Compute the ISO 8601 week ID (e.g. "2026-W20") for a YYYY-MM-DD date string. */
function getISOWeekId(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  // Adjust to nearest Thursday to determine ISO year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
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

/** Fetch a single Firestore document. Returns null if not found (404). */
async function firestoreGet(
  token: string,
  projectId: string,
  isProd: boolean,
  docPath: string,
): Promise<Record<string, unknown> | null> {
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const options = {
      hostname: isProd ? 'firestore.googleapis.com' : 'localhost',
      port: isProd ? 443 : 8080,
      path: urlPath,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    };
    const transport = isProd ? https : http;
    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 404) { resolve(null); return; }
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const doc = JSON.parse(data) as { fields?: Record<string, FirestoreValue> };
            if (!doc.fields) { resolve(null); return; }
            const result: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(doc.fields)) {
              result[k] = fromFirestoreValue(v);
            }
            resolve(result);
          } catch (e) {
            reject(new Error(`firestoreGet parse error: ${String(e)}`));
          }
        } else {
          reject(new Error(`Firestore GET HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function firestorePatch(
  token: string,
  projectId: string,
  isProd: boolean,
  docPath: string,
  data: Record<string, unknown>,
  fieldMask?: string[]
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
  const autoYes = process.argv.includes('--yes');
  const isProd = !emulator;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'noodle-bowl';

  const filePath = latestFile(dataPath('generated'), 'Run pipeline:generate first.');
  const date = path.basename(filePath, '.json'); // YYYY-MM-DD
  const banks = readJson<ContentBanks>(filePath);
  const weekId = getISOWeekId(date);

  console.log(`\nReady to publish:`);
  console.log(`  Date: ${date}  →  Week: ${weekId}`);
  console.log(`  lede: ${banks.lede.length}  spread: ${banks.spread.length}  sof: ${banks.sof.length}`);
  console.log(`  Source: ${path.basename(filePath)}`);
  console.log(`  Target: ${isProd ? `PRODUCTION (project: ${projectId})` : 'LOCAL EMULATOR'}`);

  const ok = autoYes || (await confirm('\nPublish? [y/N] '));
  if (!ok) {
    console.log('Cancelled.');
    return;
  }

  const token = await getIdToken(isProd);

  // Fetch existing week doc (may be null if this is the first day of the week)
  const existingDoc = await firestoreGet(token, projectId, isProd, `contentVersions/${weekId}`);
  const existingPublishedDates: string[] = (existingDoc?.publishedDates as string[] | undefined) ?? [];

  // Idempotency: skip if this date is already recorded
  if (existingPublishedDates.includes(date)) {
    console.log(`\n⚠ Date ${date} already published to ${weekId}. Skipping (idempotent).`);
    return;
  }

  // Merge banks: accumulate new items into whatever is already in the week doc,
  // deduplicating by a stable content key so re-runs never produce duplicate questions.
  const existingBanks: ContentBanks = existingDoc
    ? (existingDoc.banks as ContentBanks)
    : { lede: [], spread: [], sof: [], quip: [], wave: [] };

  function dedupBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>();
    return arr.filter(item => {
      const k = keyFn(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  const mergedBanks: ContentBanks = {
    lede:   dedupBy([...existingBanks.lede,   ...banks.lede],   x => x.partialHeadline),
    spread: dedupBy([...existingBanks.spread, ...banks.spread], x => x.question),
    sof:    dedupBy([...existingBanks.sof,    ...banks.sof],    x => x.topic),
    quip:   dedupBy([...existingBanks.quip,   ...banks.quip],   x => x.setup),
    wave:   dedupBy([...existingBanks.wave,   ...banks.wave],   x => x.story),
  };

  const publishedDates = [...existingPublishedDates, date];
  const now = new Date().toISOString();

  // Write merged ContentVersion doc — ID is the weekId
  const weekDoc: Record<string, unknown> = {
    contentWeek: weekId,
    publishedDates,
    createdAt: (existingDoc?.createdAt as string | undefined) ?? now,
    updatedAt: now,
    banks: mergedBanks,
  };

  await firestorePatch(token, projectId, isProd, `contentVersions/${weekId}`, weekDoc);
  console.log(
    `\n✓ Published ContentVersion '${weekId}' ` +
    `(${publishedDates.length} day(s): ${publishedDates.join(', ')})`
  );
  console.log(
    `  Week totals — lede: ${mergedBanks.lede.length}  spread: ${mergedBanks.spread.length}  sof: ${mergedBanks.sof.length}`
  );

  // Write contentPacks/{date} — per-day historical record
  const packDoc: Record<string, unknown> = {
    date,
    weekId,
    publishedAt: now,
    ledeCount: banks.lede.length,
    spreadCount: banks.spread.length,
    sofCount: banks.sof.length,
    banks,
  };
  await firestorePatch(token, projectId, isProd, `contentPacks/${date}`, packDoc);
  console.log(`✓ Published ContentPack '${date}'`);

  // Write to local SQLite history
  writeContentPack({
    date,
    weekId,
    publishedAt: now,
    ledeCount: banks.lede.length,
    spreadCount: banks.spread.length,
    sofCount: banks.sof.length,
    ledeJson: JSON.stringify(banks.lede),
    spreadJson: JSON.stringify(banks.spread),
    sofJson: JSON.stringify(banks.sof),
  });
  writePipelineRun(
    date,
    'publish',
    'ok',
    `lede:${banks.lede.length} spread:${banks.spread.length} sof:${banks.sof.length} → ${weekId}`,
  );
  console.log(`✓ Saved to local history (pipeline/data/history.db)`);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
