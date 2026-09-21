import { Router, Request, Response } from 'express'
import db from '../../../db/client'
import {
  parseSave,
  graveMons,
  speciesList,
  InvalidSaveError,
  LEVEL_CAPS,
  type ParsedSave,
  type Mon,
} from './save'

const router = Router()

const OUTCOMES = new Set(['fled', 'fainted', 'dupe'])
const RUN_STATUSES = new Set(['lost', 'won'])

interface RunRow {
  id: number
  number: number
  trainer_id: number
  secret_id: number
  trainer_name: string
  status: string
  started_at: string
  ended_at: string | null
  death_fight_id: number | null
  post_mortem: string | null
}

interface SnapshotRow {
  id: number
  run_id: number
  uploaded_at: string
  parsed: string
  badges: number
  playtime_seconds: number
  money: number
  save_counter: number
}

interface DeathRow {
  id: number
  run_id: number
  pid: number
  species: number
  nickname: string | null
  level: number | null
  met_location: string | null
  fight_id: number | null
  note: string | null
  recorded_at: string
}

const FIND_RUN = db.prepare('SELECT * FROM renplat_run WHERE trainer_id = ? AND secret_id = ?')
const GET_RUN = db.prepare('SELECT * FROM renplat_run WHERE id = ?')
const LIST_RUNS = db.prepare('SELECT * FROM renplat_run ORDER BY number DESC')
const NEXT_RUN_NUMBER = db.prepare('SELECT COALESCE(MAX(number), 0) + 1 AS n FROM renplat_run')
const INSERT_RUN = db.prepare(
  `INSERT INTO renplat_run (number, trainer_id, secret_id, trainer_name) VALUES (?, ?, ?, ?)`,
)
const END_RUN = db.prepare(
  `UPDATE renplat_run SET status = ?, ended_at = datetime('now'), death_fight_id = ?, post_mortem = ? WHERE id = ?`,
)
const REOPEN_RUN = db.prepare(
  `UPDATE renplat_run SET status = 'active', ended_at = NULL, death_fight_id = NULL, post_mortem = NULL WHERE id = ?`,
)

const INSERT_SNAPSHOT = db.prepare(
  `INSERT INTO renplat_snapshot (run_id, raw, parsed, badges, playtime_seconds, money, save_counter)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
)
// Furthest progress, not newest upload: playtime only ever climbs, so this
// keeps the dashboard on the real state of the run even if an older backup gets
// uploaded afterwards. Earlier snapshots stay available in `history`.
const LATEST_SNAPSHOT = db.prepare(
  `SELECT * FROM renplat_snapshot WHERE run_id = ?
   ORDER BY playtime_seconds DESC, uploaded_at DESC, id DESC LIMIT 1`,
)
const MOST_RECENT_RUN_ID = db.prepare(
  'SELECT run_id FROM renplat_snapshot ORDER BY uploaded_at DESC, id DESC LIMIT 1',
)
const SNAPSHOT_HISTORY = db.prepare(
  `SELECT id, uploaded_at, badges, playtime_seconds, money FROM renplat_snapshot
   WHERE run_id = ? ORDER BY uploaded_at ASC, id ASC`,
)

const LIST_DEATHS = db.prepare('SELECT * FROM renplat_death WHERE run_id = ? ORDER BY recorded_at ASC, id ASC')
const INSERT_DEATH = db.prepare(
  `INSERT INTO renplat_death (run_id, pid, species, nickname, level, met_location, fight_id, note)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT (run_id, pid) DO UPDATE SET fight_id = excluded.fight_id, note = excluded.note`,
)
const UPDATE_DEATH = db.prepare('UPDATE renplat_death SET fight_id = ?, note = ? WHERE id = ?')
const DELETE_DEATH = db.prepare('DELETE FROM renplat_death WHERE id = ?')
const DEATH_COUNTS_BY_FIGHT = db.prepare(
  `SELECT fight_id, COUNT(*) AS kills FROM renplat_death WHERE fight_id IS NOT NULL GROUP BY fight_id`,
)
const DEATH_COUNT_BY_RUN = db.prepare(
  'SELECT run_id, COUNT(*) AS deaths FROM renplat_death GROUP BY run_id',
)

const LIST_FIGHTS = db.prepare('SELECT * FROM renplat_fight ORDER BY sort_order ASC, id ASC')
const MAX_FIGHT_ORDER = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 10 AS n FROM renplat_fight')
const INSERT_FIGHT = db.prepare(
  `INSERT INTO renplat_fight (key, name, location, badge_index, sort_order, danger, threat_note)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
)
const UPDATE_FIGHT = db.prepare(
  'UPDATE renplat_fight SET danger = ?, threat_note = ?, location = ?, name = ? WHERE id = ?',
)
const GET_FIGHT = db.prepare('SELECT * FROM renplat_fight WHERE id = ?')
const DELETE_FIGHT = db.prepare('DELETE FROM renplat_fight WHERE id = ?')

const LIST_CLEARED = db.prepare('SELECT fight_id FROM renplat_fight_cleared WHERE run_id = ?')
const MARK_CLEARED = db.prepare(
  'INSERT OR IGNORE INTO renplat_fight_cleared (run_id, fight_id) VALUES (?, ?)',
)
const UNMARK_CLEARED = db.prepare(
  'DELETE FROM renplat_fight_cleared WHERE run_id = ? AND fight_id = ?',
)

interface FightRow extends Record<string, unknown> {
  id: number
  badge_award: number | null
  sort_order: number
}

/**
 * A fight counts as cleared when it's ticked off for this run, or when a gym you
 * already hold the badge for sits at or after it in the order — beating a gym
 * means everything leading up to it is behind you, so the whole run of fights
 * before it clears at once rather than needing a tap each.
 */
function decorateFights(runId: number | undefined, badges: number) {
  const kills = new Map(
    (DEATH_COUNTS_BY_FIGHT.all() as { fight_id: number; kills: number }[]).map((r) => [r.fight_id, r.kills]),
  )
  const ticked = new Set(
    runId === undefined
      ? []
      : (LIST_CLEARED.all(runId) as { fight_id: number }[]).map((r) => r.fight_id),
  )
  const fights = LIST_FIGHTS.all() as unknown as FightRow[]

  // The furthest point the badge count proves you've reached.
  const clearedThrough = fights.reduce(
    (max, f) => (f.badge_award !== null && badges >= f.badge_award ? Math.max(max, f.sort_order) : max),
    -1,
  )

  return fights.map((f) => {
    const byBadge = f.sort_order <= clearedThrough
    return {
      ...f,
      kills: kills.get(f.id) ?? 0,
      cleared: ticked.has(f.id) || byBadge,
      /** True when the badge count settles it, so the UI can't offer to un-tick. */
      clearedByBadge: byBadge,
    }
  })
}

const LIST_LOSSES = db.prepare(
  'SELECT * FROM renplat_encounter_loss WHERE run_id = ? ORDER BY created_at DESC, id DESC',
)
const INSERT_LOSS = db.prepare(
  'INSERT INTO renplat_encounter_loss (run_id, location, species, outcome, note) VALUES (?, ?, ?, ?, ?)',
)
const DELETE_LOSS = db.prepare('DELETE FROM renplat_encounter_loss WHERE id = ?')

/** Runs are identified by the save's trainer ID pair — a fresh file is a new run. */
function runForSave(save: ParsedSave): { run: RunRow; created: boolean } {
  const existing = FIND_RUN.get(save.trainerId, save.secretId) as RunRow | undefined
  if (existing) return { run: existing, created: false }
  const { n } = NEXT_RUN_NUMBER.get() as { n: number }
  const result = INSERT_RUN.run(n, save.trainerId, save.secretId, save.trainerName)
  return { run: GET_RUN.get(result.lastInsertRowid) as unknown as RunRow, created: true }
}

/** Grave-box mons with no death row yet — the "confirm this death" queue. */
function pendingDeaths(save: ParsedSave, runId: number): Mon[] {
  const recorded = new Set((LIST_DEATHS.all(runId) as unknown as DeathRow[]).map((d) => d.pid))
  return graveMons(save).filter((m) => !recorded.has(m.pid))
}

router.get('/state', (req: Request, res: Response) => {
  const runParam = req.query.run
  const runId = runParam
    ? Number(runParam)
    : (MOST_RECENT_RUN_ID.get() as { run_id: number } | undefined)?.run_id
  const snapshot = (runId === undefined ? undefined : LATEST_SNAPSHOT.get(runId)) as SnapshotRow | undefined

  const deathsByRun = new Map(
    (DEATH_COUNT_BY_RUN.all() as { run_id: number; deaths: number }[]).map((r) => [r.run_id, r.deaths]),
  )
  const runs = (LIST_RUNS.all() as unknown as RunRow[]).map((r) => ({ ...r, deaths: deathsByRun.get(r.id) ?? 0 }))
  const fights = decorateFights(runId, snapshot?.badges ?? 0)

  if (!snapshot) {
    res.json({ run: null, snapshot: null, save: null, party: [], grave: [], pending: [], fights, runs, encounters: null, levelCaps: LEVEL_CAPS })
    return
  }

  const run = GET_RUN.get(snapshot.run_id) as unknown as RunRow
  const save = JSON.parse(snapshot.parsed) as ParsedSave
  const deaths = LIST_DEATHS.all(run.id) as unknown as DeathRow[]
  const deathByPid = new Map(deaths.map((d) => [d.pid, d]))

  // Every mon caught this run, grouped by where it was met — the free half of
  // encounter tracking. The Grave box is excluded so it reads as "encounters
  // that produced a living mon"; losses are logged by hand.
  const graveIds = new Set(graveMons(save).map((m) => m.pid))
  const caught = [...save.party, ...save.boxes.flatMap((b) => b.mons)].filter((m) => !graveIds.has(m.pid))
  const byLocation = new Map<string, Mon[]>()
  for (const mon of caught) {
    const list = byLocation.get(mon.metLocation) ?? []
    list.push(mon)
    byLocation.set(mon.metLocation, list)
  }

  res.setHeader('X-Save-Synced-At', snapshot.uploaded_at)
  res.json({
    run: { ...run, deaths: deaths.length },
    snapshot: { id: snapshot.id, uploaded_at: snapshot.uploaded_at, save_counter: snapshot.save_counter },
    save: {
      trainerName: save.trainerName,
      trainerId: save.trainerId,
      secretId: save.secretId,
      gender: save.gender,
      money: save.money,
      badges: save.badges,
      levelCap: save.levelCap,
      playtime: save.playtime,
    },
    party: save.party,
    boxes: save.boxes.filter((b) => b.mons.length > 0),
    grave: graveMons(save).map((m) => ({ ...m, death: deathByPid.get(m.pid) ?? null })),
    pending: pendingDeaths(save, run.id),
    deaths,
    encounters: {
      byLocation: [...byLocation.entries()]
        .map(([location, mons]) => ({ location, mons }))
        .sort((a, b) => a.location.localeCompare(b.location)),
      losses: LIST_LOSSES.all(run.id),
    },
    history: SNAPSHOT_HISTORY.all(run.id),
    fights,
    runs,
    levelCaps: LEVEL_CAPS,
  })
})

// Save upload: raw .sav, base64. Creates run #N+1 when the trainer ID pair is new.
router.post('/save', (req: Request, res: Response) => {
  const { data } = (req.body ?? {}) as { data?: unknown }
  if (typeof data !== 'string' || !data) {
    res.status(400).json({ error: 'data (base64 .sav file) is required' })
    return
  }

  const raw = Buffer.from(data, 'base64')
  let save: ParsedSave
  try {
    save = parseSave(raw)
  } catch (err) {
    if (err instanceof InvalidSaveError) {
      res.status(400).json({ error: err.message })
      return
    }
    throw err
  }

  const { run, created } = runForSave(save)
  const result = INSERT_SNAPSHOT.run(
    run.id,
    raw,
    JSON.stringify(save),
    save.badges,
    save.playtime.total,
    save.money,
    save.saveCounter,
  )

  res.status(201).json({
    snapshotId: Number(result.lastInsertRowid),
    run: { ...run, deaths: (LIST_DEATHS.all(run.id) as unknown as DeathRow[]).length },
    newRun: created,
    badges: save.badges,
    levelCap: save.levelCap,
    playtime: save.playtime,
    overCap: save.party.filter((m) => m.level > save.levelCap).map((m) => m.nickname),
    pending: pendingDeaths(save, run.id),
  })
})

// Dex for the client's species pickers (logging a lost encounter, etc.).
const SPECIES_LIST = speciesList()
router.get('/species', (_req: Request, res: Response) => {
  res.json(SPECIES_LIST)
})

router.get('/runs', (_req: Request, res: Response) => {
  const deathsByRun = new Map(
    (DEATH_COUNT_BY_RUN.all() as { run_id: number; deaths: number }[]).map((r) => [r.run_id, r.deaths]),
  )
  const runs = (LIST_RUNS.all() as unknown as RunRow[]).map((r) => {
    const snapshot = LATEST_SNAPSHOT.get(r.id) as SnapshotRow | undefined
    const save = snapshot ? (JSON.parse(snapshot.parsed) as ParsedSave) : null
    return {
      ...r,
      deaths: deathsByRun.get(r.id) ?? 0,
      badges: snapshot?.badges ?? 0,
      playtime_seconds: snapshot?.playtime_seconds ?? 0,
      last_synced_at: snapshot?.uploaded_at ?? null,
      final_team: save ? save.party.map((m) => ({ species: m.species, nickname: m.nickname, level: m.level })) : [],
    }
  })
  res.json(runs)
})

// Deliberate "this run is over" — never inferred from a save.
router.post('/runs/:id/end', (req: Request, res: Response) => {
  const run = GET_RUN.get(Number(req.params.id)) as RunRow | undefined
  if (!run) {
    res.status(404).json({ error: 'Run not found' })
    return
  }
  const { status, fight_id, post_mortem } = (req.body ?? {}) as Record<string, unknown>
  if (typeof status !== 'string' || !RUN_STATUSES.has(status)) {
    res.status(400).json({ error: `status must be one of: ${[...RUN_STATUSES].join(', ')}` })
    return
  }
  END_RUN.run(status, fight_id == null ? null : Number(fight_id), (post_mortem as string) ?? null, run.id)
  res.json(GET_RUN.get(run.id))
})

router.post('/runs/:id/reopen', (req: Request, res: Response) => {
  const run = GET_RUN.get(Number(req.params.id)) as RunRow | undefined
  if (!run) {
    res.status(404).json({ error: 'Run not found' })
    return
  }
  REOPEN_RUN.run(run.id)
  res.json(GET_RUN.get(run.id))
})

// Confirm a pending death (or re-attach a cause to one already recorded).
router.post('/deaths', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const runId = Number(body.run_id)
  const pid = Number(body.pid)
  if (!Number.isInteger(runId) || !GET_RUN.get(runId)) {
    res.status(400).json({ error: 'run_id must reference an existing run' })
    return
  }
  if (!Number.isFinite(pid) || pid <= 0) {
    res.status(400).json({ error: 'pid is required' })
    return
  }
  const species = Number(body.species)
  if (!Number.isInteger(species) || species < 1 || species > 493) {
    res.status(400).json({ error: 'species must be a national dex number (1-493)' })
    return
  }
  INSERT_DEATH.run(
    runId,
    pid,
    species,
    (body.nickname as string) ?? null,
    body.level == null ? null : Number(body.level),
    (body.met_location as string) ?? null,
    body.fight_id == null ? null : Number(body.fight_id),
    (body.note as string) ?? null,
  )
  res.status(201).json({ ok: true })
})

router.patch('/deaths/:id', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const result = UPDATE_DEATH.run(
    body.fight_id == null ? null : Number(body.fight_id),
    (body.note as string) ?? null,
    Number(req.params.id),
  )
  if (result.changes === 0) {
    res.status(404).json({ error: 'Death not found' })
    return
  }
  res.json({ ok: true })
})

router.delete('/deaths/:id', (req: Request, res: Response) => {
  const result = DELETE_DEATH.run(Number(req.params.id))
  if (result.changes === 0) {
    res.status(404).json({ error: 'Death not found' })
    return
  }
  res.status(204).end()
})

router.get('/fights', (req: Request, res: Response) => {
  const runId = req.query.run ? Number(req.query.run) : undefined
  const snapshot = (runId === undefined ? undefined : LATEST_SNAPSHOT.get(runId)) as SnapshotRow | undefined
  res.json(decorateFights(runId, snapshot?.badges ?? 0))
})

// Tick a fight off for one run. Gyms don't need this — their badge settles it.
router.post('/fights/:id/clear', (req: Request, res: Response) => {
  const fight = GET_FIGHT.get(Number(req.params.id)) as Record<string, unknown> | undefined
  if (!fight) {
    res.status(404).json({ error: 'Fight not found' })
    return
  }
  const runId = Number((req.body ?? {}).run_id)
  if (!Number.isInteger(runId) || !GET_RUN.get(runId)) {
    res.status(400).json({ error: 'run_id must reference an existing run' })
    return
  }
  MARK_CLEARED.run(runId, fight.id as number)
  res.status(201).json({ ok: true })
})

router.delete('/fights/:id/clear', (req: Request, res: Response) => {
  const runId = Number(req.query.run)
  if (!Number.isInteger(runId)) {
    res.status(400).json({ error: 'run is required' })
    return
  }
  const result = UNMARK_CLEARED.run(runId, Number(req.params.id))
  if (result.changes === 0) {
    res.status(404).json({ error: 'Fight was not marked cleared for that run' })
    return
  }
  res.status(204).end()
})

router.post('/fights', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const { n } = MAX_FIGHT_ORDER.get() as { n: number }
  const key = typeof body.key === 'string' && body.key ? body.key : `custom-${Date.now()}`
  const result = INSERT_FIGHT.run(
    key,
    name,
    (body.location as string) ?? null,
    body.badge_index == null ? null : Number(body.badge_index),
    body.sort_order == null ? n : Number(body.sort_order),
    body.danger == null ? null : Number(body.danger),
    (body.threat_note as string) ?? null,
  )
  res.status(201).json(GET_FIGHT.get(result.lastInsertRowid))
})

router.patch('/fights/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const existing = GET_FIGHT.get(id) as Record<string, unknown> | undefined
  if (!existing) {
    res.status(404).json({ error: 'Fight not found' })
    return
  }
  const body = (req.body ?? {}) as Record<string, unknown>
  const danger = body.danger === undefined ? existing.danger : body.danger === null ? null : Number(body.danger)
  if (danger !== null && (!Number.isInteger(danger) || (danger as number) < 1 || (danger as number) > 5)) {
    res.status(400).json({ error: 'danger must be 1-5 or null' })
    return
  }
  UPDATE_FIGHT.run(
    danger as number | null,
    body.threat_note === undefined ? (existing.threat_note as string | null) : ((body.threat_note as string) ?? null),
    body.location === undefined ? (existing.location as string | null) : ((body.location as string) ?? null),
    body.name === undefined ? (existing.name as string) : String(body.name),
    id,
  )
  res.json(GET_FIGHT.get(id))
})

router.delete('/fights/:id', (req: Request, res: Response) => {
  const result = DELETE_FIGHT.run(Number(req.params.id))
  if (result.changes === 0) {
    res.status(404).json({ error: 'Fight not found' })
    return
  }
  res.status(204).end()
})

// Encounters you *lost* — fled, fainted, or skipped as a dupe. The ones you won
// come free from each mon's met location, so only these need typing in.
router.post('/encounters', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const runId = Number(body.run_id)
  if (!Number.isInteger(runId) || !GET_RUN.get(runId)) {
    res.status(400).json({ error: 'run_id must reference an existing run' })
    return
  }
  const location = typeof body.location === 'string' ? body.location.trim() : ''
  if (!location) {
    res.status(400).json({ error: 'location is required' })
    return
  }
  const outcome = String(body.outcome ?? '')
  if (!OUTCOMES.has(outcome)) {
    res.status(400).json({ error: `outcome must be one of: ${[...OUTCOMES].join(', ')}` })
    return
  }
  const result = INSERT_LOSS.run(
    runId,
    location,
    body.species == null ? null : Number(body.species),
    outcome,
    (body.note as string) ?? null,
  )
  res.status(201).json({ id: Number(result.lastInsertRowid), run_id: runId, location, outcome })
})

router.delete('/encounters/:id', (req: Request, res: Response) => {
  const result = DELETE_LOSS.run(Number(req.params.id))
  if (result.changes === 0) {
    res.status(404).json({ error: 'Encounter not found' })
    return
  }
  res.status(204).end()
})

export default router
