import { timestampToLocalIso } from '../dates'
import { CalendarSource, CalendarEvent, CalendarSpan, getJSON } from '../types'

interface CurrentBook { book_id: number; title: string; started_at: string | null; accent_rgb: string | null }
interface CompletedBook { book_id: number; title: string; started_at: string | null; finished_at: string | null; accent_rgb: string | null }
interface ProgressUpdate { book_id: number; title: string; at: string; pages_read: number; progress_pages: number }

const FALLBACK = 'rgb(120,130,150)'
const bookColor = (rgb: string | null | undefined) => (rgb ? `rgb(${rgb})` : FALLBACK)

const books: CalendarSource = {
  id: 'books',
  label: 'Reading',
  icon: '📖',
  color: 'rgb(210,180,140)',
  async fetch() {
    // Each endpoint is optional — e.g. all three 503 without a Hardcover
    // token; whatever loads still renders.
    const [current, completed, progress] = await Promise.allSettled([
      getJSON<CurrentBook[]>('/api/books/currently-reading'),
      getJSON<CompletedBook[]>('/api/books/completed'),
      getJSON<ProgressUpdate[]>('/api/books/reading-progress'),
    ])
    if (current.status === 'rejected' && completed.status === 'rejected' && progress.status === 'rejected') {
      throw new Error('books unavailable')
    }

    const accentByBook = new Map<number, string | null>()
    const spans: CalendarSpan[] = []
    if (completed.status === 'fulfilled') {
      for (const b of completed.value) {
        accentByBook.set(b.book_id, b.accent_rgb)
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
        accentByBook.set(b.book_id, b.accent_rgb)
        if (!b.started_at) continue
        spans.push({
          startDate: b.started_at.slice(0, 10),
          endDate: null,
          label: b.title,
          color: bookColor(b.accent_rgb),
        })
      }
    }

    // Pages read per local day per book, summed across that day's updates.
    const events: CalendarEvent[] = []
    if (progress.status === 'fulfilled') {
      const perDay = new Map<string, { title: string; pages: number; accent: string | null }>()
      for (const u of progress.value) {
        const day = timestampToLocalIso(u.at)
        const key = `${day}|${u.book_id}`
        const entry = perDay.get(key) ?? { title: u.title, pages: 0, accent: accentByBook.get(u.book_id) ?? null }
        entry.pages += u.pages_read
        perDay.set(key, entry)
      }
      for (const [key, { title, pages, accent }] of perDay) {
        if (pages <= 0) continue
        events.push({
          date: key.slice(0, key.indexOf('|')),
          label: `${title} — ${pages} ${pages === 1 ? 'page' : 'pages'}`,
          color: bookColor(accent),
        })
      }
    }

    return { events, spans }
  },
}

export default books
