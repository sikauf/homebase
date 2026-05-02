export interface TestamentRow {
  weapon_id: string
  boss_id: string
  completed_at: string
}

export async function fetchTestaments(): Promise<TestamentRow[]> {
  const res = await fetch('/api/games/hades2/testaments')
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function markTestament(weapon_id: string, boss_id: string): Promise<void> {
  await fetch('/api/games/hades2/testaments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weapon_id, boss_id }),
  })
}
