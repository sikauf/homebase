import { Router, Request, Response } from 'express'
import fs from 'fs'
import db from '../../../db/client'
import accomplishedMap from './accomplishedMap.json'

const router = Router()

const CHARACTERS = ['shovel', 'plague', 'specter', 'king'] as const
type CharacterId = (typeof CHARACTERS)[number]
const CHARACTER_SET = new Set<string>(CHARACTERS)

// index in the save's `uAchievementUnlocked` array -> { character, feat } it represents.
const ACCOMPLISHED_MAP = accomplishedMap as Record<string, { c: CharacterId; f: string }>

function readAccomplished():
  | { ok: true; accomplished: Record<CharacterId, string[]> }
  | { ok: false; status: number; error: string } {
  const savePath = process.env.SHOVEL_KNIGHT_SAVE_PATH
  if (!savePath) return { ok: false, status: 503, error: 'SHOVEL_KNIGHT_SAVE_PATH not configured' }

  let raw: string
  try {
    raw = fs.readFileSync(savePath, 'utf-8')
  } catch {
    return { ok: false, status: 503, error: 'Could not read Shovel Knight save file' }
  }

  const match = raw.match(/uAchievementUnlocked=([0-9 ]+)/)
  if (!match) return { ok: false, status: 500, error: 'No achievement data in save file' }
  const flags = match[1].trim().split(/\s+/)

  const accomplished: Record<CharacterId, string[]> = { shovel: [], plague: [], specter: [], king: [] }
  for (const [idx, entry] of Object.entries(ACCOMPLISHED_MAP)) {
    if (flags[Number(idx)] === '1') accomplished[entry.c].push(entry.f)
  }
  return { ok: true, accomplished }
}

const SELECT_FEATS = db.prepare(
  'SELECT character_id, feat_id, completed_at FROM shovelknight_feats ORDER BY completed_at ASC'
)
const INSERT_FEAT = db.prepare(
  'INSERT OR IGNORE INTO shovelknight_feats (character_id, feat_id) VALUES (?, ?)'
)

function validate(req: Request, res: Response): { character_id: string; feat_id: string } | null {
  const { character_id, feat_id } = req.body ?? {}
  if (!character_id || !CHARACTER_SET.has(character_id)) {
    res.status(400).json({ error: `character_id must be one of: ${CHARACTERS.join(', ')}` })
    return null
  }
  if (!feat_id || typeof feat_id !== 'string') {
    res.status(400).json({ error: 'feat_id is required and must be a string' })
    return null
  }
  return { character_id, feat_id }
}

router.get('/feats', (_req: Request, res: Response) => {
  const rows = SELECT_FEATS.all() as { character_id: string; feat_id: string; completed_at: string }[]
  res.json(rows)
})

router.post('/feats', (req: Request, res: Response) => {
  const v = validate(req, res)
  if (!v) return
  INSERT_FEAT.run(v.character_id, v.feat_id)
  res.status(201).json(v)
})

// Feats actually accomplished in-game, read from the Steam Cloud save. These are
// "unclaimed" until the user manually claims them via POST /feats.
router.get('/accomplished', (_req: Request, res: Response) => {
  const result = readAccomplished()
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.json(result.accomplished)
})

export default router
