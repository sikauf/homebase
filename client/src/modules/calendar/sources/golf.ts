import { CalendarSource, CalendarEvent, CalendarSpan, getJSON } from '../types'

interface Round { id: number; course: string; score: number; played_at: string }
interface RangeDay { date: string; types: string[] }
interface TeeTime { id: number; course: string; date: string }
interface Trip { id: number; name: string; start_date: string; end_date: string }

const RANGE_TYPES: Record<string, { label: string; color: string }> = {
  ball_striking: { label: 'Range — ball striking', color: 'rgb(251,191,36)' },
  putting: { label: 'Range — putting', color: 'rgb(74,222,128)' },
  chipping: { label: 'Range — chipping', color: 'rgb(96,165,250)' },
}

const ROUND_COLOR = 'rgb(52,211,153)'

const golf: CalendarSource = {
  id: 'golf',
  label: 'Golf',
  icon: '⛳',
  color: ROUND_COLOR,
  async fetch() {
    const [rounds, rangeDays, teeTimes, trips] = await Promise.all([
      getJSON<Round[]>('/api/golf/rounds'),
      getJSON<RangeDay[]>('/api/golf/range-days'),
      getJSON<TeeTime[]>('/api/golf/tee-times'),
      getJSON<Trip[]>('/api/golf/trips'),
    ])

    const events: CalendarEvent[] = [
      ...rounds.map((r) => {
        const label = `${r.course} — ${r.score}`
        return {
          // played_at is a 'YYYY-MM-DD HH:MM:SS' datetime, not a bare date
          date: r.played_at.slice(0, 10),
          label,
          color: ROUND_COLOR,
          chip: { label, short: String(r.score) },
        }
      }),
      ...rangeDays.flatMap((d) =>
        d.types.map((t) => ({
          date: d.date,
          label: RANGE_TYPES[t]?.label ?? `Range — ${t}`,
          color: RANGE_TYPES[t]?.color ?? 'rgba(255,255,255,0.5)',
        }))
      ),
      ...teeTimes.map((t) => ({
        date: t.date,
        label: `Tee time — ${t.course}`,
        color: ROUND_COLOR,
        future: true,
      })),
    ]

    const spans: CalendarSpan[] = trips.map((t) => ({
      startDate: t.start_date,
      endDate: t.end_date,
      label: `⛳ ${t.name}`,
      color: ROUND_COLOR,
    }))

    return { events, spans }
  },
}

export default golf
