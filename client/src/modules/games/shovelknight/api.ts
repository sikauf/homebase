export interface FeatRow {
  character_id: string
  feat_id: string
  completed_at: string
}

const BASE = '/api/games/shovelknight/feats'

export async function fetchFeats(): Promise<FeatRow[]> {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function markFeat(character_id: string, feat_id: string): Promise<void> {
  await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ character_id, feat_id }),
  })
}

// Feats accomplished in-game (from the Steam save), keyed by character id.
// Returns {} when the save isn't configured/readable — nothing is claimable then.
// syncedAt is set when the data comes from a pushed snapshot rather than a
// live save-file read (i.e. the server runs remotely).
export type Accomplished = Record<string, string[]>

export async function fetchAccomplished(): Promise<{ accomplished: Accomplished; syncedAt: string | null }> {
  const res = await fetch('/api/games/shovelknight/accomplished')
  if (!res.ok) return { accomplished: {}, syncedAt: null }
  return { accomplished: await res.json(), syncedAt: res.headers.get('X-Save-Synced-At') }
}
