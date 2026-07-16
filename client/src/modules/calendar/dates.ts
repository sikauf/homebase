import type { CalendarSpan } from './types'

// All date keys are 'YYYY-MM-DD'. Build Dates from parts — `new Date(iso)`
// parses as UTC and drifts a day near month boundaries (see books/Timeline.tsx).

export function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function todayIso(): string {
  const now = new Date()
  return toIso(now.getFullYear(), now.getMonth(), now.getDate())
}

export function daysBetween(aIso: string, bIso: string): number {
  return Math.round((parseLocal(bIso).getTime() - parseLocal(aIso).getTime()) / 86400000)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function firstDow(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

// Cells for a month grid: leading/trailing nulls pad to whole weeks.
export function monthWeeks(year: number, month: number): (string | null)[][] {
  const cells: (string | null)[] = []
  for (let i = 0; i < firstDow(year, month); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(toIso(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

// --- Span ribbons -------------------------------------------------------------

// Global lane per span so a book keeps its row across weeks. Greedy: first lane
// with no date overlap.
export function assignSpanLanes(spans: CalendarSpan[], today: string): Map<CalendarSpan, number> {
  const sorted = [...spans].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const laneEnds: string[] = []
  const lanes = new Map<CalendarSpan, number>()
  for (const span of sorted) {
    const end = span.endDate ?? today
    let lane = 0
    while (laneEnds[lane] !== undefined && laneEnds[lane] >= span.startDate) lane++
    laneEnds[lane] = end
    lanes.set(span, lane)
  }
  return lanes
}

export interface WeekSegment {
  span: CalendarSpan
  lane: number
  colStart: number // 0-6
  colEnd: number   // 0-6 inclusive
  capStart: boolean // true when the span truly starts in this week (rounded left end)
  capEnd: boolean
}

// Clip spans to one week row of the grid.
export function spanSegmentsForWeek(
  spans: CalendarSpan[],
  lanes: Map<CalendarSpan, number>,
  week: (string | null)[],
  today: string,
): WeekSegment[] {
  const days = week.filter((d): d is string => d !== null)
  if (days.length === 0) return []
  const weekStart = days[0]
  const weekEnd = days[days.length - 1]

  const segments: WeekSegment[] = []
  for (const span of spans) {
    const end = span.endDate ?? today
    if (end < weekStart || span.startDate > weekEnd) continue
    const segStart = span.startDate > weekStart ? span.startDate : weekStart
    const segEnd = end < weekEnd ? end : weekEnd
    const colStart = week.indexOf(segStart)
    const colEnd = week.indexOf(segEnd)
    if (colStart === -1 || colEnd === -1) continue
    segments.push({
      span,
      lane: lanes.get(span) ?? 0,
      colStart,
      colEnd,
      capStart: segStart === span.startDate,
      capEnd: span.endDate !== null && segEnd === span.endDate,
    })
  }
  return segments
}
