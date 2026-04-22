import { Router, Request, Response } from 'express'
import db from '../db/client'

const router = Router()

router.get('/days', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT date FROM clean_days ORDER BY date ASC').all() as { date: string }[]
  res.json(rows.map((r) => r.date))
})

router.post('/days', (req: Request, res: Response) => {
  const { date } = req.body
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date is required and must be YYYY-MM-DD' }); return
  }
  db.prepare('INSERT OR IGNORE INTO clean_days (date) VALUES (?)').run(date)
  res.status(201).json({ date })
})

router.delete('/days/:date', (req: Request, res: Response) => {
  const { date } = req.params
  const result = db.prepare('DELETE FROM clean_days WHERE date = ?').run(date)
  if (result.changes === 0) { res.status(404).json({ error: 'Date not found' }); return }
  res.status(204).end()
})

export default router
