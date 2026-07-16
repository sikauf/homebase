import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { assignSpanLanes, daysBetween, monthWeeks, spanSegmentsForWeek, todayIso } from '../modules/calendar/dates'
import type { CalendarSpan } from '../modules/calendar/types'
import CalendarPage from '../modules/calendar/CalendarPage'

vi.mock('../modules/calendar/sources', () => ({
  sources: [
    {
      id: 'mock',
      label: 'Mock Source',
      icon: '🧪',
      color: 'rgb(100,100,255)',
      fetch: async () => ({
        events: [{ date: todayIso(), label: 'Mock event today', color: 'rgb(100,100,255)' }],
        spans: [],
      }),
    },
    {
      id: 'broken',
      label: 'Broken Source',
      icon: '💥',
      color: 'rgb(255,100,100)',
      fetch: async () => { throw new Error('nope') },
    },
  ],
}))

describe('calendar date helpers', () => {
  it('monthWeeks pads to whole weeks and contains every day', () => {
    const weeks = monthWeeks(2026, 6) // July 2026: starts Wednesday, 31 days
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    const days = weeks.flat().filter((d) => d !== null)
    expect(days.length).toBe(31)
    expect(days[0]).toBe('2026-07-01')
    expect(days[30]).toBe('2026-07-31')
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null])
  })

  it('daysBetween is timezone-safe across month boundaries', () => {
    expect(daysBetween('2026-06-30', '2026-07-01')).toBe(1)
    expect(daysBetween('2026-07-01', '2026-07-01')).toBe(0)
  })

  it('assignSpanLanes stacks overlapping spans into separate lanes', () => {
    const a: CalendarSpan = { startDate: '2026-07-01', endDate: '2026-07-10', label: 'A', color: 'red' }
    const b: CalendarSpan = { startDate: '2026-07-05', endDate: '2026-07-20', label: 'B', color: 'blue' }
    const c: CalendarSpan = { startDate: '2026-07-11', endDate: '2026-07-12', label: 'C', color: 'green' }
    const lanes = assignSpanLanes([a, b, c], '2026-07-31')
    expect(lanes.get(a)).toBe(0)
    expect(lanes.get(b)).toBe(1) // overlaps A
    expect(lanes.get(c)).toBe(0) // A has ended, lane 0 free again
  })

  it('spanSegmentsForWeek clips spans to the week and caps true ends', () => {
    const span: CalendarSpan = { startDate: '2026-07-02', endDate: '2026-07-08', label: 'S', color: 'red' }
    const weeks = monthWeeks(2026, 6)
    const lanes = assignSpanLanes([span], '2026-07-31')

    const first = spanSegmentsForWeek([span], lanes, weeks[0], '2026-07-31')
    expect(first).toHaveLength(1)
    expect(first[0].capStart).toBe(true)
    expect(first[0].capEnd).toBe(false) // continues into next week
    expect(weeks[0][first[0].colStart]).toBe('2026-07-02')
    expect(weeks[0][first[0].colEnd]).toBe('2026-07-04') // Saturday

    const second = spanSegmentsForWeek([span], lanes, weeks[1], '2026-07-31')
    expect(second).toHaveLength(1)
    expect(second[0].capStart).toBe(false)
    expect(second[0].capEnd).toBe(true)
    expect(weeks[1][second[0].colEnd]).toBe('2026-07-08')
  })

  it('ongoing spans (endDate null) run through today only', () => {
    const span: CalendarSpan = { startDate: '2026-07-01', endDate: null, label: 'S', color: 'red' }
    const weeks = monthWeeks(2026, 6)
    const lanes = assignSpanLanes([span], '2026-07-03')
    const segs = spanSegmentsForWeek([span], lanes, weeks[0], '2026-07-03')
    expect(segs).toHaveLength(1)
    expect(weeks[0][segs[0].colEnd]).toBe('2026-07-03')
    expect(segs[0].capEnd).toBe(false) // ongoing, no rounded end
  })
})

describe('CalendarPage', () => {
  it("renders today's events from loaded sources and notes failed ones", async () => {
    render(<CalendarPage />)
    expect(await screen.findByText('Mock event today')).toBeInTheDocument()
    expect(screen.getByText('Mock Source')).toBeInTheDocument()
    expect(screen.getByText(/Couldn't load: Broken Source/)).toBeInTheDocument()
  })
})
