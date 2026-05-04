import { Migration } from '../../../db/migrations'

export const migrations: Migration[] = [
  {
    id: 'sts2_a10_completed_v1',
    up: `CREATE TABLE IF NOT EXISTS sts2_a10_completed (
      character_id TEXT PRIMARY KEY,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
]
