import { Router, Request, Response } from 'express'
import db from '../../db/client'

const SELECT_ALL_ROUNDS = db.prepare('SELECT * FROM golf_rounds ORDER BY played_at DESC')
const SELECT_STATS_FULL = db.prepare(`SELECT
    COUNT(*) as total_rounds,
    MIN(score) as best_score,
    ROUND(AVG(score), 1) as avg_score,
    ROUND(AVG(putts), 1) as avg_putts,
    ROUND(AVG(gir), 1) as avg_gir,
    ROUND(AVG(birdies), 1) as avg_birdies
  FROM golf_rounds WHERE holes = 18`)
const SELECT_ROUND = db.prepare('SELECT * FROM golf_rounds WHERE id = ?')
const INSERT_ROUND = db.prepare(
  `INSERT INTO golf_rounds (course, tees, score, par, birdies, gir, putts, notes, played_at, holes)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
)
const DELETE_ROUND = db.prepare('DELETE FROM golf_rounds WHERE id = ?')

const VALID_RANGE_TYPES = new Set(['ball_striking', 'putting', 'chipping'])
const SELECT_ALL_RANGE_DAYS = db.prepare('SELECT date, type FROM golf_range_days ORDER BY date ASC, type ASC')
const INSERT_RANGE_DAY = db.prepare('INSERT OR IGNORE INTO golf_range_days (date, type) VALUES (?, ?)')
const DELETE_RANGE_DAY_TYPE = db.prepare('DELETE FROM golf_range_days WHERE date = ? AND type = ?')

const SELECT_ALL_TEE_TIMES = db.prepare('SELECT id, course, date FROM golf_tee_times ORDER BY date ASC, id ASC')
const SELECT_TEE_TIME = db.prepare('SELECT id, course, date FROM golf_tee_times WHERE id = ?')
const INSERT_TEE_TIME = db.prepare('INSERT INTO golf_tee_times (course, date) VALUES (?, ?)')
const DELETE_TEE_TIME = db.prepare('DELETE FROM golf_tee_times WHERE id = ?')

const SELECT_ALL_TRIPS = db.prepare('SELECT id, name, location, start_date, end_date, courses FROM golf_trips ORDER BY start_date DESC, id DESC')
const SELECT_TRIP = db.prepare('SELECT id, name, location, start_date, end_date, courses FROM golf_trips WHERE id = ?')
const INSERT_TRIP = db.prepare('INSERT INTO golf_trips (name, location, start_date, end_date, courses) VALUES (?, ?, ?, ?, ?)')
const DELETE_TRIP = db.prepare('DELETE FROM golf_trips WHERE id = ?')

interface TripRow {
  id: number
  name: string
  location: string | null
  start_date: string
  end_date: string
  courses: string
}

function shapeTrip(row: TripRow) {
  let parsed: string[] = []
  try {
    const v = JSON.parse(row.courses)
    if (Array.isArray(v)) parsed = v.filter((x): x is string => typeof x === 'string')
  } catch { /* fall through with empty array */ }
  return { ...row, courses: parsed }
}

const router = Router()

router.get('/rounds', (_req: Request, res: Response) => {
  res.json(SELECT_ALL_ROUNDS.all())
})

router.get('/stats', (_req: Request, res: Response) => {
  res.json(SELECT_STATS_FULL.get())
})

router.post('/rounds', (req: Request, res: Response) => {
  const { course, tees, score, par, birdies, gir, putts, notes, played_at, holes } = req.body as {
    course: string
    tees?: string
    score?: number
    par?: number
    birdies?: number
    gir?: number
    putts?: number
    notes?: string
    played_at?: string
    holes?: number
  }

  if (!course) {
    res.status(400).json({ error: 'course is required' })
    return
  }

  let holesValue = 18
  if (holes !== undefined && holes !== null) {
    if (!Number.isInteger(holes) || holes < 1 || holes > 18) {
      res.status(400).json({ error: 'holes must be an integer between 1 and 18' })
      return
    }
    holesValue = holes
  }
  const defaultPar = holesValue * 4

  const result = INSERT_ROUND.run(
    course,
    tees ?? null,
    score ?? null,
    par ?? defaultPar,
    birdies ?? null,
    gir ?? null,
    putts ?? null,
    notes ?? null,
    played_at ?? null,
    holesValue,
  )

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

  const allowed = ['course', 'tees', 'score', 'par', 'birdies', 'gir', 'putts', 'notes', 'played_at', 'holes']
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
  const rows = SELECT_ALL_RANGE_DAYS.all() as { date: string; type: string }[]
  const grouped = new Map<string, string[]>()
  for (const r of rows) {
    const arr = grouped.get(r.date) ?? []
    arr.push(r.type)
    grouped.set(r.date, arr)
  }
  res.json(Array.from(grouped, ([date, types]) => ({ date, types })))
})

router.post('/range-days', (req: Request, res: Response) => {
  const { date, type } = req.body as { date?: string; type?: string }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date is required and must be YYYY-MM-DD' }); return
  }
  if (!type || !VALID_RANGE_TYPES.has(type)) {
    res.status(400).json({ error: 'type is required and must be one of ball_striking, putting, chipping' }); return
  }
  INSERT_RANGE_DAY.run(date, type)
  res.status(201).json({ date, type })
})

router.delete('/range-days/:date/:type', (req: Request, res: Response) => {
  const { date, type } = req.params
  if (!VALID_RANGE_TYPES.has(type)) {
    res.status(400).json({ error: 'invalid type' }); return
  }
  const result = DELETE_RANGE_DAY_TYPE.run(date, type)
  if (result.changes === 0) { res.status(404).json({ error: 'Entry not found' }); return }
  res.status(204).end()
})

router.get('/tee-times', (_req: Request, res: Response) => {
  res.json(SELECT_ALL_TEE_TIMES.all())
})

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

router.post('/tee-times', (req: Request, res: Response) => {
  const { course, date } = req.body as { course?: string; date?: string }
  const trimmed = course?.trim()
  if (!trimmed) { res.status(400).json({ error: 'course is required' }); return }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date is required and must be YYYY-MM-DD' }); return
  }
  if (date < todayIso()) {
    res.status(400).json({ error: 'date cannot be in the past' }); return
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

router.get('/trips', (_req: Request, res: Response) => {
  const rows = SELECT_ALL_TRIPS.all() as unknown as TripRow[]
  res.json(rows.map(shapeTrip))
})

router.post('/trips', (req: Request, res: Response) => {
  const { name, location, start_date, end_date, courses } = req.body as {
    name?: string
    location?: string
    start_date?: string
    end_date?: string
    courses?: unknown
  }
  const trimmedName = name?.trim()
  if (!trimmedName) { res.status(400).json({ error: 'name is required' }); return }
  if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    res.status(400).json({ error: 'start_date is required and must be YYYY-MM-DD' }); return
  }
  if (!end_date || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    res.status(400).json({ error: 'end_date is required and must be YYYY-MM-DD' }); return
  }
  if (end_date < start_date) {
    res.status(400).json({ error: 'end_date cannot be before start_date' }); return
  }
  const courseList = Array.isArray(courses) ? courses.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim()) : []
  const result = INSERT_TRIP.run(trimmedName, location?.trim() || null, start_date, end_date, JSON.stringify(courseList))
  const row = SELECT_TRIP.get(result.lastInsertRowid) as unknown as TripRow
  res.status(201).json(shapeTrip(row))
})

router.delete('/trips/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const result = DELETE_TRIP.run(id)
  if (result.changes === 0) { res.status(404).json({ error: 'Trip not found' }); return }
  res.status(204).end()
})

export default router
