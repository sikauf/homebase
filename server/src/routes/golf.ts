import { Router, Request, Response } from 'express'
import db from '../db/client'

const router = Router()

router.get('/rounds', (_req: Request, res: Response) => {
  const rounds = db.prepare('SELECT * FROM golf_rounds ORDER BY played_at DESC').all()
  res.json(rounds)
})

router.get('/stats', (_req: Request, res: Response) => {
  const stats = db.prepare(
    `SELECT
      COUNT(*) as total_rounds,
      MIN(score) as best_score,
      ROUND(AVG(score), 1) as avg_score,
      ROUND(AVG(putts), 1) as avg_putts,
      ROUND(AVG(gir), 1) as avg_gir,
      ROUND(AVG(fairways), 1) as avg_fairways
    FROM golf_rounds`
  ).get()
  res.json(stats)
})

router.post('/rounds', (req: Request, res: Response) => {
  const { course, tees, score, par, fairways, gir, putts, notes, played_at } = req.body as {
    course: string
    tees?: string
    score?: number
    par?: number
    fairways?: number
    gir?: number
    putts?: number
    notes?: string
    played_at?: string
  }

  if (!course) {
    res.status(400).json({ error: 'course is required' })
    return
  }

  const result = db.prepare(
    `INSERT INTO golf_rounds (course, tees, score, par, fairways, gir, putts, notes, played_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(course, tees ?? null, score ?? null, par ?? 72, fairways ?? null, gir ?? null, putts ?? null, notes ?? null, played_at ?? null)

  const round = db.prepare('SELECT * FROM golf_rounds WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(round)
})

router.patch('/rounds/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM golf_rounds WHERE id = ?').get(id)

  if (!existing) {
    res.status(404).json({ error: 'Round not found' })
    return
  }

  const allowed = ['course', 'tees', 'score', 'par', 'fairways', 'gir', 'putts', 'notes', 'played_at']
  const body = req.body as Record<string, unknown>
  const keys = Object.keys(body).filter((k) => allowed.includes(k))

  if (keys.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' })
    return
  }

  const setClause = keys.map((k) => `${k} = ?`).join(', ')
  const values = keys.map((k) => body[k]) as (string | number | null | bigint | Uint8Array)[]

  db.prepare(`UPDATE golf_rounds SET ${setClause} WHERE id = ?`).run(...values, id)
  const round = db.prepare('SELECT * FROM golf_rounds WHERE id = ?').get(id)
  res.json(round)
})

router.delete('/rounds/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const result = db.prepare('DELETE FROM golf_rounds WHERE id = ?').run(id)
  if (result.changes === 0) {
    res.status(404).json({ error: 'Round not found' })
    return
  }
  res.status(204).send()
})

export default router
