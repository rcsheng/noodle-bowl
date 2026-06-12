/**
 * pipeline/historical.ts
 *
 * Bulk historical content generation — runs the full pipeline
 * (web-search ingest → select → generate → publish) for a range of ISO weeks.
 * Uses ingest-web-historical.ts which searches the live web for real articles
 * with verified URLs. Works for any week regardless of Claude's training cutoff.
 *
 * Each week runs sequentially; deduplication across weeks is preserved because
 * select.ts reads all previously written selected/ files.
 *
 * Usage:
 *   npm run pipeline:historical -- --quarter=2025-Q1
 *   npm run pipeline:historical -- --quarter=2025-Q2
 *   npm run pipeline:historical -- --quarter=2025-Q3
 *   npm run pipeline:historical -- --quarter=2025-Q4
 *   npm run pipeline:historical -- --quarter=2026-Q1   (W01–W13)
 *   npm run pipeline:historical -- --quarter=2026-Q2-partial  (W14–W21, up to current)
 *   npm run pipeline:historical -- --week-range=2025-W01:2025-W04
 *   npm run pipeline:historical -- --week=2025-W15     (single week)
 *   npm run pipeline:historical -- --quarter=2025-Q1 --dry-run
 *   npm run pipeline:historical -- --quarter=2025-Q1 --start-from=2025-W06  (resume)
 *   npm run pipeline:historical -- --quarter=2025-Q1 --skip-existing  (skip already-published weeks)
 *   npm run pipeline:historical -- --quarter=2025-Q4 --skip-ingest   (re-select/re-generate, skip fetch)
 */

import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { isoWeekToMonday } from './ingest-llm-historical';
import { loadEnv, dataPath } from './utils';

loadEnv();

// ─── ISO week utilities ───────────────────────────────────────────────────────

function getISOWeekId(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** All ISO week IDs from W01 to W52/W53 for a given year. */
function weeksInYear(year: number): string[] {
  const weeks: string[] = [];
  let monday = isoWeekToMonday(`${year}-W01`);
  while (true) {
    const wid = getISOWeekId(monday);
    if (parseInt(wid.split('-W')[0]) > year) break;
    weeks.push(wid);
    const d = new Date(monday + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 7);
    monday = d.toISOString().split('T')[0];
  }
  return weeks;
}

/** Quarter → ISO week range. Quarters are approximate (13-week groupings). */
function weeksForQuarter(quarter: string): string[] {
  const m = quarter.match(/^(\d{4})-Q(\d)(-partial)?$/);
  if (!m) throw new Error(`Invalid quarter format: ${quarter}. Expected YYYY-QN or YYYY-QN-partial.`);
  const year = parseInt(m[1]);
  const q = parseInt(m[2]);
  const partial = !!m[3];

  const all = weeksInYear(year);
  const start = (q - 1) * 13;
  const end = q === 4 ? all.length : start + 13;
  let weeks = all.slice(start, end);

  if (partial) {
    // Trim to weeks whose Monday is before or equal to today
    const today = new Date().toISOString().split('T')[0];
    weeks = weeks.filter(w => isoWeekToMonday(w) <= today);
  }
  return weeks;
}

function parseWeekRange(rangeStr: string): string[] {
  const [startWk, endWk] = rangeStr.split(':');
  if (!startWk || !endWk) throw new Error(`Invalid week range: ${rangeStr}. Expected YYYY-WNN:YYYY-WNN.`);
  const weeks: string[] = [];
  let monday = isoWeekToMonday(startWk);
  const endMonday = isoWeekToMonday(endWk);
  while (monday <= endMonday) {
    weeks.push(getISOWeekId(monday));
    const d = new Date(monday + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 7);
    monday = d.toISOString().split('T')[0];
  }
  return weeks;
}

// ─── Step runner ──────────────────────────────────────────────────────────────

const PIPELINE_DIR = path.resolve(__dirname, '..');
const TS_NODE_BIN = path.join(PIPELINE_DIR, 'node_modules', '.bin', 'ts-node');
// On Windows, spawnSync needs the .cmd wrapper; on Unix the bare script works fine
const TS_NODE = process.platform === 'win32' ? `${TS_NODE_BIN}.cmd` : TS_NODE_BIN;
const TSCONFIG = path.join(__dirname, 'tsconfig.json');

function run(
  script: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  dryRun: boolean,
): boolean {
  const cmd = `${TS_NODE} --transpile-only --project ${TSCONFIG} ${path.join(__dirname, script)}`;
  const fullArgs = [
    TS_NODE, '--transpile-only', '--project', TSCONFIG,
    path.join(__dirname, script),
    ...args,
  ];

  if (dryRun) {
    console.log(`  [dry-run] ${script} ${args.join(' ')}`);
    return true;
  }

  const result = child_process.spawnSync(fullArgs[0], fullArgs.slice(1), {
    env: { ...process.env, ...env },
    stdio: 'inherit',
    cwd: PIPELINE_DIR,
    // On Windows, .cmd files must be run through cmd.exe
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    console.error(`  ✗ ${script} failed (exit ${result.status ?? 'signal'})`);
    return false;
  }
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  const quarterArg    = args.find(a => a.startsWith('--quarter='))?.split('=')[1];
  const weekRangeArg  = args.find(a => a.startsWith('--week-range='))?.split('=')[1];
  const weekArg       = args.find(a => a.startsWith('--week='))?.split('=')[1];
  const startFrom     = args.find(a => a.startsWith('--start-from='))?.split('=')[1];
  const skipExisting  = args.includes('--skip-existing');
  const skipIngest    = args.includes('--skip-ingest');
  const dryRun        = args.includes('--dry-run');

  // Build the list of weeks to process
  let weeks: string[];
  if (quarterArg) {
    weeks = weeksForQuarter(quarterArg);
  } else if (weekRangeArg) {
    weeks = parseWeekRange(weekRangeArg);
  } else if (weekArg) {
    weeks = [weekArg];
  } else {
    console.error(
      'Usage:\n' +
      '  --quarter=YYYY-QN         (e.g. 2025-Q1, 2026-Q2-partial)\n' +
      '  --week-range=W1:W2        (e.g. 2025-W01:2025-W08)\n' +
      '  --week=YYYY-WNN           (single week)\n' +
      '\nOptions:\n' +
      '  --start-from=YYYY-WNN    Resume from a specific week\n' +
      '  --skip-existing          Skip weeks that already have a generated file\n' +
      '  --skip-ingest            Skip ingest step for weeks that already have a candidates file\n' +
      '                           (useful for re-select/re-generate migrations)\n' +
      '  --dry-run                Print what would run without executing\n'
    );
    process.exit(1);
  }

  // Apply --start-from filter
  if (startFrom) {
    const idx = weeks.indexOf(startFrom);
    if (idx === -1) {
      console.error(`--start-from week ${startFrom} not found in the computed range.`);
      process.exit(1);
    }
    weeks = weeks.slice(idx);
    console.log(`Resuming from ${startFrom} (${weeks.length} weeks remaining)`);
  }

  const total = weeks.length;
  console.log(`\n🍜 Historical pipeline: ${total} week${total !== 1 ? 's' : ''}`);
  if (dryRun) console.log('   (DRY RUN — no API calls will be made)\n');
  console.log(`   ${weeks[0]} → ${weeks[weeks.length - 1]}\n`);

  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const weekId of weeks) {
    const monday = isoWeekToMonday(weekId);
    const generatedPath = dataPath('generated', `${monday}.json`);

    // --skip-existing: skip if this week already has a generated file
    if (skipExisting && fs.existsSync(generatedPath)) {
      console.log(`[${done + skipped + failed + 1}/${total}] ${weekId} (${monday}) — SKIP (already generated)`);
      skipped++;
      continue;
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[${done + skipped + failed + 1}/${total}] ${weekId}  (${monday})`);
    console.log(`${'─'.repeat(60)}`);

    const env: NodeJS.ProcessEnv = { PIPELINE_DATE: monday };

    // Step 1: Web-search ingest — find real articles with verified URLs.
    // Skipped when --skip-ingest is set AND a candidates file already exists
    // (used for re-select/re-generate migrations on already-ingested weeks).
    const candidatesPath = dataPath('candidates', `${monday}.json`);
    const ingestSkipped = skipIngest && fs.existsSync(candidatesPath);
    if (ingestSkipped) {
      console.log('\n→ Step 1: ingest-web-historical (skipped — candidates file exists)');
    } else {
      console.log('\n→ Step 1: ingest-web-historical');
      const ingestOk = run('ingest-web-historical.ts', [`--week=${weekId}`], env, dryRun);
      if (!ingestOk) { failed++; console.error(`  Aborting week ${weekId}`); continue; }
    }

    // Step 2: Select best candidates
    console.log('\n→ Step 2: select');
    const selectOk = run('select.ts', [], env, dryRun);
    if (!selectOk) { failed++; console.error(`  Aborting week ${weekId}`); continue; }

    // Step 3: Generate trivia content via Claude
    console.log('\n→ Step 3: generate');
    const generateOk = run('generate.ts', [], env, dryRun);
    if (!generateOk) { failed++; console.error(`  Aborting week ${weekId}`); continue; }

    // Step 4: Publish to Firestore + local DB
    // --force allows overwriting weeks that already have content (e.g. W19-W21)
    console.log('\n→ Step 4: publish');
    const publishOk = run('publish.ts', ['--yes', '--force', `--date=${monday}`], env, dryRun);
    if (!publishOk) { failed++; console.error(`  Aborting week ${weekId}`); continue; }

    done++;
    console.log(`\n✓ ${weekId} complete`);

    // Brief pause between weeks to avoid hitting Claude rate limits
    if (!dryRun && done + failed < total - skipped) {
      await new Promise(r => setTimeout(r, 2_000));
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Historical pipeline complete`);
  console.log(`  ✓ ${done} published   ⏭ ${skipped} skipped   ✗ ${failed} failed`);
  if (failed > 0) {
    console.log(`\nTip: re-run with --skip-existing --start-from=<first-failed-week> to retry failures.`);
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
