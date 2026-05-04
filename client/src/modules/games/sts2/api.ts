export interface CharacterAscension {
  id: string
  name: string
  max_ascension: number
  preferred_ascension: number
  total_wins: number
  total_losses: number
  a10_completed: boolean
}

export async function fetchAscensions(): Promise<CharacterAscension[]> {
  const res = await fetch('/api/games/sts2/ascensions')
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error)
  }
  return res.json()
}

export async function setA10Completed(characterId: string, completed: boolean): Promise<void> {
  const res = await fetch(`/api/games/sts2/a10/${encodeURIComponent(characterId)}`, {
    method: completed ? 'POST' : 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error)
  }
}
