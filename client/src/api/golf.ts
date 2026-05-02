import type { CreateRoundPayload, CreateTeeTimePayload, GolfRound, GolfStats, TeeTime } from '../types/golf'

const BASE = '/api/golf'

export async function fetchRounds(): Promise<GolfRound[]> {
  const res = await fetch(`${BASE}/rounds`)
  if (!res.ok) throw new Error('Failed to fetch rounds')
  return res.json()
}

export async function fetchStats(): Promise<GolfStats> {
  const res = await fetch(`${BASE}/stats`)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

export async function createRound(payload: CreateRoundPayload): Promise<GolfRound> {
  const res = await fetch(`${BASE}/rounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create round')
  return res.json()
}

export async function updateRound(id: number, payload: Partial<CreateRoundPayload>): Promise<GolfRound> {
  const res = await fetch(`${BASE}/rounds/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update round')
  return res.json()
}

export async function deleteRound(id: number): Promise<void> {
  const res = await fetch(`${BASE}/rounds/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete round')
}

export async function fetchTeeTimes(): Promise<TeeTime[]> {
  const res = await fetch(`${BASE}/tee-times`)
  if (!res.ok) throw new Error('Failed to fetch tee times')
  return res.json()
}

export async function createTeeTime(payload: CreateTeeTimePayload): Promise<TeeTime> {
  const res = await fetch(`${BASE}/tee-times`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create tee time')
  return res.json()
}

export async function deleteTeeTime(id: number): Promise<void> {
  const res = await fetch(`${BASE}/tee-times/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete tee time')
}
