import { useMemo } from 'react'
import { assignSpanLanes, monthWeeks, spanSegmentsForWeek } from './dates'
import type { CalendarEvent, CalendarSpan } from './types'

export interface SourcedEvent extends CalendarEvent { sourceId: string }
export interface SourcedSpan extends CalendarSpan { sourceId: string }

const MAX_LANES = 3
const LANE_H = 15   // px per ribbon lane
const DAYNUM_H = 24 // px reserved for the day number row
const MAX_DOTS = 6
const CHIP_H = 13   // px per labeled in-cell chip

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function MonthGrid({ year, month, today, selected, onSelect, eventsByDate, spans }: {
  year: number
  month: number
  today: string
  selected: string
  onSelect: (iso: string) => void
  eventsByDate: Map<string, SourcedEvent[]>
  spans: SourcedSpan[]
}) {
  const weeks = useMemo(() => monthWeeks(year, month), [year, month])
  const lanes = useMemo(() => assignSpanLanes(spans, today), [spans, today])
  const laneCount = Math.min(Math.max(0, ...[...lanes.values()].map((l) => l + 1)), MAX_LANES)

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-2 text-center text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {d}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => {
        const segments = spanSegmentsForWeek(spans, lanes, week, today)
        const hiddenCount = segments.filter((s) => s.lane >= MAX_LANES).length

        return (
          <div key={wi} className="relative grid grid-cols-7" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Ribbon layer — absolutely positioned over the week row */}
            {segments.filter((s) => s.lane < MAX_LANES).map((seg, si) => (
              <div
                key={si}
                className="absolute pointer-events-none flex items-center overflow-hidden"
                style={{
                  top: DAYNUM_H + seg.lane * LANE_H,
                  left: `calc(${(seg.colStart / 7) * 100}% + 2px)`,
                  width: `calc(${((seg.colEnd - seg.colStart + 1) / 7) * 100}% - 4px)`,
                  height: LANE_H - 3,
                  background: `color-mix(in srgb, ${seg.span.color} 30%, transparent)`,
                  borderLeft: seg.capStart ? `3px solid ${seg.span.color}` : 'none',
                  borderRadius: `${seg.capStart ? 6 : 0}px ${seg.capEnd ? 6 : 0}px ${seg.capEnd ? 6 : 0}px ${seg.capStart ? 6 : 0}px`,
                }}
              >
                {(seg.capStart || seg.colStart === 0) && (
                  <span
                    className="hidden sm:block truncate px-1.5"
                    style={{ fontSize: 9, lineHeight: 1, color: 'rgba(255,255,255,0.85)' }}
                  >
                    {seg.span.label}
                  </span>
                )}
              </div>
            ))}
            {hiddenCount > 0 && (
              <span
                className="absolute right-1 pointer-events-none"
                style={{ top: DAYNUM_H + MAX_LANES * LANE_H - 12, fontSize: 8, color: 'rgba(255,255,255,0.35)' }}
              >
                +{hiddenCount}
              </span>
            )}

            {week.map((iso, di) => {
              if (!iso) return <div key={di} />
              const events = eventsByDate.get(iso) ?? []
              const chips = events.filter((e) => e.chip)
              const dots = events.filter((e) => !e.chip)
              const isToday = iso === today
              const isSelected = iso === selected
              const isFuture = iso > today
              return (
                <button
                  key={di}
                  type="button"
                  onClick={() => onSelect(iso)}
                  className="relative flex flex-col items-stretch text-left min-h-[74px] sm:min-h-[86px] pb-1"
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                    boxShadow: isSelected ? 'inset 0 0 0 1px rgba(255,255,255,0.25)' : 'none',
                    borderRadius: 8,
                  }}
                >
                  <span className="flex items-center justify-center self-start m-1 rounded-full tabular-nums"
                    style={{
                      width: 18,
                      height: 18,
                      fontSize: 11,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? '#0c0c0c' : isFuture ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)',
                      background: isToday ? 'rgba(255,255,255,0.85)' : 'transparent',
                    }}
                  >
                    {Number(iso.slice(8, 10))}
                  </span>
                  {/* spacer under the ribbon layer */}
                  <div style={{ height: laneCount * LANE_H }} />
                  <div className="flex flex-col gap-[2px] px-1 mt-auto">
                    {chips.map((e, ei) => (
                      <span
                        key={`chip-${ei}`}
                        className="block truncate"
                        style={{
                          fontSize: 9,
                          lineHeight: `${CHIP_H}px`,
                          paddingLeft: 4,
                          paddingRight: 3,
                          color: 'rgba(255,255,255,0.85)',
                          background: `color-mix(in srgb, ${e.color} 30%, transparent)`,
                          borderLeft: `3px solid ${e.color}`,
                          borderRadius: 6,
                        }}
                      >
                        <span className="sm:hidden">{e.chip!.short ?? e.chip!.label}</span>
                        <span className="hidden sm:inline">{e.chip!.label}</span>
                      </span>
                    ))}
                    {dots.length > 0 && (
                      <div className="flex flex-wrap items-center gap-[3px] px-0.5">
                        {dots.slice(0, MAX_DOTS).map((e, ei) => (
                          <span
                            key={ei}
                            className="rounded-full"
                            style={{
                              width: 6,
                              height: 6,
                              background: e.future ? 'transparent' : e.color,
                              border: e.future ? `1.5px solid ${e.color}` : 'none',
                            }}
                          />
                        ))}
                        {dots.length > MAX_DOTS && (
                          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>+{dots.length - MAX_DOTS}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
