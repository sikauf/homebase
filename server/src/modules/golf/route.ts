import { Router, Request, Response } from 'express'
import db from '../../db/client'

const SELECT_ALL_ROUNDS = db.prepare('SELECT * FROM golf_rounds ORDER BY played_at DESC')
const SELECT_STATS = db.prepare(
  `SELECT
    COUNT(*) as total_rounds,
    MIN(score) as best_score,
    ROUND(AVG(score), 1) as avg_score,
    ROUND(AVG(putts), 1) as avg_putts,
    ROUND(AVG(gir), 1) as avg_gir,
    ROUND(AVG(fairways), 1) as avg_fairways
  FROM golf_rounds`
)
const SELECT_ROUND = db.prepare('SELECT * FROM golf_rounds WHERE id = ?')
const INSERT_ROUND = db.prepare(
  `INSERT INTO golf_rounds (course, tees, score, par, fairways, gir, putts, notes, played_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
)
const DELETE_ROUND = db.prepare('DELETE FROM golf_rounds WHERE id = ?')

const SELECT_ALL_RANGE_DAYS = db.prepare('SELECT date FROM golf_range_days ORDER BY date ASC')
const INSERT_RANGE_DAY = db.prepare('INSERT OR IGNORE INTO golf_range_days (date) VALUES (?)')
const DELETE_RANGE_DAY = db.prepare('DELETE FROM golf_range_days WHERE date = ?')

const SELECT_ALL_TEE_TIMES = db.prepare('SELECT id, course, date FROM golf_tee_times ORDER BY date ASC, id ASC')
const SELECT_TEE_TIME = db.prepare('SELECT id, course, date FROM golf_tee_times WHERE id = ?')
const INSERT_TEE_TIME = db.prepare('INSERT INTO golf_tee_times (course, date) VALUES (?, ?)')
const DELETE_TEE_TIME = db.prepare('DELETE FROM golf_tee_times WHERE id = ?')

const router = Router()

router.get('/rounds', (_req: Request, res: Response) => {
  res.json(SELECT_ALL_ROUNDS.all())
})

router.get('/stats', (_req: Request, res: Response) => {
  res.json(SELECT_STATS.get())
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

  const result = INSERT_ROUND.run(course, tees ?? null, score ?? null, par ?? 72, fairways ?? null, gir ?? null, putts ?? null, notes ?? null, played_at ?? null)

  const round = SELECT_ROUND.get(result.lastInsertRowid)
  res.status(201).json(round)
})

router.patch('/rounds/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = SELECT_ROUND.get(id)

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
  const round = SELECT_ROUND.get(id)
  res.json(round)
})

router.delete('/rounds/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const result = DELETE_ROUND.run(id)
  if (result.changes === 0) {
    res.status(404).json({ error: 'Round not found' })
    return
  }
  res.status(204).send()
})

router.get('/range-days', (_req: Request, res: Response) => {
  const rows = SELECT_ALL_RANGE_DAYS.all() as { date: string }[]
  res.json(rows.map((r) => r.date))
})

router.post('/range-days', (req: Request, res: Response) => {
  const { date } = req.body
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date is required and must be YYYY-MM-DD' }); return
  }
  INSERT_RANGE_DAY.run(date)
  res.status(201).json({ date })
})

router.delete('/range-days/:date', (req: Request, res: Response) => {
  const { date } = req.params
  const result = DELETE_RANGE_DAY.run(date)
  if (result.changes === 0) { res.status(404).json({ error: 'Date not found' }); return }
  res.status(204).end()
})

router.get('/tee-times', (_req: Request, res: Response) => {
  res.json(SELECT_ALL_TEE_TIMES.all())
})

router.post('/tee-times', (req: Request, res: Response) => {
  const { course, date } = req.body as { course?: string; date?: string }
  const trimmed = course?.trim()
  if (!trimmed) { res.status(400).json({ error: 'course is required' }); return }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date is required and must be YYYY-MM-DD' }); return
  }
  const result = INSERT_TEE_TIME.run(trimmed, date)
  res.status(201).json(SELECT_TEE_TIME.get(result.lastInsertRowid))
})

router.delete('/tee-times/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const result = DELETE_TEE_TIME.run(id)
  if (result.changes === 0) { res.status(404).json({ error: 'Tee time not found' }); return }
  res.status(204).end()
})

export default router
