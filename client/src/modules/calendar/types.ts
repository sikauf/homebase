// The calendar is a read-only overlay over the other modules' data. Each
// module contributes through a CalendarSource adapter (sources/*.ts) — adding
// a new source is one adapter file plus one entry in sources/index.ts.

export interface CalendarEvent {
  date: string   // 'YYYY-MM-DD'
  label: string  // full text for the day-detail panel, e.g. 'Bethpage Black — 96'
  color: string  // any CSS color
  future?: boolean // scheduled (e.g. tee time) → outlined ring instead of filled dot
  // Render in the day cell as a labeled chip — styled like a one-day span
  // ribbon — instead of a dot. `short` is the phone-width form, where the
  // cell is too narrow for the full label.
  chip?: { label: string; short?: string }
  // Ties this event to the CalendarSpan carrying the same `key`. On a day
  // that span covers, the day panel folds the two into a single row and shows
  // `detail` instead of `label` — the span already names the subject, so a
  // book's pages-read sits on that book's reading row rather than repeating
  // the title underneath it. Falls back to its own row if the span isn't
  // active that day.
  spanKey?: string
  detail?: string
}

// Multi-day ribbon (reading a book, golf trip).
export interface CalendarSpan {
  startDate: string
  endDate: string | null // null = ongoing, renders through today
  label: string
  color: string
  key?: string // see CalendarEvent.spanKey
}

export interface CalendarSource {
  id: string
  label: string // legend chip text
  icon: string
  color: string // legend chip color
  // Sam-only source: invisible (legend included) unless authenticated.
  requiresAuth?: boolean
  fetch(): Promise<{ events: CalendarEvent[]; spans?: CalendarSpan[] }>
}

export async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return res.json()
}
