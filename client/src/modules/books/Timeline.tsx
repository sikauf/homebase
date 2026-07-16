import { Fragment, useEffect, useMemo, useState } from 'react'
import { fetchJSON } from './shared'
import JournalModal, { type JournalBook } from './JournalModal'

interface CompletedBook {
  book_id: number
  title: string
  author: string | null
  cover_url: string | null
  accent_rgb: string | null
  started_at: string | null
  finished_at: string | null
}

const FALLBACK_RGB = '120,130,150'
const DAY = 86400000

// --- Geometry ---------------------------------------------------------------
const AXIS_W = 60          // left rail for month / year labels
const LANE_W = 250         // width of one concurrency lane (cover + text)
const LANE_GAP = 18
const COVER_W = 44
const COVER_H = 66
const BAR_W = 8            // duration "pill" width behind the cover
const PX_PER_DAY = 7       // vertical scale: 1 day of reading = 7px of bar
const MIN_BAR_H = 60       // floor so short reads stay legible
const CARD_MIN_H = 78      // vertical footprint reserved for the text block
const CARD_GAP = 18        // min gap between two cards stacked in one lane
const GAP_THRESHOLD_DAYS = 12   // idle gaps longer than this get compressed
const GAP_FIXED_PX = 64

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse 'YYYY-MM-DD' as *local* midnight. `new Date(iso)` parses as UTC and then
// drifts by the timezone offset against the day math below — building from parts
// avoids the off-by-one near month boundaries.
function parseLocal(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1).getTime()
}
function daysBetween(a: number, b: number): number {
  return Math.round((b - a) / DAY)
}
function fmtDay(t: number): string {
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtRange(startT: number, finishT: number): string {
  const s = new Date(startT)
  const f = new Date(finishT)
  if (s.getMonth() === f.getMonth() && s.getFullYear() === f.getFullYear()) {
    return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}–${f.getDate()}`
  }
  return `${fmtDay(startT)} – ${fmtDay(finishT)}`
}

// --- Time scale (date → y), with idle gaps compressed -----------------------
interface Seg { type: 'active' | 'gap'; t0: number; t1: number; y0: number; y1: number; days: number }
interface Scale { segs: Seg[]; minT: number; maxT: number; totalH: number }

interface Span {
  book: CompletedBook
  startT: number
  finishT: number
  durDays: number
  hasDuration: boolean
}

function buildSpans(books: CompletedBook[]): Span[] {
  return books.flatMap((book) => {
    if (!book.finished_at) return []
    const finishT = parseLocal(book.finished_at)
    const rawStart = book.started_at ? parseLocal(book.started_at) : finishT
    const startT = Math.min(rawStart, finishT)
    const durDays = daysBetween(startT, finishT)
    return [{ book, startT, finishT, durDays, hasDuration: book.started_at != null && durDays > 0 }]
  })
}

function buildScale(spans: Span[]): Scale {
  const minT = Math.min(...spans.map((s) => s.startT))
  const maxT = Math.max(...spans.map((s) => s.finishT))

  // Merge all reading intervals into the periods where *something* was active.
  const ivs = spans.map((s) => [s.startT, s.finishT] as [number, number]).sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const iv of ivs) {
    const last = merged[merged.length - 1]
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1])
    else merged.push([iv[0], iv[1]])
  }

  // Active periods scale linearly with elapsed days; idle gaps between them are
  // proportional until they get long, then collapse to a fixed compact break.
  const segs: Seg[] = []
  let y = 0
  merged.forEach(([a, b], i) => {
    if (i > 0) {
      const ga = merged[i - 1][1]
      const gapDays = daysBetween(ga, a)
      const h = gapDays > GAP_THRESHOLD_DAYS ? GAP_FIXED_PX : gapDays * PX_PER_DAY
      segs.push({ type: 'gap', t0: ga, t1: a, y0: y, y1: y + h, days: gapDays })
      y += h
    }
    const days = Math.max(daysBetween(a, b), 1)
    const h = days * PX_PER_DAY
    segs.push({ type: 'active', t0: a, t1: b, y0: y, y1: y + h, days })
    y += h
  })

  return { segs, minT, maxT, totalH: y }
}

function dateToY(scale: Scale, t: number): number {
  const { segs } = scale
  if (t <= segs[0].t0) return segs[0].y0
  for (const s of segs) {
    if (t >= s.t0 && t <= s.t1) {
      const f = s.t1 === s.t0 ? 0 : (t - s.t0) / (s.t1 - s.t0)
      return s.y0 + f * (s.y1 - s.y0)
    }
  }
  return segs[segs.length - 1].y1
}

// --- Lane packing (interval partitioning) -----------------------------------
interface Placed extends Span {
  lane: number
  top: number
  barH: number
}

function layout(spans: Span[], scale: Scale): { placed: Placed[]; numLanes: number; height: number } {
  const sorted = [...spans].sort((a, b) => a.startT - b.startT || a.finishT - b.finishT)

  // Greedy: first lane whose previous book has already finished. Two books read
  // at the same time can't share a lane, so they land in parallel columns.
  const laneEnds: number[] = []
  const withLanes = sorted.map((span) => {
    let lane = 0
    while (laneEnds[lane] !== undefined && laneEnds[lane] > span.startT) lane++
    laneEnds[lane] = span.finishT
    return { span, lane }
  })

  // Place by date, then nudge down within a lane only if two cards would collide
  // (rare — books are usually days apart). The "N days" / date labels carry the
  // exact timing, so a small nudge never misleads.
  const laneBottoms: number[] = []
  const placed: Placed[] = withLanes.map(({ span, lane }) => {
    const scaleTop = dateToY(scale, span.startT)
    const barH = span.hasDuration
      ? Math.max(dateToY(scale, span.finishT) - scaleTop, MIN_BAR_H)
      : COVER_H
    const top = Math.max(scaleTop, (laneBottoms[lane] ?? -Infinity) + CARD_GAP)
    laneBottoms[lane] = top + Math.max(barH, CARD_MIN_H)
    return { ...span, lane, top, barH }
  })

  const numLanes = laneEnds.length || 1
  const height = Math.max(scale.totalH, ...laneBottoms, 0) + 40
  return { placed, numLanes, height }
}

// --- Axis markers -----------------------------------------------------------
interface Marker { y: number; label: string; year: boolean }

function buildMarkers(scale: Scale): Marker[] {
  const start = new Date(scale.minT)
  const markers: Marker[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  let lastY = -Infinity
  while (cursor.getTime() <= scale.maxT) {
    const y = dateToY(scale, cursor.getTime())
    if (y - lastY >= 18) {
      const isJan = cursor.getMonth() === 0
      markers.push({
        y,
        label: isJan ? String(cursor.getFullYear()) : MONTH_NAMES[cursor.getMonth()],
        year: isJan || markers.length === 0,
      })
      lastY = y
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  // Always show the year context on the first marker.
  if (markers.length && !markers[0].year) {
    markers[0] = { ...markers[0], label: `${markers[0].label} ${start.getFullYear()}`, year: true }
  }
  return markers
}

// --- Book card --------------------------------------------------------------
// Cover + duration spine + text block, shared by the desktop chart's absolute
// cards and the mobile chronological list.
function CardInner({ span, hovered }: { span: Span & { barH: number }; hovered: boolean }) {
  const { book, barH, durDays, hasDuration, startT, finishT } = span
  const rgb = book.accent_rgb ?? FALLBACK_RGB

  return (
    <>
      {/* Duration spine + cover head */}
      <div className="relative shrink-0" style={{ width: COVER_W, height: Math.max(barH, COVER_H) }}>
        {/* Duration pill — height literally = days spent reading */}
        <div
          className="absolute rounded-full"
          style={{
            left: (COVER_W - BAR_W) / 2,
            top: COVER_H / 2,
            width: BAR_W,
            height: Math.max(barH - COVER_H / 2, 0),
            background: `linear-gradient(to bottom, rgba(${rgb},0.55), rgba(${rgb},0.12))`,
            boxShadow: hovered ? `0 0 12px rgba(${rgb},0.35)` : 'none',
            transition: 'box-shadow 0.15s ease',
          }}
        />
        {/* Cover caps the top of the bar */}
        <div
          className="absolute rounded-md overflow-hidden"
          style={{
            top: 0,
            left: 0,
            width: COVER_W,
            height: COVER_H,
            border: `1px solid ${hovered ? `rgba(${rgb},0.6)` : 'rgba(255,255,255,0.1)'}`,
            boxShadow: hovered
              ? `0 8px 22px rgba(0,0,0,0.6), 0 0 0 1px rgba(${rgb},0.25)`
              : '0 4px 12px rgba(0,0,0,0.6)',
            background: '#0e0e0f',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          {book.cover_url ? (
            <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">📖</div>
          )}
        </div>
      </div>

      {/* Text block */}
      <div className="flex flex-col min-w-0" style={{ paddingTop: 2 }}>
        <p
          className="text-white leading-snug"
          style={{
            fontFamily: "'Kreon', serif",
            fontWeight: 700,
            fontSize: '0.92rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {book.title}
        </p>
        {book.author && (
          <p className="truncate mt-0.5" style={{ fontSize: '0.74rem', color: `rgba(${rgb},0.85)` }}>
            {book.author}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5" style={{ fontFamily: "'Kreon', serif" }}>
          {hasDuration && (
            <span
              className="inline-flex items-center rounded-full"
              style={{
                fontSize: '0.68rem',
                padding: '1px 8px',
                color: `rgba(${rgb},0.95)`,
                background: `rgba(${rgb},0.12)`,
                border: `1px solid rgba(${rgb},0.25)`,
              }}
            >
              {durDays} {durDays === 1 ? 'day' : 'days'}
            </span>
          )}
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.32)' }}>
            {hasDuration ? fmtRange(startT, finishT) : fmtDay(finishT)}
          </span>
        </div>
      </div>
    </>
  )
}

function BookCard({ placed, hovered, onHover, onOpen }: {
  placed: Placed
  hovered: boolean
  onHover: (id: number | null) => void
  onOpen: () => void
}) {
  const left = AXIS_W + placed.lane * (LANE_W + LANE_GAP)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      onMouseEnter={() => onHover(placed.book.book_id)}
      onMouseLeave={() => onHover(null)}
      className="absolute flex cursor-pointer select-none"
      style={{
        left,
        top: placed.top,
        width: LANE_W,
        gap: 14,
        transform: hovered ? 'translateX(2px)' : 'none',
        transition: 'transform 0.15s ease',
        zIndex: hovered ? 30 : 5,
      }}
    >
      <CardInner span={placed} hovered={hovered} />
    </div>
  )
}

// --- Mobile list ------------------------------------------------------------
// The parallel-lane chart needs ~580px; below the sm breakpoint we render a
// single chronological column with month separators instead.
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 639px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = () => setNarrow(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return narrow
}

function MobileList({ books, onOpen }: { books: CompletedBook[]; onOpen: (b: CompletedBook) => void }) {
  const rows = useMemo(() => {
    const spans = buildSpans(books).sort((a, b) => a.startT - b.startT || a.finishT - b.finishT)
    return spans.map((span) => ({
      ...span,
      barH: span.hasDuration ? Math.max(span.durDays * PX_PER_DAY, MIN_BAR_H) : COVER_H,
    }))
  }, [books])

  let lastMonthKey = ''
  return (
    <div className="flex flex-col gap-5 pb-6">
      {rows.map((span) => {
        const d = new Date(span.startT)
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`
        const showMonth = monthKey !== lastMonthKey
        const isJan = d.getMonth() === 0
        const label = showMonth && (lastMonthKey === '' || isJan)
          ? `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
          : MONTH_NAMES[d.getMonth()]
        lastMonthKey = monthKey
        return (
          <Fragment key={span.book.book_id}>
            {showMonth && (
              <div className="flex items-center gap-3 mt-2">
                <span
                  className="uppercase"
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    color: 'rgba(210,180,140,0.55)',
                    fontFamily: "'Kreon', serif",
                  }}
                >
                  {label}
                </span>
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            )}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onOpen(span.book)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(span.book) } }}
              className="flex cursor-pointer select-none"
              style={{ gap: 14 }}
            >
              <CardInner span={span} hovered={false} />
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}

// --- Chart ------------------------------------------------------------------
function Chart({ books, onOpen }: { books: CompletedBook[]; onOpen: (b: CompletedBook) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const { placed, numLanes, height, markers, segs } = useMemo(() => {
    const spans = buildSpans(books)
    const scale = buildScale(spans)
    const { placed, numLanes, height } = layout(spans, scale)
    return { placed, numLanes, height, markers: buildMarkers(scale), segs: scale.segs }
  }, [books])

  const chartWidth = AXIS_W + numLanes * LANE_W + (numLanes - 1) * LANE_GAP

  return (
    <div className="overflow-x-auto pb-6">
      <div className="relative mx-auto" style={{ width: chartWidth, height, minWidth: chartWidth }}>
        {/* Vertical axis spine */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: AXIS_W - 1, width: 1, background: 'rgba(255,255,255,0.08)' }}
        />

        {/* Compressed-gap breaks */}
        {segs.filter((s) => s.type === 'gap').map((s, i) => (
          <div key={`gap-${i}`} className="absolute flex items-center" style={{ left: AXIS_W - 1, top: s.y0, height: s.y1 - s.y0, width: 120 }}>
            <div className="h-full" style={{ width: 1, borderLeft: '1px dashed rgba(255,255,255,0.12)' }} />
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.22)', marginLeft: 8, fontFamily: "'Kreon', serif", whiteSpace: 'nowrap' }}>
              {s.days >= 14 ? `${Math.round(s.days / 7)} wks` : `${s.days} days`}
            </span>
          </div>
        ))}

        {/* Month / year markers + faint gridlines */}
        {markers.map((m, i) => (
          <div key={i} className="absolute" style={{ top: m.y, left: 0, right: 0, height: 0 }}>
            <div
              className="absolute"
              style={{ left: AXIS_W, right: 0, top: 0, borderTop: '1px solid rgba(255,255,255,0.035)' }}
            />
            <span
              className="absolute"
              style={{
                left: 0,
                top: -6,
                width: AXIS_W - 10,
                textAlign: 'right',
                fontSize: m.year ? '0.7rem' : '0.62rem',
                fontWeight: m.year ? 600 : 400,
                letterSpacing: '0.06em',
                color: m.year ? 'rgba(210,180,140,0.55)' : 'rgba(255,255,255,0.22)',
                fontFamily: m.year ? undefined : "'Kreon', serif",
              }}
            >
              {m.label}
            </span>
          </div>
        ))}

        {/* Book cards */}
        {placed.map((p) => (
          <BookCard
            key={p.book.book_id}
            placed={p}
            hovered={hovered === p.book.book_id}
            onHover={setHovered}
            onOpen={() => onOpen(p.book)}
          />
        ))}
      </div>
    </div>
  )
}

// --- Page -------------------------------------------------------------------
export default function Timeline() {
  const [books, setBooks] = useState<CompletedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<JournalBook | null>(null)
  const isNarrow = useIsNarrow()

  useEffect(() => {
    fetchJSON<CompletedBook[]>('/api/books/completed')
      .then((data) => { setBooks(data); setError(null) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const hasData = books.some((b) => b.finished_at)

  return (
    <div className="flex-1 p-5 min-h-0 overflow-y-auto" style={{ background: '#0c0c0c' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="pt-8 pb-5">
          <div className="flex items-center gap-5">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <div className="text-center">
              <h2 className="text-lg sm:text-2xl font-black tracking-[.2em] sm:tracking-[.35em] uppercase text-white">Timeline</h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
                <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
                <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
                <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>
            </div>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.12))' }} />
          </div>
          {hasData && (
            <p className="text-center mt-3" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', fontFamily: "'Kreon', serif", letterSpacing: '0.04em' }}>
              bar length = days spent<span className="hidden sm:inline"> · side-by-side = read at the same time</span>
            </p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
          </div>
        )}

        {!loading && !error && !hasData && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No completed books yet.</p>
          </div>
        )}

        {!loading && !error && hasData && (
          isNarrow
            ? <MobileList books={books} onOpen={setSelected} />
            : <Chart books={books} onOpen={setSelected} />
        )}
      </div>

      {selected && <JournalModal book={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
