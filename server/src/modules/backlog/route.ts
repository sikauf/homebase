import { Request, Response } from 'express'
import db from '../../db/client'
import { defineCrud } from '../../shared/crud'

const VALID_STATUSES = new Set(['open', 'done'])

const SELECT_ITEM = db.prepare('SELECT * FROM backlog_items WHERE id = ?')
const NEXT_TOP_POSITION = db.prepare(
  'SELECT COALESCE(MIN(position), 0) - 1 AS pos FROM backlog_items'
)
const INSERT_ITEM = db.prepare(
  'INSERT INTO backlog_items (text, section, tab, position) VALUES (?, ?, ?, ?)'
)
const UPDATE_STATUS = db.prepare(
  `UPDATE backlog_items
   SET status = ?, completed_at = CASE WHEN ? = 'done' THEN datetime('now') ELSE NULL END
   WHERE id = ?`
)
const UPDATE_POSITION = db.prepare('UPDATE backlog_items SET position = ? WHERE id = ?')

const router = defineCrud({
  db,
  table: 'backlog_items',
  list: { route: '/items', orderBy: 'position ASC, id DESC' },
  remove: {
    route: '/items/:id',
    keys: ['id'],
    notFoundError: 'Item not found',
  },
})

router.post('/items', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { text?: unknown; section?: unknown; tab?: unknown }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) {
    res.status(400).json({ error: 'text is required' })
    return
  }
  const section = typeof body.section === 'string' && body.section ? body.section : null
  const tab = typeof body.tab === 'string' && body.tab ? body.tab : null
  const { pos } = NEXT_TOP_POSITION.get() as { pos: number }
  const result = INSERT_ITEM.run(text, section, tab, pos)
  res.status(201).json(SELECT_ITEM.get(result.lastInsertRowid as number))
})

router.patch('/items/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { status } = req.body as { status?: string }
  if (!status || !VALID_STATUSES.has(status)) {
    res.status(400).json({ error: `status must be one of: ${[...VALID_STATUSES].join(', ')}` })
    return
  }
  const existing = SELECT_ITEM.get(id)
  if (!existing) { res.status(404).json({ error: 'Item not found' }); return }
  UPDATE_STATUS.run(status, status, id)
  res.json(SELECT_ITEM.get(id))
})

router.post('/items/reorder', (req: Request, res: Response) => {
  const ids = (req.body as { ids?: unknown })?.ids
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => Number.isInteger(v))) {
    res.status(400).json({ error: 'ids must be a non-empty array of integers' })
    return
  }
  const numericIds = ids as number[]
  const placeholders = numericIds.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT id, position FROM backlog_items WHERE id IN (${placeholders})`)
    .all(...numericIds) as { id: number; position: number }[]
  if (rows.length !== numericIds.length) {
    res.status(400).json({ error: 'one or more ids not found' })
    return
  }
  const sortedPositions = rows.map((r) => r.position).sort((a, b) => a - b)
  db.exec('BEGIN')
  try {
    for (let i = 0; i < numericIds.length; i++) {
      UPDATE_POSITION.run(sortedPositions[i], numericIds[i])
    }
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  res.status(204).end()
})

export default router
