import { Router, Request, Response } from 'express'
import db from '../db/client'

const SELECT_ALL = db.prepare('SELECT date, state FROM clean_days ORDER BY date ASC')
const UPSERT = db.prepare(
  'INSERT INTO clean_days (date, state) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET state = excluded.state'
)
const DELETE = db.prepare('DELETE FROM clean_days WHERE date = ?')

const VALID_STATES = new Set(['clean', 'gold'])

const router = Router()

router.get('/days', (_req: Request, res: Response) => {
  const rows = SELECT_ALL.all() as { date: string; state: string }[]
  res.json(rows)
})

router.post('/days', (req: Request, res: Response) => {
  const { date, state } = req.body
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date is required and must be YYYY-MM-DD' }); return
  }
  const finalState = state ?? 'clean'
  if (!VALID_STATES.has(finalState)) {
    res.status(400).json({ error: 'state must be "clean" or "gold"' }); return
  }
  UPSERT.run(date, finalState)
  res.status(201).json({ date, state: finalState })
})

router.delete('/days/:date', (req: Request, res: Response) => {
  const { date } = req.params
  const result = DELETE.run(date)
  if (result.changes === 0) { res.status(404).json({ error: 'Date not found' }); return }
  res.status(204).end()
})

export default router
