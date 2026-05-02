import { Migration } from '../../db/migrations'

export const migrations: Migration[] = [
  {
    id: 'book_accent_cache_v1',
    up: `CREATE TABLE IF NOT EXISTS book_accent_cache (
      cover_url  TEXT PRIMARY KEY,
      accent_rgb TEXT
    )`,
  },
]
