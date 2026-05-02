import { Router, Request, Response } from 'express'
import db from '../../db/client'

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

router.get('/testaments', (_req: Request, res: Response) => {
  const rows = SELECT_TESTAMENTS.all() as { weapon_id: string; boss_id: string; completed_at: string }[]
  res.json(rows)
})

router.post('/testaments', (req: Request, res: Response) => {
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

export default router
