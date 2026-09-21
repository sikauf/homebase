const BASE = '/api/games/renplat'

export interface Move {
  name: string
  type: string
  category: string
  power: number | null
  pp: number
}

export interface Mon {
  pid: number
  species: number
  name: string
  types: string[]
  nickname: string
  level: number
  hp: number
  maxHp: number
  nature: string
  ability: string
  heldItem: string | null
  metLocation: string
  metLevel: number
  shiny: boolean
  moves: Move[]
  ivs: Record<string, number>
  evs: Record<string, number>
}

export interface Death {
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

export interface Fight {
  id: number
  key: string
  name: string
  location: string | null
  badge_index: number | null
  sort_order: number
  danger: number | null
  threat_note: string | null
  kills: number
}

export interface Run {
  id: number
  number: number
  trainer_id: number
  secret_id: number
  trainer_name: string
  status: 'active' | 'lost' | 'won'
  started_at: string
  ended_at: string | null
  death_fight_id: number | null
  post_mortem: string | null
  deaths: number
}

export interface RunSummary extends Run {
  badges: number
  playtime_seconds: number
  last_synced_at: string | null
  final_team: { species: number; nickname: string; level: number }[]
}

export interface EncounterLoss {
  id: number
  run_id: number
  location: string
  species: number | null
  outcome: 'fled' | 'fainted' | 'dupe'
  note: string | null
  created_at: string
}

export interface State {
  run: Run | null
  snapshot: { id: number; uploaded_at: string; save_counter: number } | null
  save: {
    trainerName: string
    trainerId: number
    secretId: number
    gender: string
    money: number
    badges: number
    levelCap: number
    playtime: { hours: number; minutes: number; seconds: number; total: number }
  } | null
  party: Mon[]
  boxes: { index: number; name: string; mons: Mon[] }[]
  grave: (Mon & { death: Death | null })[]
  pending: Mon[]
  deaths: Death[]
  encounters: { byLocation: { location: string; mons: Mon[] }[]; losses: EncounterLoss[] } | null
  history: { id: number; uploaded_at: string; badges: number; playtime_seconds: number; money: number }[]
  fights: Fight[]
  runs: Run[]
  levelCaps: number[]
}

export interface UploadResult {
  snapshotId: number
  run: Run
  newRun: boolean
  badges: number
  levelCap: number
  playtime: { hours: number; minutes: number; seconds: number; total: number }
  overCap: string[]
  pending: Mon[]
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? res.statusText)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export const fetchState = (runId?: number) =>
  send<State>(runId ? `/state?run=${runId}` : '/state', 'GET')

export const fetchRuns = () => send<RunSummary[]>('/runs', 'GET')

/** Reads the .sav as base64 and posts it; the server parses and stores it. */
export async function uploadSave(file: File): Promise<UploadResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return send<UploadResult>('/save', 'POST', { data: btoa(binary) })
}

export const confirmDeath = (payload: {
  run_id: number
  pid: number
  species: number
  nickname?: string
  level?: number
  met_location?: string
  fight_id?: number | null
  note?: string
}) => send<{ ok: true }>('/deaths', 'POST', payload)

export const updateDeath = (id: number, payload: { fight_id?: number | null; note?: string }) =>
  send<{ ok: true }>(`/deaths/${id}`, 'PATCH', payload)

export const deleteDeath = (id: number) => send<void>(`/deaths/${id}`, 'DELETE')

export const updateFight = (
  id: number,
  payload: { danger?: number | null; threat_note?: string; name?: string; location?: string },
) => send<Fight>(`/fights/${id}`, 'PATCH', payload)

export const createFight = (payload: { name: string; location?: string; badge_index?: number }) =>
  send<Fight>('/fights', 'POST', payload)

export const deleteFight = (id: number) => send<void>(`/fights/${id}`, 'DELETE')

export const logEncounterLoss = (payload: {
  run_id: number
  location: string
  species?: number | null
  outcome: string
  note?: string
}) => send<EncounterLoss>('/encounters', 'POST', payload)

export const deleteEncounterLoss = (id: number) => send<void>(`/encounters/${id}`, 'DELETE')

export const endRun = (id: number, payload: { status: 'lost' | 'won'; fight_id?: number | null; post_mortem?: string }) =>
  send<Run>(`/runs/${id}/end`, 'POST', payload)

export const reopenRun = (id: number) => send<Run>(`/runs/${id}/reopen`, 'POST', {})
