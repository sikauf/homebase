import { Router, Request, Response } from 'express'
import db from '../db/client'

const SELECT_ALL = db.prepare('SELECT date FROM clean_days ORDER BY date ASC')
const INSERT = db.prepare('INSERT OR IGNORE INTO clean_days (date) VALUES (?)')
const DELETE = db.prepare('DELETE FROM clean_days WHERE date = ?')

const router = Router()

router.get('/days', (_req: Request, res: Response) => {
  const rows = SELECT_ALL.all() as { date: string }[]
  res.json(rows.map((r) => r.date))
})

router.post('/days', (req: Request, res: Response) => {
  const { date } = req.body
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date is required and must be YYYY-MM-DD' }); return
  }
  INSERT.run(date)
  res.status(201).json({ date })
})

router.delete('/days/:date', (req: Request, res: Response) => {
  const { date } = req.params
  const result = DELETE.run(date)
  if (result.changes === 0) { res.status(404).json({ error: 'Date not found' }); return }
  res.status(204).end()
})

export default router
