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

function parseAccomplished(raw: string):
  | { ok: true; accomplished: Record<CharacterId, string[]> }
  | { ok: false; status: number; error: string } {
  const match = raw.match(/uAchievementUnlocked=([0-9 ]+)/)
  if (!match) return { ok: false, status: 500, error: 'No achievement data in save file' }
  const flags = match[1].trim().split(/\s+/)

  const accomplished: Record<CharacterId, string[]> = { shovel: [], plague: [], specter: [], king: [] }
  for (const [idx, entry] of Object.entries(ACCOMPLISHED_MAP)) {
    if (flags[Number(idx)] === '1') accomplished[entry.c].push(entry.f)
  }
  return { ok: true, accomplished }
}

const SELECT_SNAPSHOT = db.prepare('SELECT payload, updated_at FROM shovelknight_save_snapshot WHERE id = 1')
const UPSERT_SNAPSHOT = db.prepare(`INSERT INTO shovelknight_save_snapshot (id, payload, updated_at) VALUES (1, ?, ?)
  ON CONFLICT (id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`)

// Live save file when SHOVEL_KNIGHT_SAVE_PATH is set (running on the Mac);
// otherwise the last snapshot pushed via POST /save (running remotely).
function readAccomplished():
  | { ok: true; accomplished: Record<CharacterId, string[]>; syncedAt: string | null }
  | { ok: false; status: number; error: string } {
  const savePath = process.env.SHOVEL_KNIGHT_SAVE_PATH
  if (savePath) {
    let raw: string
    try {
      raw = fs.readFileSync(savePath, 'utf-8')
    } catch {
      return { ok: false, status: 503, error: 'Could not read Shovel Knight save file' }
    }
    const parsed = parseAccomplished(raw)
    return parsed.ok ? { ...parsed, syncedAt: null } : parsed
  }

  const row = SELECT_SNAPSHOT.get() as { payload: string; updated_at: string } | undefined
  if (!row) return { ok: false, status: 503, error: 'Shovel Knight save not configured and no snapshot pushed' }
  const parsed = parseAccomplished(row.payload)
  return parsed.ok ? { ...parsed, syncedAt: row.updated_at } : parsed
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
  if (result.syncedAt) res.setHeader('X-Save-Synced-At', result.syncedAt)
  res.json(result.accomplished)
})

// Snapshot push from the Mac (scripts/push-saves.mjs): raw save file, base64.
router.post('/save', (req: Request, res: Response) => {
  const { data } = (req.body ?? {}) as { data?: unknown }
  if (typeof data !== 'string' || !data) {
    res.status(400).json({ error: 'data (base64 save file) is required' })
    return
  }
  const raw = Buffer.from(data, 'base64').toString('utf-8')
  const parsed = parseAccomplished(raw)
  if (!parsed.ok) {
    res.status(400).json({ error: 'Not a valid Shovel Knight save file' })
    return
  }
  UPSERT_SNAPSHOT.run(raw, new Date().toISOString())
  res.status(201).json({ ok: true })
})

export default router
