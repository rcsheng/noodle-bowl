/**
 * One-time cleanup: removes duplicate spread questions about the same story
 * from both Firestore contentVersions docs and the local SQLite history.
 *
 * Strategy: within each week, keep only the FIRST spread item whose question
 * matches a given topic fingerprint (distinctive keywords); drop the rest.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=C:/Users/rcshe/.firebase/noodle-bowl-sa.json \
 *   npx ts-node pipeline/fix-spread-dupes.ts [--dry-run] [--emulator]
 *
 * --dry-run   Print what would be removed without writing anything.
 * --emulator  Target the local Firestore emulator instead of production.
 */

import * as https from 'https';
import * as http from 'http';
import Database from 'better-sqlite3';
import * as path from 'path';
import { loadEnv } from './utils';

loadEnv();

// ---------------------------------------------------------------------------
// Config — add more entries here for other recurring duplicate topics
// ---------------------------------------------------------------------------
const DUPLICATE_TOPIC_FILTERS: Array<{ label: string; keywords: string[] }> = [
  {
    label: 'coyote-alcatraz',
    // All keywords must appear (case-insensitive) in the question for it to match
    keywords: ['coyote', 'alcatraz'],
  },
];

// Weeks to check. The script fetches these and deduplicates within each.
// May 10 → 2026-W19, May 11–16 → 2026-W20
const WEEKS_TO_FIX = ['2026-W19', '2026-W20'];

// Dates whose SQLite spread_json rows should have the duplicate item removed.
// Keep the FIRST date per topic per week; remove from the rest.
// W19: May 10 is canonical → nothing to remove from SQLite for W19
// W20: May 11 is canonical → remove from May 12, 13, 14
const SQLITE_DATES_TO_CLEAN = ['2026-05-12', '2026-05-13', '2026-05-14'];

const DB_PATH = path.join(__dirname, 'data', 'history.db');

// ---------------------------------------------------------------------------
// Firestore REST helpers (same pattern as publish.ts / clear-user-seen.ts)
// ---------------------------------------------------------------------------
type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

function toFV(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFV) } };
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) fields[k] = toFV(v);
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported type: ${typeof val}`);
}

function fromFV(val: FirestoreValue): unknown {
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) return (val.arrayValue.values ?? []).map(fromFV);
  if ('mapValue' in val) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields)) obj[k] = fromFV(v);
    return obj;
  }
  return null;
}

async function getToken(isProd: boolean): Promise<string> {
  if (!isProd) return 'owner';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleAuth } = require('google-auth-library') as {
    GoogleAuth: new (o: unknown) => { getClient: () => Promise<{ getAccessToken: () => Promise<{ token: string }> }> };
  };
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  return (await client.getAccessToken()).token;
}

async function fsGet(token: string, projectId: string, isProd: boolean, docPath: string): Promise<Record<string, unknown> | null> {
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const transport = isProd ? https : http;
    const req = transport.request(
      { hostname: isProd ? 'firestore.googleapis.com' : 'localhost', port: isProd ? 443 : 8080,
        path: urlPath, method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode === 404) { resolve(null); return; }
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const doc = JSON.parse(data) as { fields?: Record<string, FirestoreValue> };
            if (!doc.fields) { resolve(null); return; }
            const result: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(doc.fields)) result[k] = fromFV(v);
            resolve(result);
          } else {
            reject(new Error(`GET ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function fsPatch(token: string, projectId: string, isProd: boolean, docPath: string, data: Record<string, unknown>): Promise<void> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFV(v);
  const body = JSON.stringify({ fields });
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const transport = isProd ? https : http;
    const req = transport.request(
      { hostname: isProd ? 'firestore.googleapis.com' : 'localhost', port: isProd ? 443 : 8080,
        path: urlPath, method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Authorization: `Bearer ${token}` } },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`PATCH ${res.statusCode}: ${d.slice(0, 200)}`));
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface SpreadItem { question: string; [k: string]: unknown }

function matchesTopic(item: SpreadItem, keywords: string[]): boolean {
  const q = item.question.toLowerCase();
  return keywords.every(kw => q.includes(kw.toLowerCase()));
}

function deduplicateSpread(spread: SpreadItem[], filters: typeof DUPLICATE_TOPIC_FILTERS): {
  cleaned: SpreadItem[];
  removedCount: number;
  removedItems: SpreadItem[];
} {
  const seenTopics = new Set<string>();
  const removedItems: SpreadItem[] = [];
  const cleaned = spread.filter(item => {
    for (const { label, keywords } of filters) {
      if (matchesTopic(item, keywords)) {
        if (seenTopics.has(label)) {
          removedItems.push(item);
          return false; // duplicate — drop
        }
        seenTopics.add(label); // first occurrence — keep
        return true;
      }
    }
    return true; // no topic match — keep
  });
  return { cleaned, removedCount: removedItems.length, removedItems };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const emulator = process.argv.includes('--emulator');
  const isProd = !emulator;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'noodle-bowl';

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}fix-spread-dupes`);
  console.log(`Target: ${isProd ? `PRODUCTION (${projectId})` : 'LOCAL EMULATOR'}`);
  console.log(`Filters: ${DUPLICATE_TOPIC_FILTERS.map(f => f.label).join(', ')}\n`);

  const token = await getToken(isProd);
  let totalFirestoreRemoved = 0;
  let totalSqliteRemoved = 0;

  // ── 1. Firestore cleanup ────────────────────────────────────────────────────
  for (const weekId of WEEKS_TO_FIX) {
    console.log(`── Firestore: contentVersions/${weekId}`);
    const doc = await fsGet(token, projectId, isProd, `contentVersions/${weekId}`);
    if (!doc) {
      console.log(`   Not found — skipping.\n`);
      continue;
    }

    const banks = doc.banks as { spread?: SpreadItem[]; [k: string]: unknown } | undefined;
    const spread = banks?.spread ?? [];
    console.log(`   Current spread count: ${spread.length}`);

    const { cleaned, removedCount, removedItems } = deduplicateSpread(spread, DUPLICATE_TOPIC_FILTERS);

    if (removedCount === 0) {
      console.log(`   No duplicates found.\n`);
      continue;
    }

    console.log(`   Duplicates to remove (${removedCount}):`);
    removedItems.forEach(item => console.log(`     - "${item.question}"`));
    console.log(`   Spread after cleanup: ${cleaned.length}`);

    if (!dryRun) {
      const updated: Record<string, unknown> = {
        ...doc,
        banks: { ...(doc.banks as object), spread: cleaned },
        updatedAt: new Date().toISOString(),
      };
      await fsPatch(token, projectId, isProd, `contentVersions/${weekId}`, updated);
      console.log(`   ✓ Patched ${weekId} in Firestore.`);
    } else {
      console.log(`   [dry-run] Would patch ${weekId}.`);
    }

    totalFirestoreRemoved += removedCount;
    console.log();
  }

  // ── 2. SQLite cleanup ───────────────────────────────────────────────────────
  // Each SQLite row stores the per-day content pack. For the "extra" days
  // (dates where the duplicate was published, not the canonical first occurrence),
  // we remove the topic item entirely — there's no "first/second" to keep,
  // it simply shouldn't be in that day's record at all.
  console.log(`── SQLite: ${DB_PATH}`);
  const db = new Database(DB_PATH);

  for (const date of SQLITE_DATES_TO_CLEAN) {
    const row = db.prepare(
      'SELECT spread_json, spread_count FROM content_packs WHERE date = ?'
    ).get(date) as { spread_json: string; spread_count: number } | undefined;

    if (!row) {
      console.log(`   ${date}: not in SQLite — skipping.`);
      continue;
    }

    const spread: SpreadItem[] = JSON.parse(row.spread_json);
    const removed: SpreadItem[] = [];
    const cleaned = spread.filter(item => {
      for (const { keywords } of DUPLICATE_TOPIC_FILTERS) {
        if (matchesTopic(item, keywords)) {
          removed.push(item);
          return false;
        }
      }
      return true;
    });

    if (removed.length === 0) {
      console.log(`   ${date}: no matching items found.`);
      continue;
    }

    console.log(`   ${date}: removing ${removed.length} item(s):`);
    removed.forEach(item => console.log(`     - "${item.question}"`));

    if (!dryRun) {
      db.prepare(
        'UPDATE content_packs SET spread_json = ?, spread_count = ? WHERE date = ?'
      ).run(JSON.stringify(cleaned), cleaned.length, date);
      console.log(`   ✓ Updated SQLite row for ${date}.`);
    } else {
      console.log(`   [dry-run] Would update SQLite row for ${date}.`);
    }

    totalSqliteRemoved += removed.length;
  }

  db.close();

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done.`);
  console.log(`  Firestore items removed: ${totalFirestoreRemoved}`);
  console.log(`  SQLite rows updated:     ${SQLITE_DATES_TO_CLEAN.length > 0 ? totalSqliteRemoved : 0}`);
  if (dryRun) console.log('\nRe-run without --dry-run to apply.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
