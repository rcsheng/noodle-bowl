/**
 * One-time script: merge contentVersions/2026-W20 into contentVersions/2026-W21.
 * Deduplicates by the same keys publish.ts uses (partialHeadline / question / topic).
 * Reads W20, reads W21, merges banks, writes merged result back to W21.
 *
 * Usage:
 *   ts-node --transpile-only --project pipeline/tsconfig.json pipeline/merge-weeks.ts
 *   ts-node --transpile-only --project pipeline/tsconfig.json pipeline/merge-weeks.ts --dry-run
 */

import * as https from 'https';
import * as http from 'http';
import { loadEnv, requireEnv } from './utils';
import type { LedeItem, SpreadItem, SofItem, QuipPrompt, WaveItem } from '../constants/data';

loadEnv();

// ── Firestore value encoding (copied from publish.ts) ────────────────────────

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
  throw new Error(`Unsupported type: ${typeof val}`);
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
    for (const [k, v] of Object.entries(val.mapValue.fields)) obj[k] = fromFirestoreValue(v);
    return obj;
  }
  return null;
}

// ── Firestore REST helpers ────────────────────────────────────────────────────

async function firestoreGet(
  token: string,
  projectId: string,
  docPath: string,
): Promise<Record<string, unknown> | null> {
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: 'firestore.googleapis.com', port: 443, path: urlPath, method: 'GET',
        headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode === 404) { resolve(null); return; }
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const doc = JSON.parse(data) as { fields?: Record<string, FirestoreValue> };
            if (!doc.fields) { resolve(null); return; }
            const result: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(doc.fields)) result[k] = fromFirestoreValue(v);
            resolve(result);
          } else {
            reject(new Error(`GET ${docPath} → HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
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
      { hostname: 'firestore.googleapis.com', port: 443, path: urlPath, method: 'PATCH',
        headers: { 'Content-Type': 'application/json',
                   'Content-Length': Buffer.byteLength(body),
                   Authorization: `Bearer ${token}` } },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`PATCH ${docPath} → HTTP ${res.statusCode}: ${responseData.slice(0, 200)}`));
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Google auth (same pattern as publish.ts) ─────────────────────────────────

async function getIdToken(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleAuth } = require('google-auth-library') as {
    GoogleAuth: new (opts: unknown) => {
      getClient: () => Promise<{ getAccessToken: () => Promise<{ token: string }> }>;
    };
  };
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const result = await client.getAccessToken();
  return result.token;
}

// ── Dedup helper (same logic as publish.ts) ───────────────────────────────────

function dedupBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const k = keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface ContentBanks {
  lede: LedeItem[];
  spread: SpreadItem[];
  sof: SofItem[];
  quip: QuipPrompt[];
  wave: WaveItem[];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'noodle-bowl';

  const SOURCE = '2026-W20';
  const TARGET = '2026-W21';

  console.log(`Merging contentVersions/${SOURCE} → contentVersions/${TARGET}`);
  if (dryRun) console.log('  [DRY RUN — no writes]\n');

  const token = await getIdToken();

  const [sourceDoc, targetDoc] = await Promise.all([
    firestoreGet(token, projectId, `contentVersions/${SOURCE}`),
    firestoreGet(token, projectId, `contentVersions/${TARGET}`),
  ]);

  if (!sourceDoc) { console.error(`Source ${SOURCE} not found in Firestore.`); process.exit(1); }
  if (!targetDoc) { console.error(`Target ${TARGET} not found in Firestore.`); process.exit(1); }

  const srcBanks = sourceDoc.banks as ContentBanks;
  const tgtBanks = targetDoc.banks as ContentBanks;

  console.log(`${SOURCE} banks: lede:${srcBanks.lede.length} spread:${srcBanks.spread.length} sof:${srcBanks.sof.length}`);
  console.log(`${TARGET} banks: lede:${tgtBanks.lede.length} spread:${tgtBanks.spread.length} sof:${tgtBanks.sof.length}`);

  // Merge: target first so its existing items take precedence on collision
  const merged: ContentBanks = {
    lede:   dedupBy([...tgtBanks.lede,   ...srcBanks.lede],   (x) => x.partialHeadline),
    spread: dedupBy([...tgtBanks.spread, ...srcBanks.spread], (x) => x.question),
    sof:    dedupBy([...tgtBanks.sof,    ...srcBanks.sof],    (x) => x.topic),
    quip:   dedupBy([...tgtBanks.quip,   ...srcBanks.quip],   (x) => x.setup),
    wave:   dedupBy([...tgtBanks.wave,   ...srcBanks.wave],   (x) => x.story),
  };

  console.log(`\nMerged:  lede:${merged.lede.length} spread:${merged.spread.length} sof:${merged.sof.length}`);
  console.log(`  +lede:${merged.lede.length - tgtBanks.lede.length} +spread:${merged.spread.length - tgtBanks.spread.length} +sof:${merged.sof.length - tgtBanks.sof.length} (net new from ${SOURCE})`);

  if (dryRun) {
    console.log('\n[dry-run] Would write merged banks to contentVersions/2026-W21. Exiting.');
    return;
  }

  const updatedDoc: Record<string, unknown> = {
    ...targetDoc,
    banks: merged,
    updatedAt: new Date().toISOString(),
  };

  await firestorePatch(token, projectId, `contentVersions/${TARGET}`, updatedDoc);
  console.log(`\n✓ contentVersions/${TARGET} updated in production.`);
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
