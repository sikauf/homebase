import { Migration } from '../../../db/migrations'

export const migrations: Migration[] = [
  {
    id: 'shovelknight_feats_v1',
    up: `CREATE TABLE IF NOT EXISTS shovelknight_feats (
      character_id TEXT NOT NULL,
      feat_id      TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (character_id, feat_id)
    )`,
  },
  {
    id: 'shovelknight_save_snapshot_v1',
    up: `CREATE TABLE IF NOT EXISTS shovelknight_save_snapshot (
      id         INTEGER PRIMARY KEY CHECK (id = 1),
      payload    TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  },
]
