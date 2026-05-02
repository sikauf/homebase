import { DatabaseSync } from 'node:sqlite'

export interface Migration {
  id: string
  up: string | ((db: DatabaseSync) => void)
}

export function runMigrations(db: DatabaseSync, migrations: Migration[]): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id         TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)

  const seen = new Set<string>()
  for (const m of migrations) {
    if (seen.has(m.id)) throw new Error(`Duplicate migration id: ${m.id}`)
    seen.add(m.id)
  }

  const isApplied = db.prepare(`SELECT 1 FROM _migrations WHERE id = ?`)
  const recordApplied = db.prepare(`INSERT INTO _migrations (id) VALUES (?)`)

  for (const m of migrations) {
    if (isApplied.get(m.id)) continue
    if (typeof m.up === 'string') {
      db.exec(m.up)
    } else {
      m.up(db)
    }
    recordApplied.run(m.id)
  }
}
