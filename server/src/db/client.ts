import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'

const rawPath = process.env.DB_PATH ?? path.resolve(__dirname, '../../../data/homebase.db')
const inMemory = rawPath === ':memory:'
const dbPath = inMemory ? ':memory:' : path.resolve(rawPath)

if (!inMemory) {
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const db = new DatabaseSync(dbPath)
if (!inMemory) {
  db.exec("PRAGMA journal_mode = WAL")
}

db.exec(`
  CREATE TABLE IF NOT EXISTS golf_rounds (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    course      TEXT NOT NULL,
    tees        TEXT,
    score       INTEGER,
    par         INTEGER DEFAULT 72,
    fairways    INTEGER,
    gir         INTEGER,
    putts       INTEGER,
    notes       TEXT,
    played_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clean_days (
    date TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS golf_range_days (
    date TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS fitness_workouts (
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    PRIMARY KEY (date, type)
  );

  CREATE TABLE IF NOT EXISTS book_accent_cache (
    cover_url  TEXT PRIMARY KEY,
    accent_rgb TEXT
  );

  CREATE TABLE IF NOT EXISTS hades2_testaments (
    weapon_id    TEXT NOT NULL,
    boss_id      TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (weapon_id, boss_id)
  );
`)

export default db
