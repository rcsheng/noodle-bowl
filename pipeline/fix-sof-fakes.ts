/**
 * Regenerates SoF fabricated claims using cross-week real-fact decoys.
 * Only claim[1] (isScience: false) is replaced — real claims are untouched.
 *
 * Single week (PowerShell):
 *   $env:FIX_SOF_WEEK="2026-W23"; npm run pipeline:fix-sof-fakes
 *
 * All published ISO weeks (no prompts):
 *   npm run pipeline:fix-sof-fakes:all
 */

import * as https from 'https';
import * as http from 'http';
import * as readline from 'readline';
import Anthropic from '@anthropic-ai/sdk';
import { loadEnv, requireEnv, extractJson } from './utils';
import { loadSofRealClaims, listContentWeeks } from './db';
import type { SofItem } from '../constants/data';

loadEnv();

const SONNET = 'claude-sonnet-4-6';
const ISO_WEEK_RE = /^\d{4}-W\d{2}$/;

// ── Firestore HTTP client ─────────────────────────────────────────────────────

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

function toFs(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number')
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFs) } };
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) fields[k] = toFs(v);
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported type: ${typeof val}`);
}

function fromFs(val: FirestoreValue): unknown {
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) return (val.arrayValue.values ?? []).map(fromFs);
  if ('mapValue' in val) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields)) obj[k] = fromFs(v);
    return obj;
  }
  return null;
}

async function firestoreGet(
  token: string, projectId: string, isProd: boolean, docPath: string,
): Promise<Record<string, unknown> | null> {
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: isProd ? 'firestore.googleapis.com' : 'localhost',
      port: isProd ? 443 : 8080,
      path: urlPath, method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    };
    (isProd ? https : http).request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        if (res.statusCode === 404) { resolve(null); return; }
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          const doc = JSON.parse(data) as { fields?: Record<string, FirestoreValue> };
          if (!doc.fields) { resolve(null); return; }
          const result: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(doc.fields)) result[k] = fromFs(v);
          resolve(result);
        } else {
          reject(new Error(`GET ${docPath} → HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject).end();
  });
}

async function firestorePatch(
  token: string, projectId: string, isProd: boolean,
  docPath: string, data: Record<string, unknown>,
): Promise<void> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFs(v);
  const body = JSON.stringify({ fields });
  const urlPath = `/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: isProd ? 'firestore.googleapis.com' : 'localhost',
      port: isProd ? 443 : 8080,
      path: urlPath, method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${token}`,
      },
    };
    const req = (isProd ? https : http).request(opts, res => {
      let out = '';
      res.on('data', c => (out += c));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`PATCH ${docPath} → HTTP ${res.statusCode}: ${out.slice(0, 200)}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getIdToken(isProd: boolean): Promise<string> {
  if (!isProd) return 'owner';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleAuth } = require('google-auth-library') as {
    GoogleAuth: new (opts: unknown) => {
      getClient: () => Promise<{ getAccessToken: () => Promise<{ token: string }> }>
    }
  };
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  return (await (await auth.getClient()).getAccessToken()).token;
}

function confirm(q: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, a => { rl.close(); resolve(a.trim().toLowerCase() === 'y'); }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function topicsOverlap(a: string, b: string): boolean {
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this']);
  const words = (s: string) => s.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stop.has(w));
  const wb = new Set(words(b));
  return words(a).some(w => wb.has(w));
}

function activeContentWeek(): string {
  const now = new Date();
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
  prev.setUTCDate(prev.getUTCDate() + 4 - (prev.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(prev.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((prev.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${prev.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ── LLM ───────────────────────────────────────────────────────────────────────

const usage = { inTokens: 0, outTokens: 0 };

async function regenFakeClaim(
  client: Anthropic,
  item: SofItem,
  decoy: string,
): Promise<{ text: string; explanation: string } | null> {
  const prompt =
    `You are rewriting a Science or Fiction game item. The real claim (claim 0) is fixed — ` +
    `only regenerate the fabricated claim (claim 1).\n\n` +
    `Real claim (do NOT change):\n"${item.claims[0].text}"\n\n` +
    `Decoy reference — a verified science fact from a different domain. ` +
    `Use it as raw material: keep the scientific register but alter the specific ` +
    `organism, mechanism, numbers, or outcome so the resulting claim is false.\n` +
    `"${decoy}"\n\n` +
    `Rules:\n` +
    `- The fabricated claim MUST be about a DIFFERENT subject than the real claim\n` +
    `- Do NOT copy the decoy verbatim — alter it to be false\n` +
    `- Match the length and tone of the real claim\n` +
    `- Must be plausible enough to fool a reasonably informed person\n\n` +
    `Return ONLY valid JSON, no markdown:\n` +
    `{"text": "<fabricated claim>", "explanation": "<1-2 sentences on what makes it false>"}`;

  const resp = await client.messages.create({
    model: SONNET, max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });
  usage.inTokens += resp.usage.input_tokens;
  usage.outTokens += resp.usage.output_tokens;

  const text = resp.content[0].type === 'text' ? resp.content[0].text : '';
  try {
    const parsed = extractJson(text) as { text: string; explanation: string };
    if (!parsed.text || !parsed.explanation) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Core: fix one week ────────────────────────────────────────────────────────

interface WeekResult {
  weekId: string;
  itemCount: number;
  fixed: number;
  failed: number;
  skipped: boolean; // true if doc not found in Firestore
}

async function fixWeek(
  weekId: string,
  client: Anthropic,
  token: string,
  projectId: string,
  isProd: boolean,
  decoyPool: Array<{ text: string; topic: string }>,
  verbose: boolean,
): Promise<WeekResult> {
  const doc = await firestoreGet(token, projectId, isProd, `contentVersions/${weekId}`);
  if (!doc) {
    console.log(`  ${weekId}: not found in Firestore — skipping`);
    return { weekId, itemCount: 0, fixed: 0, failed: 0, skipped: true };
  }

  const banks = doc.banks as { sof: SofItem[] };
  const sofItems: SofItem[] = banks.sof ?? [];

  if (sofItems.length === 0) {
    console.log(`  ${weekId}: 0 SoF items — skipping`);
    return { weekId, itemCount: 0, fixed: 0, failed: 0, skipped: true };
  }

  if (verbose) {
    console.log(`\n  ${weekId} — ${sofItems.length} items:`);
  } else {
    process.stdout.write(`  ${weekId} (${sofItems.length} items):`);
  }

  const updated: SofItem[] = [];
  let fixed = 0;
  let failed = 0;

  for (const item of sofItems) {
    const candidates = decoyPool.filter(d => !topicsOverlap(d.topic, item.topic));
    if (candidates.length === 0) {
      if (verbose) console.log(`    ${item.topic}: no decoy candidates — kept`);
      updated.push(item);
      continue;
    }

    const decoy = candidates[Math.floor(Math.random() * candidates.length)].text;
    const result = await regenFakeClaim(client, item, decoy);

    if (!result) {
      if (verbose) console.log(`    ${item.topic}: LLM error — kept`);
      updated.push(item);
      failed++;
      continue;
    }

    updated.push({
      ...item,
      claims: [
        item.claims[0],
        { text: result.text, isScience: false, explanation: result.explanation, source: null },
      ],
    });
    fixed++;
    if (verbose) console.log(`    ✓ ${item.topic}`);
    else process.stdout.write('.');
  }

  if (!verbose) console.log(` ${fixed}/${sofItems.length} fixed`);

  await firestorePatch(token, projectId, isProd, `contentVersions/${weekId}`, {
    ...doc,
    banks: { ...banks, sof: updated },
    updatedAt: new Date().toISOString(),
  });

  return { weekId, itemCount: sofItems.length, fixed, failed, skipped: false };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const isProd = !process.argv.includes('--emulator');
  const autoYes = process.env.FIX_SOF_ALL === 'true' || process.argv.includes('--yes');
  const batchAll = process.env.FIX_SOF_ALL === 'true';
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'noodle-bowl';

  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey });
  const decoyPool = loadSofRealClaims('__none__');

  if (batchAll) {
    // ── Batch mode: fix all published ISO weeks ───────────────────────────────
    const allWeeks = listContentWeeks()
      .map(r => r.weekId)
      .filter(id => ISO_WEEK_RE.test(id))
      .sort();

    console.log(`\nBatch fix SoF fakes — ${allWeeks.length} ISO weeks`);
    console.log(`Target: ${isProd ? `PRODUCTION (${projectId})` : 'LOCAL EMULATOR'}`);
    console.log(`Decoy pool: ${decoyPool.length} real claims\n`);

    if (decoyPool.length === 0) {
      console.error('Decoy pool empty — aborting.'); process.exit(1);
    }

    const ok = await confirm(`Fix all ${allWeeks.length} weeks in Firestore? [y/N] `);
    if (!ok) { console.log('Cancelled.'); return; }

    const token = await getIdToken(isProd);
    const results: WeekResult[] = [];
    let totalFixed = 0;
    let totalFailed = 0;

    for (let i = 0; i < allWeeks.length; i++) {
      const weekId = allWeeks[i];
      process.stdout.write(`[${i + 1}/${allWeeks.length}] `);
      const result = await fixWeek(weekId, client, token, projectId, isProd, decoyPool, false);
      results.push(result);
      totalFixed += result.fixed;
      totalFailed += result.failed;
    }

    const cost = (usage.inTokens * 3 + usage.outTokens * 15) / 1_000_000;
    const skipped = results.filter(r => r.skipped).length;

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Weeks processed : ${allWeeks.length - skipped}  skipped: ${skipped}`);
    console.log(`Items fixed     : ${totalFixed}  failed: ${totalFailed}`);
    console.log(`Tokens          : ${usage.inTokens}in / ${usage.outTokens}out`);
    console.log(`Estimated cost  : ~$${cost.toFixed(2)}`);

  } else {
    // ── Single-week mode ─────────────────────────────────────────────────────
    const weekId =
      process.env.FIX_SOF_WEEK ??
      process.argv.find(a => a.startsWith('--week='))?.split('=')[1] ??
      activeContentWeek();

    console.log(`\nFix SoF fakes — week: ${weekId}`);
    console.log(`Target: ${isProd ? `PRODUCTION (${projectId})` : 'LOCAL EMULATOR'}`);
    console.log(`Decoy pool: ${decoyPool.length} real claims\n`);

    if (decoyPool.length === 0) {
      console.error('Decoy pool empty — aborting.'); process.exit(1);
    }

    const token = await getIdToken(isProd);
    const doc = await firestoreGet(token, projectId, isProd, `contentVersions/${weekId}`);
    if (!doc) {
      console.error(`No contentVersions/${weekId} found.`); process.exit(1);
    }

    const banks = doc.banks as { sof: SofItem[] };
    const sofItems: SofItem[] = banks.sof ?? [];
    console.log(`Found ${sofItems.length} SoF items\n`);

    sofItems.forEach((item, i) => {
      const flag = item.claims[0].text.slice(0, 30) === item.claims[1].text.slice(0, 30) ? ' ⚠' : '';
      console.log(`  [${i}] ${item.topic}${flag}`);
      console.log(`       real: ${item.claims[0].text.slice(0, 70)}`);
      console.log(`       fake: ${item.claims[1].text.slice(0, 70)}`);
    });

    const ok = autoYes || (await confirm(`\nRegenerate all ${sofItems.length} items? [y/N] `));
    if (!ok) { console.log('Cancelled.'); return; }

    const result = await fixWeek(weekId, client, token, projectId, isProd, decoyPool, true);
    const cost = (usage.inTokens * 3 + usage.outTokens * 15) / 1_000_000;

    console.log(`\nFixed: ${result.fixed}  Failed: ${result.failed}`);
    console.log(`✓ Patched contentVersions/${weekId}`);
    console.log(`Tokens: ${usage.inTokens}in / ${usage.outTokens}out  ~$${cost.toFixed(3)}`);
  }
}

main().catch(err => { console.error((err as Error).message); process.exit(1); });
