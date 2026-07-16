import { Router, Request, Response } from 'express'
import fs from 'fs'
import db from '../../../db/client'

const router = Router()

const CHARACTER_NAMES: Record<string, string> = {
  'CHARACTER.IRONCLAD': 'Ironclad',
  'CHARACTER.SILENT': 'Silent',
  'CHARACTER.DEFECT': 'Defect',
  'CHARACTER.REGENT': 'Regent',
  'CHARACTER.NECROBINDER': 'Necrobinder',
}

const SELECT_A10 = db.prepare('SELECT character_id FROM sts2_a10_completed')
const INSERT_A10 = db.prepare('INSERT OR IGNORE INTO sts2_a10_completed (character_id) VALUES (?)')
const DELETE_A10 = db.prepare('DELETE FROM sts2_a10_completed WHERE character_id = ?')

interface CharacterStat {
  id: string
  max_ascension: number
  preferred_ascension: number
  total_wins?: number
  total_losses?: number
}

function parseSave(raw: string): { ok: true; characters: CharacterStat[] } | { ok: false; status: number; error: string } {
  try {
    const data = JSON.parse(raw) as { character_stats?: CharacterStat[] }
    return { ok: true, characters: data.character_stats ?? [] }
  } catch {
    return { ok: false, status: 500, error: 'Failed to parse STS2 save file' }
  }
}

const SELECT_SNAPSHOT = db.prepare('SELECT payload, updated_at FROM sts2_save_snapshot WHERE id = 1')
const UPSERT_SNAPSHOT = db.prepare(`INSERT INTO sts2_save_snapshot (id, payload, updated_at) VALUES (1, ?, ?)
  ON CONFLICT (id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`)

// Live save file when STS2_SAVE_PATH is set (running on the Mac); otherwise
// the last snapshot pushed via POST /save (running remotely).
function readSave():
  | { ok: true; characters: CharacterStat[]; syncedAt: string | null }
  | { ok: false; status: number; error: string } {
  const savePath = process.env.STS2_SAVE_PATH
  if (savePath) {
    let raw: string
    try {
      raw = fs.readFileSync(savePath, 'utf-8')
    } catch {
      return { ok: false, status: 503, error: 'Could not read STS2 save file' }
    }
    const parsed = parseSave(raw)
    return parsed.ok ? { ...parsed, syncedAt: null } : parsed
  }

  const row = SELECT_SNAPSHOT.get() as { payload: string; updated_at: string } | undefined
  if (!row) return { ok: false, status: 503, error: 'STS2 save not configured and no snapshot pushed' }
  const parsed = parseSave(row.payload)
  return parsed.ok ? { ...parsed, syncedAt: row.updated_at } : parsed
}

router.get('/ascensions', (_req: Request, res: Response) => {
  const result = readSave()
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  if (result.syncedAt) res.setHeader('X-Save-Synced-At', result.syncedAt)

  const markedRows = SELECT_A10.all() as { character_id: string }[]
  const marked = new Set(markedRows.map((r) => r.character_id))

  const characters = result.characters
    .filter((c) => c.id in CHARACTER_NAMES)
    .map((c) => ({
      id: c.id,
      name: CHARACTER_NAMES[c.id],
      max_ascension: c.max_ascension,
      preferred_ascension: c.preferred_ascension,
      total_wins: c.total_wins ?? 0,
      total_losses: c.total_losses ?? 0,
      a10_completed: c.max_ascension >= 11 || marked.has(c.id),
    }))

  res.json(characters)
})

router.post('/a10/:character_id', (req: Request, res: Response) => {
  const { character_id } = req.params
  if (!(character_id in CHARACTER_NAMES)) {
    res.status(400).json({ error: 'Unknown character' })
    return
  }

  const result = readSave()
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  const character = result.characters.find((c) => c.id === character_id)
  if (!character || character.max_ascension < 10) {
    res.status(400).json({ error: 'Character has not reached A10' })
    return
  }

  INSERT_A10.run(character_id)
  res.status(201).json({ character_id, a10_completed: true })
})

// Snapshot push from the Mac (scripts/push-saves.mjs): raw save file, base64.
router.post('/save', (req: Request, res: Response) => {
  const { data } = (req.body ?? {}) as { data?: unknown }
  if (typeof data !== 'string' || !data) {
    res.status(400).json({ error: 'data (base64 save file) is required' })
    return
  }
  const raw = Buffer.from(data, 'base64').toString('utf-8')
  const parsed = parseSave(raw)
  if (!parsed.ok) {
    res.status(400).json({ error: 'Not a valid STS2 save file' })
    return
  }
  UPSERT_SNAPSHOT.run(raw, new Date().toISOString())
  res.status(201).json({ ok: true, characters: parsed.characters.length })
})

router.delete('/a10/:character_id', (req: Request, res: Response) => {
  const { character_id } = req.params
  if (!(character_id in CHARACTER_NAMES)) {
    res.status(400).json({ error: 'Unknown character' })
    return
  }
  DELETE_A10.run(character_id)
  res.status(204).end()
})

export default router
