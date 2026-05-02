import { Migration } from '../../../db/migrations'

export const migrations: Migration[] = [
  {
    id: 'hades2_testaments_v1',
    up: `CREATE TABLE IF NOT EXISTS hades2_testaments (
      weapon_id    TEXT NOT NULL,
      boss_id      TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (weapon_id, boss_id)
    )`,
  },
]
