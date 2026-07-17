import { describe, it, expect } from 'vitest'
import { occurrencesInRange, monthGrid, occurrencesByDay } from '../modules/callie/calendar/data'
import type { CallieEvent } from '../modules/callie/shared/api'

function event(overrides: Partial<CallieEvent>): CallieEvent {
  return {
    id: 1,
    title: 'Test',
    date: '2026-07-01',
    time: null,
    recurrence: 'none',
    until: null,
    notes: null,
    added_by: 'callie',
    created_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('occurrencesInRange', () => {
  it('returns a one-off only inside its range', () => {
    const e = event({ date: '2026-07-10' })
    expect(occurrencesInRange(e, '2026-07-01', '2026-07-31')).toEqual(['2026-07-10'])
    expect(occurrencesInRange(e, '2026-08-01', '2026-08-31')).toEqual([])
  })

  it('expands weekly events on the same weekday', () => {
    const e = event({ date: '2026-07-06', recurrence: 'weekly' })
    expect(occurrencesInRange(e, '2026-07-01', '2026-07-31')).toEqual([
      '2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27',
    ])
  })

  it('starts weekly expansion from the event date, not the range start', () => {
    const e = event({ date: '2026-07-15', recurrence: 'weekly' })
    expect(occurrencesInRange(e, '2026-07-01', '2026-07-31')).toEqual([
      '2026-07-15', '2026-07-22', '2026-07-29',
    ])
  })

  it('keeps the weekday when a weekly event began long before the range', () => {
    const e = event({ date: '2025-01-03', recurrence: 'weekly' }) // a Friday
    const occurrences = occurrencesInRange(e, '2026-07-01', '2026-07-31')
    expect(occurrences).toEqual(['2026-07-03', '2026-07-10', '2026-07-17', '2026-07-24', '2026-07-31'])
  })

  it('respects the until cap (inclusive)', () => {
    const e = event({ date: '2026-07-06', recurrence: 'weekly', until: '2026-07-20' })
    expect(occurrencesInRange(e, '2026-07-01', '2026-07-31')).toEqual([
      '2026-07-06', '2026-07-13', '2026-07-20',
    ])
    expect(occurrencesInRange(e, '2026-08-01', '2026-08-31')).toEqual([])
  })

  it('expands biweekly with a 14-day step', () => {
    const e = event({ date: '2026-07-01', recurrence: 'biweekly' })
    expect(occurrencesInRange(e, '2026-07-01', '2026-07-31')).toEqual([
      '2026-07-01', '2026-07-15', '2026-07-29',
    ])
  })

  it('skips months without the day for monthly events', () => {
    const e = event({ date: '2026-01-31', recurrence: 'monthly' })
    expect(occurrencesInRange(e, '2026-02-01', '2026-02-28')).toEqual([])
    expect(occurrencesInRange(e, '2026-03-01', '2026-03-31')).toEqual(['2026-03-31'])
  })

  it('expands yearly events (anniversaries)', () => {
    const e = event({ date: '2024-09-14', recurrence: 'yearly' })
    expect(occurrencesInRange(e, '2026-09-01', '2026-09-30')).toEqual(['2026-09-14'])
    expect(occurrencesInRange(e, '2026-10-01', '2026-10-31')).toEqual([])
  })

  it('expands daily events', () => {
    const e = event({ date: '2026-07-30', recurrence: 'daily', until: '2026-08-02' })
    expect(occurrencesInRange(e, '2026-07-26', '2026-08-31')).toEqual([
      '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02',
    ])
  })
})

describe('monthGrid', () => {
  it('produces 42 Sunday-first days covering the month', () => {
    const grid = monthGrid(2026, 6) // July 2026 — the 1st is a Wednesday
    expect(grid.days).toHaveLength(42)
    expect(grid.days[0]).toBe('2026-06-28')
    expect(grid.days).toContain('2026-07-01')
    expect(grid.days).toContain('2026-07-31')
  })
})

describe('occurrencesByDay', () => {
  it('groups by day and sorts timed events before untimed', () => {
    const events = [
      event({ id: 1, date: '2026-07-10', time: null, title: 'later' }),
      event({ id: 2, date: '2026-07-10', time: '09:00', title: 'first' }),
    ]
    const byDay = occurrencesByDay(events, '2026-07-01', '2026-07-31')
    expect(byDay.get('2026-07-10')!.map((o) => o.event.title)).toEqual(['first', 'later'])
  })
})
