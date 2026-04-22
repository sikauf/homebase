import db from './client'

export function initSchema() {
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
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS clean_days (
      date TEXT PRIMARY KEY
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS fitness_workouts (
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      PRIMARY KEY (date, type)
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS book_accent_cache (
      cover_url  TEXT PRIMARY KEY,
      accent_rgb TEXT
    );
  `)
}

