import { useEffect, useMemo, useState } from 'react'
import { daysBetween, parseLocal, todayIso } from './dates'
import MonthGrid, { SourcedEvent, SourcedSpan } from './MonthGrid'
import { sources } from './sources'
import type { CalendarEvent, CalendarSpan } from './types'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface SourceData { events: CalendarEvent[]; spans: CalendarSpan[] }

export default function CalendarPage() {
  const today = todayIso()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState(today)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [data, setData] = useState<Map<string, SourceData>>(new Map())
  const [failed, setFailed] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled(sources.map((s) => s.fetch())).then((results) => {
      const loaded = new Map<string, SourceData>()
      const errors: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          loaded.set(sources[i].id, { events: r.value.events, spans: r.value.spans ?? [] })
        } else {
          errors.push(sources[i].label)
        }
      })
      setData(loaded)
      setFailed(errors)
      setLoading(false)
    })
  }, [])

  const { eventsByDate, spans } = useMemo(() => {
    const byDate = new Map<string, SourcedEvent[]>()
    const allSpans: SourcedSpan[] = []
    for (const source of sources) {
      if (hidden.has(source.id)) continue
      const d = data.get(source.id)
      if (!d) continue
      for (const e of d.events) {
        const list = byDate.get(e.date) ?? []
        list.push({ ...e, sourceId: source.id })
        byDate.set(e.date, list)
      }
      for (const s of d.spans) allSpans.push({ ...s, sourceId: source.id })
    }
    return { eventsByDate: byDate, spans: allSpans }
  }, [data, hidden])

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function jumpToday() {
    const now = new Date()
    setCursor({ year: now.getFullYear(), month: now.getMonth() })
    setSelected(today)
  }

  function toggleSource(id: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex-1 min-h-screen" style={{ background: '#0c0c0c' }}>
      <div className="max-w-3xl mx-auto px-3 pb-10 sm:px-6">
        {/* Ornament header, same family as Fitness/Clean */}
        <div className="px-1 pt-6 pb-5 sm:pt-8 sm:pb-6">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <div className="text-center">
              <h2 className="text-lg sm:text-2xl font-black tracking-[.2em] sm:tracking-[.35em] uppercase text-white">Calendar</h2>
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
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.6)' }}>‹</button>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.6)' }}>›</button>
            <h3 className="ml-2 text-base sm:text-lg font-semibold text-white">
              {MONTH_NAMES[cursor.month]} <span style={{ color: 'rgba(255,255,255,0.4)' }}>{cursor.year}</span>
            </h3>
          </div>
          <button type="button" onClick={jumpToday}
            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Today
          </button>
        </div>

        {/* Legend / source filters — derived from the registry */}
        <div className="flex flex-wrap gap-2 mb-4 px-1">
          {sources.map((s) => {
            const off = hidden.has(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSource(s.id)}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-opacity"
                style={{
                  opacity: off ? 0.35 : 1,
                  color: 'rgba(255,255,255,0.75)',
                  background: `color-mix(in srgb, ${s.color} 14%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${s.color} 40%, transparent)`,
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            )
          })}
        </div>

        {failed.length > 0 && (
          <p className="mb-3 px-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Couldn't load: {failed.join(', ')}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
          </div>
        ) : (
          <>
            <MonthGrid
              year={cursor.year}
              month={cursor.month}
              today={today}
              selected={selected}
              onSelect={setSelected}
              eventsByDate={eventsByDate}
              spans={spans}
            />
            <DayDetail selected={selected} today={today} eventsByDate={eventsByDate} spans={spans} />
          </>
        )}
      </div>
    </div>
  )
}

function DayDetail({ selected, today, eventsByDate, spans }: {
  selected: string
  today: string
  eventsByDate: Map<string, SourcedEvent[]>
  spans: SourcedSpan[]
}) {
  const events = eventsByDate.get(selected) ?? []
  const activeSpans = spans.filter((s) => selected >= s.startDate && selected <= (s.endDate ?? today))
  const heading = parseLocal(selected).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const sourceById = new Map(sources.map((s) => [s.id, s]))

  const groups = sources
    .map((source) => ({ source, items: events.filter((e) => e.sourceId === source.id) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-sm font-semibold text-white">
        {heading}
        {selected === today && <span className="ml-2 text-xs font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>Today</span>}
      </p>

      {groups.length === 0 && activeSpans.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Nothing logged.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {activeSpans.map((span, i) => {
            const dayN = daysBetween(span.startDate, selected) + 1
            const total = span.endDate ? daysBetween(span.startDate, span.endDate) + 1 : null
            const icon = sourceById.get(span.sourceId)?.icon ?? ''
            return (
              <div key={`span-${i}`} className="flex items-center gap-2.5">
                <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: span.color }} />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {icon} {span.label}
                  <span className="ml-2 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    day {dayN}{total ? ` of ${total}` : ''}
                  </span>
                </p>
              </div>
            )
          })}
          {groups.map(({ source, items }) => (
            <div key={source.id} className="flex items-start gap-2.5">
              <span className="shrink-0 mt-0.5">{source.icon}</span>
              <div className="min-w-0">
                {items.map((e, i) => (
                  <p key={i} className="text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    <span className="shrink-0 rounded-full" style={{
                      width: 8, height: 8,
                      background: e.future ? 'transparent' : e.color,
                      border: e.future ? `1.5px solid ${e.color}` : 'none',
                    }} />
                    <span className="truncate">{e.label}{e.future ? ' (upcoming)' : ''}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
