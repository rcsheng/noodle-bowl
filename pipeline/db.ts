import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import type { ContentPackMeta } from '../packages/shared/contentTypes';

const DB_PATH = path.join(__dirname, 'data', 'history.db');

function openDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_packs (
      date         TEXT PRIMARY KEY,
      version_id   TEXT NOT NULL,
      published_at TEXT NOT NULL,
      lede_count   INTEGER NOT NULL,
      spread_count INTEGER NOT NULL,
      sof_count    INTEGER NOT NULL,
      lede_json    TEXT NOT NULL,
      spread_json  TEXT NOT NULL,
      sof_json     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      date    TEXT    NOT NULL,
      stage   TEXT    NOT NULL,
      ran_at  TEXT    NOT NULL,
      status  TEXT    NOT NULL,
      summary TEXT
    );

    CREATE TABLE IF NOT EXISTS content_weeks (
      week_id          TEXT PRIMARY KEY,
      lede_total       INTEGER NOT NULL DEFAULT 0,
      spread_total     INTEGER NOT NULL DEFAULT 0,
      sof_total        INTEGER NOT NULL DEFAULT 0,
      published_dates  TEXT NOT NULL DEFAULT '[]',
      updated_at       TEXT NOT NULL
    );
  `);

  // Migrate content_packs: add net-new and force-republish tracking columns
  // (ALTER TABLE ADD COLUMN fails silently via try/catch when already present)
  const existingCols = (db.pragma('table_info(content_packs)') as Array<{ name: string }>)
    .map(c => c.name);
  const migrations: Record<string, string> = {
    net_new_lede:   'ALTER TABLE content_packs ADD COLUMN net_new_lede   INTEGER',
    net_new_spread: 'ALTER TABLE content_packs ADD COLUMN net_new_spread INTEGER',
    net_new_sof:    'ALTER TABLE content_packs ADD COLUMN net_new_sof    INTEGER',
    is_force:       'ALTER TABLE content_packs ADD COLUMN is_force       INTEGER NOT NULL DEFAULT 0',
    republish_count:'ALTER TABLE content_packs ADD COLUMN republish_count INTEGER NOT NULL DEFAULT 0',
  };
  for (const [col, sql] of Object.entries(migrations)) {
    if (!existingCols.includes(col)) db.exec(sql);
  }

  return db;
}

export interface ContentPackRow {
  date: string;
  weekId: string;
  publishedAt: string;
  ledeCount: number;
  spreadCount: number;
  sofCount: number;
  ledeJson: string;
  spreadJson: string;
  sofJson: string;
  /** Net-new questions this publish added to the Firestore week bank (null for pre-migration rows) */
  netNewLede?: number | null;
  netNewSpread?: number | null;
  netNewSof?: number | null;
  /** True if this was a --force re-publish of an already-published date */
  isForce?: boolean;
  /** How many times this date has been published (1 = first publish, 2+ = re-published) */
  republishCount?: number;
}

export function writeContentPack(row: ContentPackRow): void {
  const db = openDb();
  // Increment republish_count if row already exists
  const existing = db.prepare('SELECT republish_count FROM content_packs WHERE date = ?').get(row.date) as
    | { republish_count: number } | undefined;
  const republishCount = existing ? (existing.republish_count ?? 0) + 1 : 1;

  db.prepare(`
    INSERT OR REPLACE INTO content_packs
      (date, version_id, published_at, lede_count, spread_count, sof_count,
       lede_json, spread_json, sof_json,
       net_new_lede, net_new_spread, net_new_sof, is_force, republish_count)
    VALUES
      (@date, @weekId, @publishedAt, @ledeCount, @spreadCount, @sofCount,
       @ledeJson, @spreadJson, @sofJson,
       @netNewLede, @netNewSpread, @netNewSof, @isForce, @republishCount)
  `).run({
    date:           row.date,
    weekId:         row.weekId,
    publishedAt:    row.publishedAt,
    ledeCount:      row.ledeCount,
    spreadCount:    row.spreadCount,
    sofCount:       row.sofCount,
    ledeJson:       row.ledeJson,
    spreadJson:     row.spreadJson,
    sofJson:        row.sofJson,
    netNewLede:     row.netNewLede ?? null,
    netNewSpread:   row.netNewSpread ?? null,
    netNewSof:      row.netNewSof ?? null,
    isForce:        row.isForce ? 1 : 0,
    republishCount,
  });
  db.close();
}

export function getContentPack(date: string): ContentPackRow | null {
  const db = openDb();
  const row = db.prepare(`
    SELECT date, version_id AS weekId, published_at AS publishedAt,
           lede_count AS ledeCount, spread_count AS spreadCount, sof_count AS sofCount,
           lede_json AS ledeJson, spread_json AS spreadJson, sof_json AS sofJson,
           net_new_lede AS netNewLede, net_new_spread AS netNewSpread, net_new_sof AS netNewSof,
           is_force AS isForce, republish_count AS republishCount
    FROM content_packs WHERE date = ?
  `).get(date) as ContentPackRow | undefined;
  db.close();
  return row ?? null;
}

export function listContentPacks(): ContentPackMeta[] {
  const db = openDb();
  const rows = db.prepare(`
    SELECT date, version_id AS weekId, published_at AS publishedAt,
           lede_count AS ledeCount, spread_count AS spreadCount, sof_count AS sofCount
    FROM content_packs ORDER BY date DESC
  `).all() as ContentPackMeta[];
  db.close();
  return rows;
}

export interface ContentWeekRow {
  weekId: string;
  ledeTotal: number;
  spreadTotal: number;
  sofTotal: number;
  publishedDates: string[];
  updatedAt: string;
}

export function writeContentWeek(row: ContentWeekRow): void {
  const db = openDb();
  db.prepare(`
    INSERT OR REPLACE INTO content_weeks
      (week_id, lede_total, spread_total, sof_total, published_dates, updated_at)
    VALUES
      (@weekId, @ledeTotal, @spreadTotal, @sofTotal, @publishedDates, @updatedAt)
  `).run({
    weekId:         row.weekId,
    ledeTotal:      row.ledeTotal,
    spreadTotal:    row.spreadTotal,
    sofTotal:       row.sofTotal,
    publishedDates: JSON.stringify(row.publishedDates),
    updatedAt:      row.updatedAt,
  });
  db.close();
}

export function listContentWeeks(): ContentWeekRow[] {
  const db = openDb();
  const rows = db.prepare(`
    SELECT week_id AS weekId,
           lede_total AS ledeTotal, spread_total AS spreadTotal, sof_total AS sofTotal,
           published_dates AS publishedDatesJson, updated_at AS updatedAt
    FROM content_weeks ORDER BY week_id DESC
  `).all() as Array<Omit<ContentWeekRow, 'publishedDates'> & { publishedDatesJson: string }>;
  db.close();
  return rows.map(r => ({ ...r, publishedDates: JSON.parse(r.publishedDatesJson) as string[] }));
}

/**
 * Returns all real (isScience: true) SoF claim texts from past published dates,
 * excluding the given date. Used to build a decoy pool for SoF generation.
 */
export function loadSofRealClaims(excludeDate: string): Array<{ text: string; topic: string }> {
  const db = openDb();
  const rows = db.prepare(
    `SELECT sof_json FROM content_packs WHERE date != ? AND sof_json != '[]'`
  ).all(excludeDate) as Array<{ sof_json: string }>;
  db.close();

  const pool: Array<{ text: string; topic: string }> = [];
  for (const row of rows) {
    try {
      const items = JSON.parse(row.sof_json) as Array<{
        topic: string;
        claims: Array<{ text: string; isScience: boolean }>;
      }>;
      for (const item of items) {
        const real = item.claims.find(c => c.isScience);
        if (real?.text) pool.push({ text: real.text, topic: item.topic ?? '' });
      }
    } catch { /* skip malformed rows */ }
  }
  return pool;
}

export function writePipelineRun(
  date: string,
  stage: string,
  status: 'ok' | 'error',
  summary?: string,
): void {
  const db = openDb();
  db.prepare(`
    INSERT INTO pipeline_runs (date, stage, ran_at, status, summary)
    VALUES (?, ?, ?, ?, ?)
  `).run(date, stage, new Date().toISOString(), status, summary ?? null);
  db.close();
}
