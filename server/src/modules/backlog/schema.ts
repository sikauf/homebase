import { Migration } from '../../db/migrations'

export const migrations: Migration[] = [
  {
    id: 'backlog_items_v1',
    up: `CREATE TABLE IF NOT EXISTS backlog_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      text         TEXT NOT NULL,
      section      TEXT,
      tab          TEXT,
      status       TEXT NOT NULL DEFAULT 'open',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )`,
  },
  {
    id: 'backlog_items_position',
    up: `
      ALTER TABLE backlog_items ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
      UPDATE backlog_items SET position = -id;
    `,
  },
]
