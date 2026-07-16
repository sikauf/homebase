export interface CharacterAscension {
  id: string
  name: string
  max_ascension: number
  preferred_ascension: number
  total_wins: number
  total_losses: number
  a10_completed: boolean
}

// syncedAt is set when the data comes from a pushed snapshot rather than a
// live save-file read (i.e. the server runs remotely).
export async function fetchAscensions(): Promise<{ characters: CharacterAscension[]; syncedAt: string | null }> {
  const res = await fetch('/api/games/sts2/ascensions')
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error)
  }
  return { characters: await res.json(), syncedAt: res.headers.get('X-Save-Synced-At') }
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
