import { Migration } from '../../../db/migrations'

export const migrations: Migration[] = [
  {
    // Per-mission manual overrides. A row means the user has explicitly set a
    // mission's completed state, taking precedence over save auto-detection.
    id: 'aoe2_mission_overrides_v1',
    up: `CREATE TABLE IF NOT EXISTS aoe2_mission_overrides (
      campaign_id   TEXT NOT NULL,
      mission_index INTEGER NOT NULL,
      completed     INTEGER NOT NULL,
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (campaign_id, mission_index)
    )`,
  },
]
