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
}

// Multi-day ribbon (reading a book, golf trip).
export interface CalendarSpan {
  startDate: string
  endDate: string | null // null = ongoing, renders through today
  label: string
  color: string
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
