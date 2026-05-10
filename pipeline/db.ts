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
  `);
  return db;
}

export interface ContentPackRow {
  date: string;
  versionId: string;
  publishedAt: string;
  ledeCount: number;
  spreadCount: number;
  sofCount: number;
  ledeJson: string;
  spreadJson: string;
  sofJson: string;
}

export function writeContentPack(row: ContentPackRow): void {
  const db = openDb();
  db.prepare(`
    INSERT OR REPLACE INTO content_packs
      (date, version_id, published_at, lede_count, spread_count, sof_count, lede_json, spread_json, sof_json)
    VALUES
      (@date, @versionId, @publishedAt, @ledeCount, @spreadCount, @sofCount, @ledeJson, @spreadJson, @sofJson)
  `).run(row);
  db.close();
}

export function getContentPack(date: string): ContentPackRow | null {
  const db = openDb();
  const row = db.prepare(`
    SELECT date, version_id AS versionId, published_at AS publishedAt,
           lede_count AS ledeCount, spread_count AS spreadCount, sof_count AS sofCount,
           lede_json AS ledeJson, spread_json AS spreadJson, sof_json AS sofJson
    FROM content_packs WHERE date = ?
  `).get(date) as ContentPackRow | undefined;
  db.close();
  return row ?? null;
}

export function listContentPacks(): ContentPackMeta[] {
  const db = openDb();
  const rows = db.prepare(`
    SELECT date, version_id AS versionId, published_at AS publishedAt,
           lede_count AS ledeCount, spread_count AS spreadCount, sof_count AS sofCount
    FROM content_packs ORDER BY date DESC
  `).all() as ContentPackMeta[];
  db.close();
  return rows;
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
