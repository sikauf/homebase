import { Router, Request, Response } from 'express'
import fs from 'fs'
import db from '../db/client'

const router = Router()

const HADES2_WEAPONS = new Set([
  'witch_staff', 'sister_blades', 'umbral_flames',
  'moonstone_axe', 'argent_skull', 'black_coat',
])

const HADES2_BOSSES = new Set([
  'hecate', 'scylla', 'cerberus', 'chronos',
  'polyphemus', 'eris', 'prometheus', 'typhon',
])

const SELECT_TESTAMENTS = db.prepare(
  'SELECT weapon_id, boss_id, completed_at FROM hades2_testaments ORDER BY completed_at ASC'
)
const INSERT_TESTAMENT = db.prepare(
  'INSERT OR IGNORE INTO hades2_testaments (weapon_id, boss_id) VALUES (?, ?)'
)

router.get('/hades2/testaments', (_req: Request, res: Response) => {
  const rows = SELECT_TESTAMENTS.all() as { weapon_id: string; boss_id: string; completed_at: string }[]
  res.json(rows)
})

router.post('/hades2/testaments', (req: Request, res: Response) => {
  const { weapon_id, boss_id } = req.body ?? {}
  if (!weapon_id || !HADES2_WEAPONS.has(weapon_id)) {
    res.status(400).json({ error: `weapon_id must be one of: ${[...HADES2_WEAPONS].join(', ')}` }); return
  }
  if (!boss_id || !HADES2_BOSSES.has(boss_id)) {
    res.status(400).json({ error: `boss_id must be one of: ${[...HADES2_BOSSES].join(', ')}` }); return
  }
  INSERT_TESTAMENT.run(weapon_id, boss_id)
  res.status(201).json({ weapon_id, boss_id })
})

const CHARACTER_NAMES: Record<string, string> = {
  'CHARACTER.IRONCLAD': 'Ironclad',
  'CHARACTER.SILENT': 'Silent',
  'CHARACTER.DEFECT': 'Defect',
  'CHARACTER.REGENT': 'Regent',
  'CHARACTER.NECROBINDER': 'Necrobinder',
}

router.get('/sts2/ascensions', (_req: Request, res: Response) => {
  const savePath = process.env.STS2_SAVE_PATH
  if (!savePath) {
    res.status(503).json({ error: 'STS2_SAVE_PATH not configured' })
    return
  }

  let raw: string
  try {
    raw = fs.readFileSync(savePath, 'utf-8')
  } catch {
    res.status(503).json({ error: 'Could not read STS2 save file' })
    return
  }

  let data: { character_stats?: { id: string; max_ascension: number; preferred_ascension: number; total_wins?: number; total_losses?: number }[] }
  try {
    data = JSON.parse(raw)
  } catch {
    res.status(500).json({ error: 'Failed to parse STS2 save file' })
    return
  }

  const characters = (data.character_stats ?? [])
    .filter((c) => c.id in CHARACTER_NAMES)
    .map((c) => ({
      id: c.id,
      name: CHARACTER_NAMES[c.id],
      max_ascension: c.max_ascension,
      preferred_ascension: c.preferred_ascension,
      total_wins: c.total_wins ?? 0,
      total_losses: c.total_losses ?? 0,
    }))

  res.json(characters)
})

export default router
