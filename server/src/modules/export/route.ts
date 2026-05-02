import { Router, Request, Response } from 'express'
import db from '../../db/client'

const EXPORT_VERSION = 1

const SELECT_USER_TABLES = db.prepare(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
)
const SELECT_LAST_EXPORT = db.prepare("SELECT value FROM meta WHERE key = 'last_export_at'")
const UPSERT_LAST_EXPORT = db.prepare(
  "INSERT INTO meta (key, value) VALUES ('last_export_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
)

function buildExport() {
  const tableNames = (SELECT_USER_TABLES.all() as { name: string }[]).map((r) => r.name)
  const tables: Record<string, unknown[]> = {}
  for (const name of tableNames) {
    const rows = db.prepare(`SELECT * FROM "${name}"`).all()
    tables[name] = rows
  }
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  }
}

function filenameFor(isoTimestamp: string): string {
  // 2026-05-01T14:22:09.123Z -> homebase-export-2026-05-01T14-22-09.json
  const safe = isoTimestamp.replace(/\.\d+Z$/, '').replace(/:/g, '-')
  return `homebase-export-${safe}.json`
}

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const payload = buildExport()
  UPSERT_LAST_EXPORT.run(payload.exportedAt)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="${filenameFor(payload.exportedAt)}"`)
  res.send(JSON.stringify(payload, null, 2))
})

router.get('/last', (_req: Request, res: Response) => {
  const row = SELECT_LAST_EXPORT.get() as { value: string } | undefined
  res.json({ lastExportedAt: row?.value ?? null })
})

export default router
