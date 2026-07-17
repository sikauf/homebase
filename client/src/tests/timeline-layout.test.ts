import { describe, it, expect } from 'vitest'
import {
  computeTimeline,
  CARD_GAP,
  CARD_MIN_H,
  type CompletedBook,
} from '../modules/books/Timeline'

let nextId = 1
function book(finished: string, started: string | null = null): CompletedBook {
  return {
    book_id: nextId++,
    title: `Book ${nextId}`,
    author: null,
    cover_url: null,
    accent_rgb: null,
    started_at: started,
    finished_at: finished,
  }
}

// Mirrors the real data that exposed the bug: a run of quick finish-only books
// in one lane while long overlapping reads occupy a second lane. The old layout
// nudged colliding cards down within their own lane only, shearing that lane
// months away from the axis and the other lane.
const REGRESSION_SET: CompletedBook[] = [
  book('2026-02-17'),
  book('2026-02-19'),
  book('2026-03-07'),
  book('2026-03-09'),
  book('2026-03-16'),
  book('2026-04-01', '2026-03-22'),
  book('2026-04-10', '2026-04-02'),
  book('2026-04-26', '2026-04-17'),
  book('2026-05-06', '2026-04-28'),
  // second lane
  book('2026-04-18', '2026-04-08'),
  book('2026-05-10', '2026-04-23'),
  book('2026-05-15', '2026-05-14'),
  book('2026-06-21', '2026-05-19'),
]

describe('Timeline layout', () => {
  it('returns null with no finished books', () => {
    expect(computeTimeline([])).toBeNull()
    expect(computeTimeline([{ ...book('2026-01-01'), finished_at: null }])).toBeNull()
  })

  it('anchors every card top on the shared date scale (all lanes)', () => {
    const chart = computeTimeline(REGRESSION_SET)!
    expect(chart.numLanes).toBe(2)
    for (const p of chart.placed) {
      expect(Math.abs(p.top - chart.yAt(p.startT))).toBeLessThan(0.5)
    }
  })

  it('keeps cards in start order vertically across lanes — April never sits beside February', () => {
    const chart = computeTimeline(REGRESSION_SET)!
    const byStart = [...chart.placed].sort((a, b) => a.startT - b.startT)
    for (let i = 1; i < byStart.length; i++) {
      expect(byStart[i].top).toBeGreaterThanOrEqual(byStart[i - 1].top)
    }
  })

  it('gives two books started on the same day the same vertical position', () => {
    const chart = computeTimeline([
      book('2026-01-10', '2026-01-01'),
      book('2026-01-08', '2026-01-01'),
    ])!
    expect(chart.numLanes).toBe(2)
    expect(chart.placed[0].top).toBeCloseTo(chart.placed[1].top, 3)
  })

  it('never overlaps cards that share a lane', () => {
    const chart = computeTimeline(REGRESSION_SET)!
    const lanes = new Map<number, typeof chart.placed>()
    for (const p of chart.placed) {
      lanes.set(p.lane, [...(lanes.get(p.lane) ?? []), p])
    }
    for (const cards of lanes.values()) {
      cards.sort((a, b) => a.top - b.top)
      for (let i = 1; i < cards.length; i++) {
        const prev = cards[i - 1]
        const bottom = prev.top + Math.max(prev.barH, CARD_MIN_H)
        expect(cards[i].top).toBeGreaterThanOrEqual(bottom + CARD_GAP - 0.5)
      }
    }
  })

  it('places month markers on the same scale as the cards', () => {
    const chart = computeTimeline(REGRESSION_SET)!
    // Monotone axis
    for (let i = 1; i < chart.markers.length; i++) {
      expect(chart.markers[i].y).toBeGreaterThan(chart.markers[i - 1].y)
    }
    // An April book must render at or below the "Apr" gridline and above "May"
    const apr = chart.markers.find((m) => m.label === 'Apr')!
    const may = chart.markers.find((m) => m.label === 'May')!
    const demonCopperhead = chart.placed.find(
      (p) => p.book.started_at === '2026-04-08',
    )!
    expect(demonCopperhead.top).toBeGreaterThanOrEqual(apr.y)
    expect(demonCopperhead.top).toBeLessThan(may.y)
  })

  it('keeps everything within the reported chart height', () => {
    const chart = computeTimeline(REGRESSION_SET)!
    for (const p of chart.placed) {
      expect(p.top + Math.max(p.barH, CARD_MIN_H)).toBeLessThanOrEqual(chart.height)
    }
    for (const m of chart.markers) {
      expect(m.y).toBeLessThanOrEqual(chart.height)
    }
  })
})
