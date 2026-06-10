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
  {
    id: 'golf_rounds_holes_v1',
    up: `ALTER TABLE golf_rounds ADD COLUMN holes INTEGER NOT NULL DEFAULT 18`,
  },
  {
    id: 'golf_range_days_types_v1',
    up: (db) => {
      db.exec(`CREATE TABLE golf_range_days_new (
        date TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'ball_striking',
        PRIMARY KEY (date, type)
      )`)
      db.exec(`INSERT INTO golf_range_days_new (date, type)
        SELECT date, 'ball_striking' FROM golf_range_days`)
      db.exec(`DROP TABLE golf_range_days`)
      db.exec(`ALTER TABLE golf_range_days_new RENAME TO golf_range_days`)
    },
  },
  {
    id: 'golf_rounds_birdies_v1',
    up: (db) => {
      db.exec(`ALTER TABLE golf_rounds ADD COLUMN birdies INTEGER`)
      db.exec(`ALTER TABLE golf_rounds DROP COLUMN fairways`)
    },
  },
  {
    id: 'golf_trips_v1',
    up: (db) => {
      db.exec(`CREATE TABLE IF NOT EXISTS golf_trips (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL,
        location   TEXT,
        start_date TEXT NOT NULL,
        end_date   TEXT NOT NULL,
        courses    TEXT NOT NULL DEFAULT '[]'
      )`)
      const existing = db.prepare(`SELECT id FROM golf_trips WHERE name = ? AND start_date = ?`).get('Myrtle Beach', '2026-04-15')
      if (!existing) {
        db.prepare(
          `INSERT INTO golf_trips (name, location, start_date, end_date, courses) VALUES (?, ?, ?, ?, ?)`
        ).run('Myrtle Beach', 'South Carolina', '2026-04-15', '2026-04-17', JSON.stringify(['South Creek', 'Glen Dornoch', "Man O' War"]))
      }
    },
  },
]
