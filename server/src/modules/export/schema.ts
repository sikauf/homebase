import { Migration } from '../../db/migrations'

export const migrations: Migration[] = [
  {
    id: 'meta_v1',
    up: `CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    )`,
  },
]
