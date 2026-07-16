import { CalendarSource, CalendarSpan, getJSON } from '../types'

interface CurrentBook { book_id: number; title: string; started_at: string | null; accent_rgb: string | null }
interface CompletedBook { book_id: number; title: string; started_at: string | null; finished_at: string | null; accent_rgb: string | null }

const FALLBACK = 'rgb(120,130,150)'
const bookColor = (rgb: string | null) => (rgb ? `rgb(${rgb})` : FALLBACK)

const books: CalendarSource = {
  id: 'books',
  label: 'Reading',
  icon: '📖',
  color: 'rgb(210,180,140)',
  async fetch() {
    // Each endpoint is optional — e.g. currently-reading 503s without a
    // Hardcover token; whatever loads still renders.
    const [current, completed] = await Promise.allSettled([
      getJSON<CurrentBook[]>('/api/books/currently-reading'),
      getJSON<CompletedBook[]>('/api/books/completed'),
    ])
    if (current.status === 'rejected' && completed.status === 'rejected') {
      throw new Error('books unavailable')
    }

    const spans: CalendarSpan[] = []
    if (completed.status === 'fulfilled') {
      for (const b of completed.value) {
        if (!b.started_at || !b.finished_at) continue
        spans.push({
          startDate: b.started_at.slice(0, 10),
          endDate: b.finished_at.slice(0, 10),
          label: b.title,
          color: bookColor(b.accent_rgb),
        })
      }
    }
    if (current.status === 'fulfilled') {
      for (const b of current.value) {
        if (!b.started_at) continue
        spans.push({
          startDate: b.started_at.slice(0, 10),
          endDate: null,
          label: b.title,
          color: bookColor(b.accent_rgb),
        })
      }
    }
    return { events: [], spans }
  },
}

export default books
