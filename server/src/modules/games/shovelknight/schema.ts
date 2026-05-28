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
]
