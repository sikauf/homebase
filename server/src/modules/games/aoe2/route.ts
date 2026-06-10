import { Router, Request, Response } from 'express'
import db from '../../../db/client'
import { CAMPAIGNS, EXPANSIONS, missionList } from './campaigns'
import { readDetected } from './parse'

const router = Router()

const CAMPAIGN_BY_CODE = new Map(CAMPAIGNS.map((c) => [c.code, c]))

const SELECT_OVERRIDES = db.prepare(
  'SELECT campaign_id, mission_index, completed FROM aoe2_mission_overrides'
)
const UPSERT_OVERRIDE = db.prepare(
  `INSERT INTO aoe2_mission_overrides (campaign_id, mission_index, completed, updated_at)
   VALUES (?, ?, ?, datetime('now'))
   ON CONFLICT(campaign_id, mission_index)
   DO UPDATE SET completed = excluded.completed, updated_at = excluded.updated_at`
)
const DELETE_OVERRIDE = db.prepare(
  'DELETE FROM aoe2_mission_overrides WHERE campaign_id = ? AND mission_index = ?'
)

interface MissionDTO {
  index: number
  name: string
  completed: boolean
  detected: boolean
  overridden: boolean
}

// GET /api/games/aoe2/progress — expansions + campaigns with per-mission state.
router.get('/progress', (_req: Request, res: Response) => {
  const detected = readDetected()

  const overrides = new Map<string, boolean>()
  for (const row of SELECT_OVERRIDES.all() as {
    campaign_id: string
    mission_index: number
    completed: number
  }[]) {
    overrides.set(`${row.campaign_id}:${row.mission_index}`, row.completed === 1)
  }

  const campaigns = CAMPAIGNS.map((c) => {
    const names = missionList(c)
    // Campaigns are linear, so N detected completions == the first N missions.
    const detectedCount = Math.min(detected?.[c.code] ?? 0, names.length)

    const missions: MissionDTO[] = names.map((name, index) => {
      const isDetected = index < detectedCount
      const override = overrides.get(`${c.code}:${index}`)
      const completed = override ?? isDetected
      return { index, name, completed, detected: isDetected, overridden: override !== undefined }
    })

    return {
      code: c.code,
      name: c.name,
      expansion: c.expansion,
      completed: missions.filter((m) => m.completed).length,
      total: missions.length,
      missions,
    }
  })

  res.json({
    saveAvailable: detected !== null,
    expansions: EXPANSIONS,
    campaigns,
  })
})

function validate(req: Request, res: Response): { campaign: string; index: number } | null {
  const campaign = req.params.campaign
  const index = Number(req.params.index)
  const def = CAMPAIGN_BY_CODE.get(campaign)
  if (!def) {
    res.status(400).json({ error: `Unknown campaign: ${campaign}` })
    return null
  }
  if (!Number.isInteger(index) || index < 0 || index >= missionList(def).length) {
    res.status(400).json({ error: 'mission index out of range' })
    return null
  }
  return { campaign, index }
}

// POST /api/games/aoe2/missions/:campaign/:index  body: { completed: boolean }
router.post('/missions/:campaign/:index', (req: Request, res: Response) => {
  const ok = validate(req, res)
  if (!ok) return
  const completed = (req.body ?? {}).completed
  if (typeof completed !== 'boolean') {
    res.status(400).json({ error: 'completed (boolean) is required' })
    return
  }
  UPSERT_OVERRIDE.run(ok.campaign, ok.index, completed ? 1 : 0)
  res.status(201).json({ campaign: ok.campaign, index: ok.index, completed })
})

// DELETE /api/games/aoe2/missions/:campaign/:index — drop the override, reverting
// to whatever the save auto-detects.
router.delete('/missions/:campaign/:index', (req: Request, res: Response) => {
  const ok = validate(req, res)
  if (!ok) return
  DELETE_OVERRIDE.run(ok.campaign, ok.index)
  res.status(204).end()
})

export default router
