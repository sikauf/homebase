import { Migration } from '../../db/migrations'

export const migrations: Migration[] = [
  {
    id: 'clean_days_v1',
    up: `CREATE TABLE IF NOT EXISTS clean_days (
      date  TEXT PRIMARY KEY,
      state TEXT NOT NULL DEFAULT 'clean'
    )`,
  },
  {
    // Backfill: legacy DBs created before clean_days had a state column.
    id: 'clean_days_add_state',
    up: (db) => {
      const cols = db.prepare("PRAGMA table_info(clean_days)").all() as { name: string }[]
      if (!cols.some((c) => c.name === 'state')) {
        db.exec("ALTER TABLE clean_days ADD COLUMN state TEXT NOT NULL DEFAULT 'clean'")
      }
    },
  },
]
