import { Request, Response } from 'express'
import db from '../../db/client'
import { defineCrud, stringField } from '../../shared/crud'

const VALID_STATUSES = new Set(['open', 'done'])

const SELECT_ITEM = db.prepare('SELECT * FROM backlog_items WHERE id = ?')
const UPDATE_STATUS = db.prepare(
  `UPDATE backlog_items
   SET status = ?, completed_at = CASE WHEN ? = 'done' THEN datetime('now') ELSE NULL END
   WHERE id = ?`
)

const router = defineCrud({
  db,
  table: 'backlog_items',
  list: { route: '/items', orderBy: 'created_at DESC' },
  create: {
    route: '/items',
    fields: {
      text: stringField('text is required', { trim: true }),
      section: {},
      tab: {},
    },
    returns: 'row',
  },
  remove: {
    route: '/items/:id',
    keys: ['id'],
    notFoundError: 'Item not found',
  },
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

export default router
