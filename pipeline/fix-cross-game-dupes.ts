/**
 * One-time cleanup: removes SoF items that are already represented in the
 * Lede bank for the same week (cross-game duplicates caused by the same news
 * story being ingested from two different URLs with different IDs).
 *
 * Known duplicates to remove from SoF:
 * - coyote-alcatraz: W19 (May 10) and W20 (May 11–14)
 * - singapore-vending: W20 (May 11–14)
 *
 * Root-cause fix: pipeline/select.ts now uses headline fingerprints for
 * within-day dedup so this cannot recur in future pipeline runs.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=C:/Users/rcshe/.firebase/noodle-bowl-sa.json \
 *   npx ts-node pipeline/fix-cross-game-dupes.ts [--dry-run] [--emulator]
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
// Config
// ---------------------------------------------------------------------------

/** Each filter describes a story that appeared in both Lede and SoF.
 *  `keywords` are matched (all must be present, case-insensitive) against
 *  the full text of the SoF item: topic + intro + all claim text/explanations.
 */
const DUPLICATE_FILTERS: Array<{ label: string; keywords: string[] }> = [
  {
    label: 'coyote-alcatraz',
    keywords: ['coyote', 'alcatraz'],
  },
  {
    label: 'singapore-vending',
    // "singapore" + "vending" uniquely identifies the French teen / vending machine story
    keywords: ['singapore', 'vending'],
  },
];

// Firestore contentVersions documents to check.
const WEEKS_TO_FIX = ['2026-W19', '2026-W20'];

// Per-day SQLite content_packs rows to clean.
const SQLITE_DATES_TO_CLEAN = [
  '2026-05-10', // W19 — coyote only
  '2026-05-11', // W20 — coyote + singapore
  '2026-05-12', // W20 — coyote + singapore
  '2026-05-13', // W20 — coyote + singapore
  '2026-05-14', // W20 — coyote + singapore
];

const DB_PATH = path.join(__dirname, 'data', 'history.db');

// ---------------------------------------------------------------------------
// Firestore REST helpers (same pattern as publish.ts / fix-spread-dupes.ts)
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
    GoogleAuth: new (o: unknown) => {
      getClient: () => Promise<{ getAccessToken: () => Promise<{ token: string }> }>;
    };
  };
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  return (await client.getAccessToken()).token;
}

async function fsGet(
  token: string,
  projectId: string,
  isProd: boolean,
  docPath: string,
): Promise<Record<string, unknown> | null> {
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const transport = isProd ? https : http;
    const req = transport.request(
      {
        hostname: isProd ? 'firestore.googleapis.com' : 'localhost',
        port: isProd ? 443 : 8080,
        path: urlPath,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
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

async function fsPatch(
  token: string,
  projectId: string,
  isProd: boolean,
  docPath: string,
  data: Record<string, unknown>,
): Promise<void> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFV(v);
  const body = JSON.stringify({ fields });
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const transport = isProd ? https : http;
    const req = transport.request(
      {
        hostname: isProd ? 'firestore.googleapis.com' : 'localhost',
        port: isProd ? 443 : 8080,
        path: urlPath,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Bearer ${token}`,
        },
      },
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

interface SofItem {
  topic: string;
  intro?: string;
  claims?: Array<{ text?: string; explanation?: string; [k: string]: unknown }>;
  [k: string]: unknown;
}

/** Returns all user-visible and contextual text in a SoF item, lowercased. */
function sofItemText(item: SofItem): string {
  const claimsText = (item.claims ?? [])
    .flatMap((c) => [c.text ?? '', c.explanation ?? ''])
    .join(' ');
  return `${item.topic ?? ''} ${item.intro ?? ''} ${claimsText}`.toLowerCase();
}

function matchesFilter(item: SofItem, keywords: string[]): boolean {
  const text = sofItemText(item);
  return keywords.every((kw) => text.includes(kw.toLowerCase()));
}

interface DedupeResult {
  cleaned: SofItem[];
  removedCount: number;
  removedItems: Array<{ label: string; item: SofItem }>;
}

function deduplicateSof(sof: SofItem[]): DedupeResult {
  const removedItems: Array<{ label: string; item: SofItem }> = [];
  const cleaned = sof.filter((item) => {
    for (const { label, keywords } of DUPLICATE_FILTERS) {
      if (matchesFilter(item, keywords)) {
        removedItems.push({ label, item });
        return false;
      }
    }
    return true;
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

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}fix-cross-game-dupes`);
  console.log(`Target: ${isProd ? `PRODUCTION (${projectId})` : 'LOCAL EMULATOR'}`);
  console.log(`Filters: ${DUPLICATE_FILTERS.map((f) => f.label).join(', ')}\n`);

  const token = await getToken(isProd);
  let totalFirestoreRemoved = 0;
  let totalSqliteRemoved = 0;

  // ── 1. Firestore cleanup ──────────────────────────────────────────────────
  for (const weekId of WEEKS_TO_FIX) {
    console.log(`── Firestore: contentVersions/${weekId}`);
    const doc = await fsGet(token, projectId, isProd, `contentVersions/${weekId}`);
    if (!doc) {
      console.log(`   Not found — skipping.\n`);
      continue;
    }

    const banks = doc.banks as { sof?: SofItem[]; [k: string]: unknown } | undefined;
    const sof = banks?.sof ?? [];
    console.log(`   Current SoF count: ${sof.length}`);

    const { cleaned, removedCount, removedItems } = deduplicateSof(sof);

    if (removedCount === 0) {
      console.log(`   No cross-game duplicates found.\n`);
      continue;
    }

    console.log(`   Cross-game duplicates to remove (${removedCount}):`);
    removedItems.forEach(({ label, item }) =>
      console.log(`     [${label}] topic="${item.topic}" intro="${(item.intro ?? '').slice(0, 60)}…"`),
    );
    console.log(`   SoF after cleanup: ${cleaned.length}`);

    if (!dryRun) {
      const updated: Record<string, unknown> = {
        ...doc,
        banks: { ...(doc.banks as object), sof: cleaned },
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

  // ── 2. SQLite cleanup ─────────────────────────────────────────────────────
  console.log(`── SQLite: ${DB_PATH}`);
  const db = new Database(DB_PATH);

  for (const date of SQLITE_DATES_TO_CLEAN) {
    const row = db
      .prepare('SELECT sof_json, sof_count FROM content_packs WHERE date = ?')
      .get(date) as { sof_json: string; sof_count: number } | undefined;

    if (!row) {
      console.log(`   ${date}: not in SQLite — skipping.`);
      continue;
    }

    const sof: SofItem[] = JSON.parse(row.sof_json);
    const { cleaned, removedCount, removedItems } = deduplicateSof(sof);

    if (removedCount === 0) {
      console.log(`   ${date}: no matching items found.`);
      continue;
    }

    console.log(`   ${date}: removing ${removedCount} item(s):`);
    removedItems.forEach(({ label, item }) =>
      console.log(`     [${label}] topic="${item.topic}"`),
    );

    if (!dryRun) {
      db.prepare('UPDATE content_packs SET sof_json = ?, sof_count = ? WHERE date = ?').run(
        JSON.stringify(cleaned),
        cleaned.length,
        date,
      );
      console.log(`   ✓ Updated SQLite row for ${date}.`);
    } else {
      console.log(`   [dry-run] Would update SQLite row for ${date}.`);
    }

    totalSqliteRemoved += removedCount;
  }

  db.close();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done.`);
  console.log(`  Firestore SoF items removed: ${totalFirestoreRemoved}`);
  console.log(`  SQLite rows updated:         ${totalSqliteRemoved}`);
  if (dryRun) console.log('\nRe-run without --dry-run to apply.');
}

main().catch((err: Error) => {
  console.error('Error:', err.message);
  process.exit(1);
});
