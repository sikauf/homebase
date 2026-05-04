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

function readSave(): { ok: true; characters: CharacterStat[] } | { ok: false; status: number; error: string } {
  const savePath = process.env.STS2_SAVE_PATH
  if (!savePath) return { ok: false, status: 503, error: 'STS2_SAVE_PATH not configured' }

  let raw: string
  try {
    raw = fs.readFileSync(savePath, 'utf-8')
  } catch {
    return { ok: false, status: 503, error: 'Could not read STS2 save file' }
  }

  try {
    const data = JSON.parse(raw) as { character_stats?: CharacterStat[] }
    return { ok: true, characters: data.character_stats ?? [] }
  } catch {
    return { ok: false, status: 500, error: 'Failed to parse STS2 save file' }
  }
}

router.get('/ascensions', (_req: Request, res: Response) => {
  const result = readSave()
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }

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
