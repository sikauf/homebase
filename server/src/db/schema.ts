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

  const row = db.prepare('SELECT COUNT(*) as n FROM golf_rounds').get() as { n: number }
  if (row.n === 0) {
    const insert = db.prepare(`
      INSERT INTO golf_rounds (course, tees, score, par, fairways, gir, putts, notes, played_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    insert.run('Pebble Beach Golf Links', 'White', 88, 72, 8, 6, 32,
      'Windy conditions, but great views on 18.', '2026-03-15 10:00:00')
    insert.run('Torrey Pines (South)', 'Blue', 91, 72, 6, 4, 35,
      'Tough course. Need to work on approach shots.', '2026-03-08 08:30:00')
    insert.run('Riviera Country Club', 'White', 84, 71, 10, 9, 29,
      'Best round in a while. Putts were falling.', '2026-03-01 09:15:00')
  }
}
