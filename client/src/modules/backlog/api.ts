import type { BacklogItem } from './types'

export async function fetchItems(): Promise<BacklogItem[]> {
  const res = await fetch('/api/backlog/items')
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function createItem(input: {
  text: string
  section?: string | null
  tab?: string | null
}): Promise<BacklogItem> {
  const res = await fetch('/api/backlog/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error)
  }
  return res.json()
}

export async function updateStatus(id: number, status: 'open' | 'done'): Promise<BacklogItem> {
  const res = await fetch(`/api/backlog/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function deleteItem(id: number): Promise<void> {
  const res = await fetch(`/api/backlog/items/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(res.statusText)
}
