import { useEffect, useState } from 'react'
import type { TeeTime } from '../../types/golf'
import { getCourseImage } from './courseImages'

interface Props {
  teeTimes: TeeTime[]
  onAdd: () => void
}

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dateToLocalMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

function daysUntil(iso: string, now: number): number {
  return Math.round((dateToLocalMs(iso) - now) / 86400000)
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function CountdownLabel({ diff }: { diff: number }) {
  if (diff === 0) return <span className="text-3xl font-black tracking-tight text-white">TODAY</span>
  if (diff === 1) return <span className="text-3xl font-black tracking-tight text-white">TOMORROW</span>
  if (diff === -1) return <span className="text-2xl font-black tracking-tight" style={{ color: 'rgba(255,255,255,0.55)' }}>YESTERDAY</span>
  const past = diff < 0
  const n = Math.abs(diff)
  return (
    <div className="flex items-baseline gap-2 leading-none">
      <span
        className="font-black tracking-tight"
        style={{
          fontFamily: "'Kreon', serif",
          fontSize: '2.75rem',
          color: past ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.95)',
        }}
      >
        {n}
      </span>
      <span
        className="text-xs uppercase tracking-[.25em]"
        style={{ color: past ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)' }}
      >
        {past ? 'days ago' : n === 1 ? 'day' : 'days'}
      </span>
    </div>
  )
}

function TeeTimeCard({ teeTime, now }: { teeTime: TeeTime; now: number }) {
  const img = getCourseImage(teeTime.course)
  const diff = daysUntil(teeTime.date, now)
  const past = diff < 0

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        height: '120px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: '#1a1a1a',
        opacity: past ? 0.7 : 1,
      }}
    >
      {img && (
        <img
          src={img.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: img.objectPosition ?? '50% 50%' }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: img
            ? 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.65) 100%)'
            : 'transparent',
        }}
      />
      <div className="relative h-full flex items-center justify-between px-6">
        <div>
          <p
            className="text-white font-bold text-lg leading-tight"
            style={{ fontFamily: "'Kreon', serif", textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
          >
            {teeTime.course}
          </p>
          <p
            className="text-xs uppercase tracking-[.2em] mt-1"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {formatLongDate(teeTime.date)}
          </p>
        </div>
        <CountdownLabel diff={diff} />
      </div>
    </div>
  )
}

export default function TeeTimesSection({ teeTimes, onAdd }: Props) {
  const [now, setNow] = useState(startOfToday())

  useEffect(() => {
    const id = setInterval(() => setNow(startOfToday()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs tracking-[.3em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Tee Times
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>

      {teeTimes.length === 0 ? (
        <div
          className="rounded-xl px-6 py-8 text-center"
          style={{ background: '#1a1a1a', border: '1px dashed rgba(255,255,255,0.1)' }}
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            No tee times scheduled. Add one to start the countdown.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {teeTimes.map((t) => (
            <TeeTimeCard key={t.id} teeTime={t} now={now} />
          ))}
        </div>
      )}
    </div>
  )
}
