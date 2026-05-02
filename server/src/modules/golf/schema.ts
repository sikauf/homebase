import { Migration } from '../../db/migrations'

export const migrations: Migration[] = [
  {
    id: 'golf_rounds_v1',
    up: `CREATE TABLE IF NOT EXISTS golf_rounds (
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
    )`,
  },
  {
    id: 'golf_range_days_v1',
    up: `CREATE TABLE IF NOT EXISTS golf_range_days (
      date TEXT PRIMARY KEY
    )`,
  },
  {
    id: 'golf_tee_times_v1',
    up: `CREATE TABLE IF NOT EXISTS golf_tee_times (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      course TEXT NOT NULL,
      date   TEXT NOT NULL
    )`,
  },
]
