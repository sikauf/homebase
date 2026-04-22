import { Router, Request, Response } from 'express'
import db from '../db/client'

const VALID_TYPES = new Set(['core', 'cardio', 'legs', 'shoulders', 'triceps', 'biceps', 'chest', 'back'])

const router = Router()

router.get('/workouts', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT date, type FROM fitness_workouts ORDER BY date ASC').all() as { date: string; type: string }[]
  res.json(rows)
})

router.post('/workouts', (req: Request, res: Response) => {
  const { date, type } = req.body
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date is required and must be YYYY-MM-DD' }); return
  }
  if (!type || !VALID_TYPES.has(type)) {
    res.status(400).json({ error: `type must be one of: ${[...VALID_TYPES].join(', ')}` }); return
  }
  db.prepare('INSERT OR IGNORE INTO fitness_workouts (date, type) VALUES (?, ?)').run(date, type)
  res.status(201).json({ date, type })
})

router.delete('/workouts/:date/:type', (req: Request, res: Response) => {
  const { date, type } = req.params
  const result = db.prepare('DELETE FROM fitness_workouts WHERE date = ? AND type = ?').run(date, type)
  if (result.changes === 0) { res.status(404).json({ error: 'Workout not found' }); return }
  res.status(204).end()
})

export default router
