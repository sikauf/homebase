import type { CallieEvent } from '../shared/api'

// Date keys are YYYY-MM-DD throughout; all math happens on local dates.

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/**
 * The dates (inclusive range) on which an event occurs. Recurrences repeat
 * from the event's start date; `until` (inclusive) caps them. Monthly events
 * on the 29th–31st skip months without that day rather than sliding.
 */
export function occurrencesInRange(event: CallieEvent, rangeStart: string, rangeEnd: string): string[] {
  if (event.date > rangeEnd) return []
  if (event.recurrence !== 'none' && event.until && event.until < rangeStart) return []

  const start = parseKey(event.date)
  const lastDate = event.until && event.until < rangeEnd ? parseKey(event.until) : parseKey(rangeEnd)
  const within = (key: string) => key >= rangeStart && key <= rangeEnd

  if (event.recurrence === 'none') {
    return within(event.date) ? [event.date] : []
  }

  const out: string[] = []

  if (event.recurrence === 'daily' || event.recurrence === 'weekly' || event.recurrence === 'biweekly') {
    const step = event.recurrence === 'daily' ? 1 : event.recurrence === 'weekly' ? 7 : 14
    let cursor = start
    // Jump close to the range start instead of stepping day by day from the origin.
    const behind = Math.floor((parseKey(rangeStart).getTime() - cursor.getTime()) / 86_400_000)
    if (behind > step) cursor = addDays(cursor, Math.floor(behind / step) * step)
    for (let guard = 0; cursor <= lastDate && guard < 1000; guard++) {
      const key = toKey(cursor)
      if (within(key)) out.push(key)
      cursor = addDays(cursor, step)
    }
    return out
  }

  if (event.recurrence === 'monthly') {
    const day = start.getDate()
    let y = Math.max(start.getFullYear(), parseKey(rangeStart).getFullYear())
    let m = y === start.getFullYear() ? start.getMonth() : 0
    for (let guard = 0; guard < 48; guard++) {
      const candidate = new Date(y, m, day)
      if (candidate > lastDate) break
      // new Date rolls over for missing days (e.g. Feb 31) — skip those months
      if (candidate.getDate() === day && candidate >= start) {
        const key = toKey(candidate)
        if (within(key)) out.push(key)
      }
      m += 1
      if (m > 11) { m = 0; y += 1 }
    }
    return out
  }

  // yearly
  for (let y = start.getFullYear(); ; y++) {
    const candidate = new Date(y, start.getMonth(), start.getDate())
    if (candidate > lastDate) break
    if (candidate.getDate() === start.getDate() && candidate >= start) {
      const key = toKey(candidate)
      if (within(key)) out.push(key)
    }
  }
  return out
}

export interface Occurrence {
  event: CallieEvent
  date: string
}

/** All occurrences of all events inside a grid range, grouped by date key. */
export function occurrencesByDay(events: CallieEvent[], rangeStart: string, rangeEnd: string): Map<string, Occurrence[]> {
  const byDay = new Map<string, Occurrence[]>()
  for (const event of events) {
    for (const date of occurrencesInRange(event, rangeStart, rangeEnd)) {
      const list = byDay.get(date) ?? []
      list.push({ event, date })
      byDay.set(date, list)
    }
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => (a.event.time ?? '99:99').localeCompare(b.event.time ?? '99:99') || a.event.id - b.event.id)
  }
  return byDay
}

export interface MonthGrid {
  /** 42 date keys (6 weeks, Sunday-first) covering the month. */
  days: string[]
  rangeStart: string
  rangeEnd: string
}

export function monthGrid(year: number, month: number): MonthGrid {
  const first = new Date(year, month, 1)
  const gridStart = addDays(first, -first.getDay())
  const days: string[] = []
  for (let i = 0; i < 42; i++) days.push(toKey(addDays(gridStart, i)))
  return { days, rangeStart: days[0], rangeEnd: days[41] }
}

export const RECURRENCE_LABELS: Record<string, string> = {
  none: 'Just once',
  daily: 'Every day',
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
  yearly: 'Every year',
}
