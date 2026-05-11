import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(__dirname, 'data', 'history.db');
const LOG_PATH = path.join(__dirname, 'data', 'pipeline.log');

const LEDE_MIN = 10;
const SPREAD_MIN = 10;
const SOF_MIN = 10;

interface PackRow {
  date: string;
  versionId: string;
  publishedAt: string;
  ledeCount: number;
  spreadCount: number;
  sofCount: number;
}

interface RunRow {
  stage: string;
  ranAt: string;
  status: string;
  summary: string | null;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function warn(n: number, min: number): string {
  return n < min ? `  ⚠ low (<${min})` : '';
}

function bar(label: string, n: number, min: number): string {
  const flag = n < min ? ' ⚠' : ' ✓';
  return `  ${label.padEnd(8)} ${String(n).padStart(3)}${flag}`;
}

const W = 50;
const line = '─'.repeat(W);

if (!fs.existsSync(DB_PATH)) {
  console.log('No pipeline history yet — run the pipeline first.');
  process.exit(0);
}

const db = new Database(DB_PATH, { readonly: true });

const todayStr = today();

const packs = db.prepare(`
  SELECT date, version_id AS versionId, published_at AS publishedAt,
         lede_count AS ledeCount, spread_count AS spreadCount, sof_count AS sofCount
  FROM content_packs ORDER BY date DESC LIMIT 10
`).all() as PackRow[];

const todayPack = packs.find(p => p.date === todayStr) ?? null;

const todayStages = db.prepare(`
  SELECT stage, ran_at AS ranAt, status, summary
  FROM pipeline_runs WHERE date = ?
  ORDER BY id ASC
`).all(todayStr) as RunRow[];

db.close();

// ── Header ─────────────────────────────────────────────────────────────────
console.log();
console.log('  NOODLE BOWL PIPELINE STATUS');
console.log('  ' + line);

// ── Today ──────────────────────────────────────────────────────────────────
console.log();
console.log(`  TODAY  ${todayStr}`);

if (!todayPack) {
  const lastLog = fs.existsSync(LOG_PATH)
    ? fs.readFileSync(LOG_PATH, 'utf-8').trim().split('\n').slice(-5).join('\n')
    : '(no log)';
  console.log('  Status   ✗ not run yet (or failed before publish)');
  console.log();
  console.log('  Last log lines:');
  lastLog.split('\n').forEach(l => console.log('    ' + l.slice(22)));  // strip timestamp prefix
} else {
  const stages = todayStages;
  const allOk = stages.length > 0 && stages.every(s => s.status === 'ok');
  const statusIcon = allOk ? '✓' : stages.some(s => s.status === 'error') ? '✗' : '~';

  console.log(`  Status   ${statusIcon} ${allOk ? 'complete' : 'partial / errors'}`);
  console.log(`  Version  ${todayPack.versionId}`);
  console.log(`  Published ${fmtDate(todayPack.publishedAt)}`);
  console.log(bar('Lede',   todayPack.ledeCount,   LEDE_MIN));
  console.log(bar('Spread', todayPack.spreadCount, SPREAD_MIN));
  console.log(bar('SoF',    todayPack.sofCount,    SOF_MIN));

  if (stages.length) {
    console.log();
    console.log('  Stage breakdown:');
    const stageOrder = ['ingest', 'select', 'generate', 'publish'];
    const byStage = Object.fromEntries(stages.map(s => [s.stage, s]));
    for (const name of stageOrder) {
      const s = byStage[name];
      if (!s) continue;
      const icon = s.status === 'ok' ? '✓' : '✗';
      const time = fmtTime(s.ranAt);
      const note = s.summary ? `  ${s.summary}` : '';
      console.log(`    ${icon} ${name.padEnd(10)} ${time}${note}`);
    }
  }
}

// ── Recent history ─────────────────────────────────────────────────────────
if (packs.length > 1 || (packs.length === 1 && packs[0].date !== todayStr)) {
  console.log();
  console.log('  RECENT RUNS');
  const recent = packs.filter(p => p.date !== todayStr).slice(0, 7);
  for (const p of recent) {
    const f = (n: number, min: number) => `${n}${n < min ? '⚠' : ' '}`;
    const row = [
      `lede:${f(p.ledeCount, LEDE_MIN).padEnd(4)}`,
      `spread:${f(p.spreadCount, SPREAD_MIN).padEnd(4)}`,
      `sof:${f(p.sofCount, SOF_MIN).padEnd(3)}`,
    ].join('  ');
    console.log(`  ${p.date}   ${row}`);
  }
}

console.log();
console.log('  ' + line);
console.log();
