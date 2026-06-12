/**
 * pipeline/ui-server.ts
 *
 * Local pipeline status UI. Reads from pipeline/data/history.db and serves
 * a single-page app showing content published to production, day × game.
 *
 * Usage:  npm run pipeline:ui
 * Opens:  http://localhost:4242
 */

import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import Database from 'better-sqlite3';

const DB_PATH = path.join(__dirname, 'data', 'history.db');
const PORT = parseInt(process.env.PORT ?? '4242', 10);

// ─── DB types ────────────────────────────────────────────────────────────────

interface PackRow {
  date: string;
  weekId: string;
  publishedAt: string;
  ledeCount: number;
  spreadCount: number;
  sofCount: number;
  netNewLede: number | null;
  netNewSpread: number | null;
  netNewSof: number | null;
  isForce: number;        // 0 or 1 from SQLite
  republishCount: number;
}

interface PackDetailRow extends PackRow {
  ledeJson: string;
  spreadJson: string;
  sofJson: string;
}

interface WeekRow {
  weekId: string;
  ledeTotal: number;
  spreadTotal: number;
  sofTotal: number;
  publishedDates: string[];
  updatedAt: string;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

function openDb(): Database.Database {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`No history.db found at ${DB_PATH}. Run the pipeline first.`);
  }
  return new Database(DB_PATH, { readonly: true });
}

function listPacks(): PackRow[] {
  const db = openDb();
  try {
    return db.prepare(`
      SELECT date,
             version_id      AS weekId,
             published_at    AS publishedAt,
             lede_count      AS ledeCount,
             spread_count    AS spreadCount,
             sof_count       AS sofCount,
             net_new_lede    AS netNewLede,
             net_new_spread  AS netNewSpread,
             net_new_sof     AS netNewSof,
             is_force        AS isForce,
             republish_count AS republishCount
      FROM content_packs
      ORDER BY date DESC
    `).all() as PackRow[];
  } finally {
    db.close();
  }
}

function listWeeks(): WeekRow[] {
  const db = openDb();
  try {
    // Table may not exist on older DBs — return empty array gracefully
    const exists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='content_weeks'`
    ).get();
    if (!exists) return [];
    const rows = db.prepare(`
      SELECT week_id          AS weekId,
             lede_total       AS ledeTotal,
             spread_total     AS spreadTotal,
             sof_total        AS sofTotal,
             published_dates  AS publishedDatesJson,
             updated_at       AS updatedAt
      FROM content_weeks
      ORDER BY week_id DESC
    `).all() as Array<Omit<WeekRow, 'publishedDates'> & { publishedDatesJson: string }>;
    return rows.map(r => ({ ...r, publishedDates: JSON.parse(r.publishedDatesJson) as string[] }));
  } finally {
    db.close();
  }
}

function getPackDetail(date: string): Record<string, unknown> | null {
  const db = openDb();
  try {
    const row = db.prepare(`
      SELECT date,
             version_id   AS weekId,
             published_at AS publishedAt,
             lede_count   AS ledeCount,
             spread_count AS spreadCount,
             sof_count    AS sofCount,
             lede_json    AS ledeJson,
             spread_json  AS spreadJson,
             sof_json     AS sofJson
      FROM content_packs
      WHERE date = ?
    `).get(date) as PackDetailRow | undefined;

    if (!row) return null;

    return {
      date:        row.date,
      weekId:      row.weekId,
      publishedAt: row.publishedAt,
      ledeCount:   row.ledeCount,
      spreadCount: row.spreadCount,
      sofCount:    row.sofCount,
      lede:        JSON.parse(row.ledeJson)   as unknown[],
      spread:      JSON.parse(row.spreadJson) as unknown[],
      sof:         JSON.parse(row.sofJson)    as unknown[],
    };
  } finally {
    db.close();
  }
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function json(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = (req.url ?? '').split('?')[0];

  if (url === '/api/packs' && req.method === 'GET') {
    try   { json(res, 200, listPacks()); }
    catch (e) { json(res, 500, { error: (e as Error).message }); }
    return;
  }

  if (url === '/api/weeks' && req.method === 'GET') {
    try   { json(res, 200, listWeeks()); }
    catch (e) { json(res, 500, { error: (e as Error).message }); }
    return;
  }

  const packMatch = url.match(/^\/api\/packs\/(\d{4}-\d{2}-\d{2})$/);
  if (packMatch && req.method === 'GET') {
    try {
      const detail = getPackDetail(packMatch[1]);
      detail ? json(res, 200, detail) : json(res, 404, { error: 'Not found' });
    } catch (e) { json(res, 500, { error: (e as Error).message }); }
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🍜  Pipeline UI  →  ${url}\n`);
  const cmd = process.platform === 'win32' ? `cmd /c start ${url}`
            : process.platform === 'darwin' ? `open ${url}`
            : `xdg-open ${url}`;
  child_process.exec(cmd, () => { /* ignore errors */ });
});

// ─── HTML ─────────────────────────────────────────────────────────────────────

const HTML = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>🍜 Pipeline Status</title>
<style>
  :root {
    --bg:      #0f1117;
    --surface: #161922;
    --card:    #1d2030;
    --border:  #262a3a;
    --text:    #e2e8f0;
    --muted:   #7a8499;
    --lede:    #3b82f6;
    --spread:  #a855f7;
    --sof:     #f97316;
    --good:    #22c55e;
    --bad:     #ef4444;
    --warn:    #eab308;
    --mono:    'SF Mono','Cascadia Code','Consolas',monospace;
    --r:       6px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    min-height: 100vh;
    padding: 28px 32px;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 24px;
  }
  header h1 { font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
  #meta { color: var(--muted); font-size: 13px; }

  /* ── Table ── */
  .wrap {
    border: 1px solid var(--border);
    border-radius: var(--r);
    overflow-x: auto;
  }

  table { width: 100%; border-collapse: collapse; }

  thead th {
    background: var(--surface);
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .06em;
    padding: 10px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  /* ── Week header rows ── */
  tr.week-row td {
    background: var(--surface);
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    border-top: 2px solid var(--border);
  }
  tr.week-row:first-of-type td { border-top: none; }

  .week-label {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .week-id {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: .03em;
  }
  .week-totals {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .week-total-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }
  .week-total-pill.lede   { background: rgba(59,130,246,.2);  color: #3b82f6; }
  .week-total-pill.spread { background: rgba(168,85,247,.2);  color: #a855f7; }
  .week-total-pill.sof    { background: rgba(249,115,22,.2);  color: #f97316; }
  .week-total-label { font-size: 10px; font-weight: 400; opacity: .7; }
  .week-days { font-size: 11px; color: var(--muted); }
  .week-source-note { font-size: 11px; color: var(--muted); font-style: italic; }
  .week-estimated { font-size: 11px; color: var(--warn); font-style: italic; }

  /* Force-republish badge */
  .force-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(234,179,8,.15);
    color: var(--warn);
    margin-left: 4px;
    vertical-align: middle;
  }

  /* Net-new delta under pill */
  .net-new {
    display: block;
    font-size: 10px;
    color: var(--good);
    font-weight: 500;
    margin-top: 2px;
    text-align: center;
  }
  .net-new.zero { color: var(--muted); }

  /* ── Day rows ── */
  tr.pack-row td {
    padding: 9px 16px 9px 28px;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  tr.pack-row:hover td { background: rgba(255,255,255,.025); }

  .d-date { font-family: var(--mono); font-size: 13px; font-weight: 500; }
  .d-week { font-family: var(--mono); font-size: 12px; color: var(--muted); }
  .d-pub  { font-size: 12px; color: var(--muted); white-space: nowrap; }

  /* ── Pills ── */
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 11px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid transparent;
    transition: filter .12s, opacity .12s;
    user-select: none;
  }
  .pill:hover { filter: brightness(1.15); }
  .pill.active { filter: brightness(1.3); box-shadow: 0 0 0 2px rgba(255,255,255,.12); }

  .pill.lede   { background: rgba(59,130,246,.15);  border-color: rgba(59,130,246,.4);  color: #3b82f6; }
  .pill.spread { background: rgba(168,85,247,.15); border-color: rgba(168,85,247,.4); color: #a855f7; }
  .pill.sof    { background: rgba(249,115,22,.15); border-color: rgba(249,115,22,.4); color: #f97316; }

  .pill.low { border-style: dashed; opacity: .85; }
  .pill.low::after { content: ' ⚠'; font-size: 10px; }

  /* ── Detail row ── */
  tr.detail-row td {
    padding: 0;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .detail-inner {
    padding: 16px 20px;
    overflow-y: auto;
    max-height: 520px;
  }

  .detail-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    color: var(--muted);
  }
  .detail-head strong { font-size: 13px; font-weight: 600; color: var(--text); }
  .detail-head .sep { opacity: .4; }

  /* ── Item cards ── */
  .items { display: flex; flex-direction: column; gap: 10px; }

  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 13px 15px;
  }

  .card-q {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.45;
    margin-bottom: 7px;
  }

  .ans {
    font-size: 12px;
    font-weight: 600;
    color: var(--good);
    margin-bottom: 4px;
  }
  .ans::before { content: '✓  '; }

  .decoys {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 7px;
  }
  .decoy {
    font-size: 11px;
    color: var(--muted);
    background: rgba(255,255,255,.05);
    border-radius: 4px;
    padding: 2px 7px;
  }

  .expl {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.55;
    margin-bottom: 7px;
  }

  .src {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 11px;
    color: var(--muted);
    font-family: var(--mono);
  }
  .src-badge {
    background: rgba(255,255,255,.07);
    border-radius: 3px;
    padding: 2px 7px;
  }

  /* Spread */
  .spread-val {
    font-size: 22px;
    font-weight: 700;
    color: var(--spread);
    line-height: 1.2;
    margin-bottom: 2px;
  }
  .spread-unit { font-size: 13px; font-weight: 400; color: var(--muted); margin-left: 3px; }
  .spread-others { font-size: 12px; color: var(--muted); margin-bottom: 7px; }

  /* SoF */
  .sof-topic { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
  .sof-intro { font-size: 12px; color: var(--muted); line-height: 1.5; margin-bottom: 10px; }

  .claim {
    display: flex;
    gap: 9px;
    margin-bottom: 9px;
    align-items: flex-start;
  }
  .claim:last-child { margin-bottom: 0; }

  .claim-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-top: 2px;
  }
  .claim-badge.sc { background: rgba(34,197,94,.15);  color: var(--good); }
  .claim-badge.fi { background: rgba(239,68,68,.15);  color: var(--bad); }

  .claim-body { flex: 1; min-width: 0; }
  .claim-text { font-size: 12px; line-height: 1.45; margin-bottom: 3px; }
  .claim-expl { font-size: 11px; color: var(--muted); line-height: 1.45; margin-bottom: 3px; }
  .claim-src  { font-size: 11px; color: var(--muted); font-family: var(--mono); }
  .claim-src a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }

  /* Misc */
  .loading { color: var(--muted); font-size: 13px; padding: 8px 0; }
  .err { color: var(--bad); background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2); border-radius: var(--r); padding: 10px 14px; font-size: 13px; }
  .empty { color: var(--muted); font-size: 13px; font-style: italic; }
</style>
</head>
<body>

<header>
  <h1>🍜 Pipeline Status</h1>
  <span id="meta"></span>
</header>

<div id="status" style="color:#eab308;font-size:13px;margin-bottom:12px;display:none"></div>

<div class="wrap">
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Week</th>
        <th>Lede (batch)</th>
        <th>Spread (batch)</th>
        <th>SoF (batch)</th>
        <th>Published</th>
      </tr>
    </thead>
    <tbody id="body"></tbody>
  </table>
</div>

<script>
const MIN = { lede: 10, spread: 10, sof: 10 };
const cache = {};
let active = null; // 'date:game'

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
    + ' · ' + d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false});
}

function makePill(date, game, count, netNew) {
  const low = count < MIN[game];
  const key = date + ':' + game;
  let delta = '';
  if (netNew != null) {
    const cls = netNew === 0 ? 'zero' : '';
    delta = '<span class="net-new ' + cls + '">+' + netNew + ' new</span>';
  }
  return '<div style="display:inline-block;text-align:center">'
       + '<span class="pill ' + game + (low ? ' low' : '') + '" '
       + 'id="pill-' + key + '" '
       + 'data-date="' + date + '" data-game="' + game + '">'
       + count
       + '</span>'
       + delta
       + '</div>';
}

function renderTable(packs, weeks) {
  document.getElementById('meta').textContent =
    packs.length + ' day' + (packs.length !== 1 ? 's' : '') + ' in history';

  // Build a map of weekId → week totals
  const weekMap = {};
  for (const w of weeks) weekMap[w.weekId] = w;

  // Group packs by week, preserving DESC order
  const weekOrder = [];
  const byWeek = {};
  for (const p of packs) {
    if (!byWeek[p.weekId]) {
      weekOrder.push(p.weekId);
      byWeek[p.weekId] = [];
    }
    byWeek[p.weekId].push(p);
  }

  const body = document.getElementById('body');
  body.innerHTML = '';

  for (const weekId of weekOrder) {
    const w = weekMap[weekId];
    const dayPacks = byWeek[weekId];

    // Week header row — shows Firestore-synced merged totals
    const weekTr = document.createElement('tr');
    weekTr.className = 'week-row';

    // Fall back to summing daily batches if no content_weeks record exists
    const sumLede   = dayPacks.reduce((s, p) => s + p.ledeCount, 0);
    const sumSpread = dayPacks.reduce((s, p) => s + p.spreadCount, 0);
    const sumSof    = dayPacks.reduce((s, p) => s + p.sofCount, 0);
    const ledeTotal   = w ? w.ledeTotal   : sumLede;
    const spreadTotal = w ? w.spreadTotal : sumSpread;
    const sofTotal    = w ? w.sofTotal    : sumSof;
    const isEstimate  = !w;
    const dayCount    = w ? w.publishedDates.length : dayPacks.length;

    const weekContent =
        '<div class="week-label">'
      + '<span class="week-id">' + esc(weekId) + '</span>'
      + '<div class="week-totals">'
      + '<span class="week-total-pill lede">'   + ledeTotal   + ' <span class="week-total-label">lede</span></span>'
      + '<span class="week-total-pill spread">' + spreadTotal + ' <span class="week-total-label">spread</span></span>'
      + '<span class="week-total-pill sof">'    + sofTotal    + ' <span class="week-total-label">sof</span></span>'
      + '</div>'
      + '<span class="week-days">' + dayCount + ' day' + (dayCount !== 1 ? 's' : '') + ' published</span>'
      + (isEstimate
          ? '<span class="week-estimated">estimated from daily batches — republish to sync Firestore total</span>'
          : '<span class="week-source-note">live Firestore bank (not a sum of daily batches)</span>')
      + '</div>';

    weekTr.innerHTML = '<td colspan="6">' + weekContent + '</td>';
    body.appendChild(weekTr);

    // Daily rows for this week
    for (const p of dayPacks) {
      const tr = document.createElement('tr');
      tr.className = 'pack-row';
      tr.id = 'row-' + p.date;
      const forceBadge = p.isForce ? '<span class="force-badge">&#x21BA; republished</span>' : '';
      const republishNote = p.republishCount > 1
        ? '<span style="font-size:10px;color:var(--muted);display:block">x' + p.republishCount + '</span>'
        : '';
      tr.innerHTML =
        '<td><span class="d-date">' + esc(p.date) + '</span>' + forceBadge + republishNote + '</td>'
      + '<td><span class="d-week">' + esc(p.weekId) + '</span></td>'
      + '<td>' + makePill(p.date, 'lede',   p.ledeCount,   p.netNewLede)   + '</td>'
      + '<td>' + makePill(p.date, 'spread', p.spreadCount, p.netNewSpread) + '</td>'
      + '<td>' + makePill(p.date, 'sof',    p.sofCount,    p.netNewSof)    + '</td>'
      + '<td><span class="d-pub">'  + esc(fmtDate(p.publishedAt)) + '</span></td>';
      body.appendChild(tr);
    }
  }
}

async function toggle(date, game) {
  const key = date + ':' + game;

  // Close any existing detail
  if (active) {
    const old = document.getElementById('detail-' + active);
    if (old) old.remove();
    const oldPill = document.getElementById('pill-' + active);
    if (oldPill) oldPill.classList.remove('active');
    const closing = active === key;
    active = null;
    if (closing) return;
  }

  // Open new detail row
  active = key;
  document.getElementById('pill-' + key)?.classList.add('active');

  const packRow = document.getElementById('row-' + date);
  const detailTr = document.createElement('tr');
  detailTr.className = 'detail-row';
  detailTr.id = 'detail-' + key;
  detailTr.innerHTML = '<td colspan="6"><div class="detail-inner"><p class="loading">Loading…</p></div></td>';
  packRow.insertAdjacentElement('afterend', detailTr);

  if (!cache[date]) {
    try {
      const r = await fetch('/api/packs/' + date);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      cache[date] = await r.json();
    } catch (e) {
      detailTr.querySelector('.detail-inner').innerHTML =
        '<div class="err">Failed to load: ' + esc(e.message) + '</div>';
      return;
    }
  }

  const data  = cache[date];
  const items = data[game] ?? [];
  const names = { lede: 'Lede', spread: 'Spread', sof: 'Science or Fiction' };
  const inner = detailTr.querySelector('.detail-inner');

  inner.innerHTML =
    '<div class="detail-head">'
  + '<strong>' + names[game] + '</strong>'
  + '<span class="sep">|</span>'
  + '<span>' + items.length + ' item' + (items.length !== 1 ? 's' : '') + ' (day batch)</span>'
  + '<span class="sep">|</span>'
  + '<span>' + esc(date) + '</span>'
  + '</div>'
  + '<div class="items" id="items-' + key + '"></div>';

  const grid = document.getElementById('items-' + key);

  if (items.length === 0) {
    grid.innerHTML = '<p class="empty">No items.</p>';
    return;
  }

  if (game === 'lede') {
    for (const item of items) {
      const correct = (item.panelists ?? []).find(p => p.isCorrect);
      const decoys  = (item.panelists ?? []).filter(p => !p.isCorrect);
      grid.insertAdjacentHTML('beforeend',
        '<div class="card">'
      + '<div class="card-q">' + esc(item.partialHeadline) + ' <span style="font-size:11px;background:var(--lede);color:#000;padding:1px 5px;border-radius:3px;font-weight:700">___</span></div>'
      + '<div class="ans">' + esc(correct?.completion ?? '?') + '</div>'
      + '<div class="decoys">'
      + decoys.map(d => '<span class="decoy">' + esc(d.completion) + '</span>').join('')
      + '</div>'
      + (item.explanation ? '<div class="expl">' + esc(item.explanation) + '</div>' : '')
      + '<div class="src">'
      + '<span class="src-badge">' + esc(item.sourceHint ?? 'unknown source') + '</span>'
      + (item.eventDate ? '<span>' + esc(item.eventDate) + '</span>' : '')
      + '</div>'
      + '</div>'
      );
    }

  } else if (game === 'spread') {
    for (const item of items) {
      grid.insertAdjacentHTML('beforeend',
        '<div class="card">'
      + '<div class="card-q">' + esc(item.question) + '</div>'
      + '<div class="spread-val">' + esc(item.answer) + '<span class="spread-unit">' + esc(item.unit) + '</span></div>'
      + '<div class="spread-others">Decoys: ' + (item.others ?? []).map(n => n + ' ' + esc(item.unit)).join(', ') + '</div>'
      + (item.explanation ? '<div class="expl">' + esc(item.explanation) + '</div>' : '')
      + (item.sourceHint
          ? '<div class="src"><span class="src-badge">' + esc(item.sourceHint) + '</span>'
          + (item.eventDate ? '<span>' + esc(item.eventDate) + '</span>' : '')
          + '</div>'
          : '')
      + '</div>'
      );
    }

  } else if (game === 'sof') {
    for (const item of items) {
      const claimsHtml = (item.claims ?? []).map(c =>
        '<div class="claim">'
      + '<span class="claim-badge ' + (c.isScience ? 'sc' : 'fi') + '">' + (c.isScience ? 'Science' : 'Fiction') + '</span>'
      + '<div class="claim-body">'
      + '<div class="claim-text">' + esc(c.text) + '</div>'
      + (c.explanation ? '<div class="claim-expl">' + esc(c.explanation) + '</div>' : '')
      + (c.source
          ? '<div class="claim-src">→ <a href="' + esc(c.source.url) + '" target="_blank" rel="noopener">' + esc(c.source.name) + '</a></div>'
          : '')
      + '</div>'
      + '</div>'
      ).join('');

      grid.insertAdjacentHTML('beforeend',
        '<div class="card">'
      + '<div class="sof-topic">' + esc(item.topic) + '</div>'
      + (item.intro ? '<div class="sof-intro">' + esc(item.intro) + '</div>' : '')
      + claimsHtml
      + (item.eventDate ? '<div class="src" style="margin-top:8px"><span>' + esc(item.eventDate) + '</span></div>' : '')
      + '</div>'
      );
    }
  }
}

// Delegated click handler — avoids quoting issues with inline onclick
document.getElementById('body').addEventListener('click', function(e) {
  var pill = e.target.closest('.pill');
  if (!pill) return;
  toggle(pill.dataset.date, pill.dataset.game);
});

// Boot — fetch packs and weeks in parallel
function setStatus(msg, isErr) {
  var el = document.getElementById('status');
  el.style.display = msg ? 'block' : 'none';
  el.style.color = isErr ? '#ef4444' : '#eab308';
  el.textContent = msg;
}

(async () => {
  try {
    setStatus('Loading…');
    const [packsRes, weeksRes] = await Promise.all([
      fetch('/api/packs'),
      fetch('/api/weeks'),
    ]);
    if (!packsRes.ok) throw new Error('Packs API returned HTTP ' + packsRes.status);
    if (!weeksRes.ok) throw new Error('Weeks API returned HTTP ' + weeksRes.status);
    const packs = await packsRes.json();
    const weeks = await weeksRes.json();
    setStatus('');
    renderTable(packs, weeks);
  } catch (e) {
    console.error('[pipeline-ui] boot error:', e);
    setStatus('Error: ' + e.message, true);
    var b = document.getElementById('body');
    if (b) b.innerHTML = '<tr><td colspan="6"><div class="err" style="margin:16px">' + esc(e.message) + '</div></td></tr>';
  }
})();
</script>
</body>
</html>`;
