import { fetchJSON } from '../shared'

export interface ParallelBook {
  book_id: number
  title: string
  author: string | null
  cover_url: string | null
  accent_rgb?: string | null
}

export interface Parallel {
  id: number
  book_a_id: number
  book_b_id: number
  note: string
  created_at: string
}

export interface ParallelsData {
  books: ParallelBook[]
  parallels: Parallel[]
}

/** One graph edge: a book pair plus every parallel recorded between them. */
export interface ParallelEdge {
  key: string
  a: ParallelBook
  b: ParallelBook
  count: number
  parallels: Parallel[]
}

export const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)

export function buildEdges(data: ParallelsData): ParallelEdge[] {
  const byId = new Map(data.books.map((b) => [b.book_id, b]))
  const edges = new Map<string, ParallelEdge>()
  for (const p of data.parallels) {
    const a = byId.get(p.book_a_id)
    const b = byId.get(p.book_b_id)
    if (!a || !b) continue
    const key = pairKey(p.book_a_id, p.book_b_id)
    const edge = edges.get(key)
    if (edge) {
      edge.count++
      edge.parallels.push(p)
    } else {
      edges.set(key, { key, a, b, count: 1, parallels: [p] })
    }
  }
  return [...edges.values()]
}

export function loadParallels(): Promise<ParallelsData> {
  return fetchJSON<ParallelsData>('/api/books/parallels')
}

export function loadLibrary(): Promise<ParallelBook[]> {
  return fetchJSON<ParallelBook[]>('/api/books/library')
}

export async function createParallel(a: ParallelBook, b: ParallelBook, note: string): Promise<void> {
  await fetchJSON('/api/books/parallels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      book_a: { book_id: a.book_id, title: a.title, author: a.author, cover_url: a.cover_url },
      book_b: { book_id: b.book_id, title: b.title, author: b.author, cover_url: b.cover_url },
      note,
    }),
  })
}

export async function deleteParallel(id: number): Promise<void> {
  const r = await fetch(`/api/books/parallels/${id}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(`Server error ${r.status}`)
}
