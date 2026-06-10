import { Progress } from './data'

const BASE = '/api/games/aoe2'

export async function fetchProgress(): Promise<Progress> {
  const res = await fetch(`${BASE}/progress`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

// Set an explicit completed state for a mission (overrides save auto-detection).
export async function setMission(campaign: string, index: number, completed: boolean): Promise<void> {
  await fetch(`${BASE}/missions/${campaign}/${index}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  })
}

// Drop a manual override, reverting the mission to whatever the save reports.
export async function clearMission(campaign: string, index: number): Promise<void> {
  await fetch(`${BASE}/missions/${campaign}/${index}`, { method: 'DELETE' })
}
