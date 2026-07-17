import { Migration } from '../../db/migrations'

export const migrations: Migration[] = [
  {
    id: 'callie_moods_v1',
    up: `CREATE TABLE IF NOT EXISTS callie_moods (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      mood       TEXT NOT NULL,
      note       TEXT,
      added_by   TEXT NOT NULL DEFAULT 'sam',
      created_at TEXT NOT NULL
    )`,
  },
  {
    // Uploaded photos live in the DB (not server/assets) so they survive
    // redeploys: the assets dir is baked into the Docker image, the DB is on
    // the persistent volume.
    id: 'callie_photos_v1',
    up: `CREATE TABLE IF NOT EXISTS callie_photos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      mime       TEXT NOT NULL,
      data       BLOB NOT NULL,
      added_by   TEXT NOT NULL DEFAULT 'sam',
      created_at TEXT NOT NULL
    )`,
  },
  {
    id: 'callie_events_v1',
    up: `CREATE TABLE IF NOT EXISTS callie_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      date       TEXT NOT NULL,
      time       TEXT,
      recurrence TEXT NOT NULL DEFAULT 'none',
      until      TEXT,
      notes      TEXT,
      added_by   TEXT NOT NULL DEFAULT 'sam',
      created_at TEXT NOT NULL
    )`,
  },
]
