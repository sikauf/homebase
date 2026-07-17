import { Router, Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import db from '../../db/client'
import { requireCouple, getRole } from '../../shared/auth'

// The Callie section is private to Sam + Callie: every method (reads
// included) needs one of their sessions. Rows record which of them wrote it.

const RECURRENCES = new Set(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

// server/assets/callie — resolves from both src (tsx) and dist (tsc output).
const PHOTOS_DIR = path.resolve(__dirname, '../../../assets/callie')
const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const router = Router()
router.use(requireCouple)

const addedBy = (req: Request) => getRole(req) ?? 'sam'

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

// --- Moods ---

router.get('/moods', (_req: Request, res: Response) => {
  const rows = db
    .prepare('SELECT * FROM callie_moods ORDER BY created_at DESC, id DESC LIMIT 300')
    .all()
  res.json(rows)
})

router.post('/moods', (req: Request, res: Response) => {
  const { mood } = req.body ?? {}
  if (typeof mood !== 'string' || mood.trim() === '' || mood.length > 60) {
    res.status(400).json({ error: 'mood is required' })
    return
  }
  const note = optionalText((req.body ?? {}).note) ?? null
  const result = db
    .prepare('INSERT INTO callie_moods (mood, note, added_by, created_at) VALUES (?, ?, ?, ?)')
    .run(mood.trim(), note, addedBy(req), new Date().toISOString())
  const row = db.prepare('SELECT * FROM callie_moods WHERE id = ?').get(result.lastInsertRowid as number)
  res.status(201).json(row)
})

router.delete('/moods/:id', (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM callie_moods WHERE id = ?').run(Number(req.params.id))
  if (result.changes === 0) {
    res.status(404).json({ error: 'Mood not found' })
    return
  }
  res.status(204).end()
})

// --- Events (individual + recurring; the client expands recurrences) ---

function validateEventFields(body: Record<string, unknown>, partial: boolean): string | null {
  const { title, date, time, recurrence, until } = body
  if (!partial || title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '' || title.length > 120) return 'title is required'
  }
  if (!partial || date !== undefined) {
    if (typeof date !== 'string' || !DATE_RE.test(date)) return 'date must be YYYY-MM-DD'
  }
  if (time !== undefined && time !== null && time !== '' && (typeof time !== 'string' || !TIME_RE.test(time))) {
    return 'time must be HH:MM'
  }
  if (recurrence !== undefined && (typeof recurrence !== 'string' || !RECURRENCES.has(recurrence))) {
    return `recurrence must be one of: ${[...RECURRENCES].join(', ')}`
  }
  if (until !== undefined && until !== null && until !== '' && (typeof until !== 'string' || !DATE_RE.test(until))) {
    return 'until must be YYYY-MM-DD'
  }
  return null
}

router.get('/events', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM callie_events ORDER BY date ASC, time ASC, id ASC').all()
  res.json(rows)
})

router.post('/events', (req: Request, res: Response) => {
  const body = req.body ?? {}
  const error = validateEventFields(body, false)
  if (error) {
    res.status(400).json({ error })
    return
  }
  const result = db
    .prepare(
      `INSERT INTO callie_events (title, date, time, recurrence, until, notes, added_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      (body.title as string).trim(),
      body.date as string,
      optionalText(body.time) ?? null,
      (body.recurrence as string | undefined) ?? 'none',
      optionalText(body.until) ?? null,
      optionalText(body.notes) ?? null,
      addedBy(req),
      new Date().toISOString()
    )
  const row = db.prepare('SELECT * FROM callie_events WHERE id = ?').get(result.lastInsertRowid as number)
  res.status(201).json(row)
})

router.patch('/events/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM callie_events WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!existing) {
    res.status(404).json({ error: 'Event not found' })
    return
  }
  const body = req.body ?? {}
  const error = validateEventFields(body, true)
  if (error) {
    res.status(400).json({ error })
    return
  }
  const next = {
    title: body.title !== undefined ? (body.title as string).trim() : existing.title,
    date: body.date !== undefined ? body.date : existing.date,
    time: body.time !== undefined ? optionalText(body.time) ?? null : existing.time,
    recurrence: body.recurrence !== undefined ? body.recurrence : existing.recurrence,
    until: body.until !== undefined ? optionalText(body.until) ?? null : existing.until,
    notes: body.notes !== undefined ? optionalText(body.notes) ?? null : existing.notes,
  }
  db.prepare(
    'UPDATE callie_events SET title = ?, date = ?, time = ?, recurrence = ?, until = ?, notes = ? WHERE id = ?'
  ).run(
    next.title as string,
    next.date as string,
    next.time as string | null,
    next.recurrence as string,
    next.until as string | null,
    next.notes as string | null,
    id
  )
  res.json(db.prepare('SELECT * FROM callie_events WHERE id = ?').get(id))
})

router.delete('/events/:id', (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM callie_events WHERE id = ?').run(Number(req.params.id))
  if (result.changes === 0) {
    res.status(404).json({ error: 'Event not found' })
    return
  }
  res.status(204).end()
})

// --- Photos (private: served through the auth gate, not client/public) ---
// Two sources: the seeded files in server/assets/callie (baked into the
// image) and uploads stored as DB blobs (named upload-<id>.<ext>).

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_PHOTO_BYTES = 1_500_000

const uploadName = (id: number | bigint, mime: string) => `upload-${id}.${MIME_EXT[mime]}`

router.get('/photos', (_req: Request, res: Response) => {
  let names: string[] = []
  try {
    names = fs
      .readdirSync(PHOTOS_DIR)
      .filter((n) => PHOTO_EXTENSIONS.has(path.extname(n).toLowerCase()))
      .sort()
  } catch {
    // Directory missing (e.g. tests) — an empty gallery, not an error.
  }
  const seeds = names.map((name) => ({ name, url: `/api/callie/photos/${name}` }))
  const uploads = (
    db.prepare('SELECT id, mime, added_by FROM callie_photos ORDER BY id ASC').all() as {
      id: number
      mime: string
      added_by: string
    }[]
  ).map((row) => {
    const name = uploadName(row.id, row.mime)
    return { name, url: `/api/callie/photos/${name}`, added_by: row.added_by }
  })
  res.json([...seeds, ...uploads])
})

router.post('/photos', (req: Request, res: Response) => {
  const { mime, data } = req.body ?? {}
  if (typeof mime !== 'string' || !(mime in MIME_EXT)) {
    res.status(400).json({ error: `mime must be one of: ${Object.keys(MIME_EXT).join(', ')}` })
    return
  }
  if (typeof data !== 'string' || data === '') {
    res.status(400).json({ error: 'data (base64) is required' })
    return
  }
  const bytes = Buffer.from(data, 'base64')
  if (bytes.length === 0) {
    res.status(400).json({ error: 'data is not valid base64' })
    return
  }
  if (bytes.length > MAX_PHOTO_BYTES) {
    res.status(413).json({ error: 'Photo too large — resize before uploading' })
    return
  }
  const result = db
    .prepare('INSERT INTO callie_photos (mime, data, added_by, created_at) VALUES (?, ?, ?, ?)')
    .run(mime, bytes, addedBy(req), new Date().toISOString())
  const name = uploadName(result.lastInsertRowid as number, mime)
  res.status(201).json({ name, url: `/api/callie/photos/${name}`, added_by: addedBy(req) })
})

router.get('/photos/:name', (req: Request, res: Response) => {
  const name = req.params.name
  const upload = name.match(/^upload-(\d+)\.\w+$/)
  if (upload) {
    const row = db.prepare('SELECT mime, data FROM callie_photos WHERE id = ?').get(Number(upload[1])) as
      | { mime: string; data: Uint8Array }
      | undefined
    if (!row) {
      res.status(404).json({ error: 'Photo not found' })
      return
    }
    res.set('Content-Type', row.mime).set('Cache-Control', 'private, max-age=604800').send(Buffer.from(row.data))
    return
  }
  if (!/^[\w][\w.-]*$/.test(name) || !PHOTO_EXTENSIONS.has(path.extname(name).toLowerCase())) {
    res.status(400).json({ error: 'Bad photo name' })
    return
  }
  res.sendFile(path.join(PHOTOS_DIR, name), { maxAge: '7d' }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Photo not found' })
  })
})

export default router
