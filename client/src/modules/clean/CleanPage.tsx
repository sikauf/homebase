import { useEffect, useState } from 'react'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayIso(): string {
  const d = new Date()
  return toIso(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function CleanPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [cleanDays, setCleanDays] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clean/days')
      .then((r) => r.json())
      .then((dates: string[]) => { setCleanDays(new Set(dates)); setError(null) })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  async function toggleDay(iso: string) {
    const isClean = cleanDays.has(iso)
    // Optimistic update
    setCleanDays((prev) => {
      const next = new Set(prev)
      isClean ? next.delete(iso) : next.add(iso)
      return next
    })
    try {
      if (isClean) {
        const r = await fetch(`/api/clean/days/${iso}`, { method: 'DELETE' })
        if (!r.ok) throw new Error()
      } else {
        const r = await fetch('/api/clean/days', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: iso }),
        })
        if (!r.ok) throw new Error()
      }
    } catch {
      // Revert on failure
      setCleanDays((prev) => {
        const next = new Set(prev)
        isClean ? next.add(iso) : next.delete(iso)
        return next
      })
    }
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
    if (isCurrentMonth) return
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const monthName = new Date(year, month, 1).toLocaleString('en-US', { month: 'long' })
  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = todayIso()

  // Build grid cells: leading blanks + days
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  // Count clean days in this month
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  const cleanThisMonth = [...cleanDays].filter((d) => d.startsWith(monthPrefix)).length

  return (
    <div className="flex-1 flex p-5 min-h-0 overflow-y-auto" style={{ background: '#0c0c0c' }}>
      <div className="flex-1 flex flex-col items-center" style={{ background: '#0c0c0c' }}>

        {/* Header */}
        <div className="w-full max-w-lg px-7 pt-8 pb-6 shrink-0">
          <div className="flex items-center gap-5">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-[.35em] uppercase text-white">Clean</h2>
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

        {error && (
          <p className="text-sm mb-4" style={{ color: '#f87171' }}>{error}</p>
        )}

        {/* Calendar card */}
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              ‹
            </button>

            <div className="text-center">
              <p className="text-white font-semibold" style={{ fontFamily: "'Kreon', serif", fontSize: '1.1rem' }}>
                {monthName} {year}
              </p>
              {cleanThisMonth > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(74,222,128,0.7)' }}>
                  {cleanThisMonth} {cleanThisMonth === 1 ? 'day' : 'days'} clean
                </p>
              )}
            </div>

            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{
                color: isCurrentMonth ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
                cursor: isCurrentMonth ? 'default' : 'pointer',
                background: 'transparent',
              }}
              onMouseEnter={(e) => { if (!isCurrentMonth) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              ›
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 px-4 pt-4 pb-2">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="text-center text-xs font-medium pb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1 px-4 pb-4">
            {loading
              ? Array.from({ length: 35 }, (_, i) => (
                  <div key={i} className="aspect-square rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))
              : cells.map((day, i) => {
                  if (day === null) return <div key={i} />
                  const iso = toIso(year, month, day)
                  const isClean = cleanDays.has(iso)
                  const isToday = iso === todayStr
                  const isFuture = iso > todayStr
                  return (
                    <button
                      key={iso}
                      onClick={() => { if (!isFuture) toggleDay(iso) }}
                      disabled={isFuture}
                      className="aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all"
                      style={{
                        background: isClean
                          ? 'rgba(74,222,128,0.2)'
                          : isToday
                          ? 'rgba(255,255,255,0.06)'
                          : 'transparent',
                        color: isClean
                          ? 'rgb(74,222,128)'
                          : isToday
                          ? 'rgba(255,255,255,0.9)'
                          : isFuture
                          ? 'rgba(255,255,255,0.15)'
                          : 'rgba(255,255,255,0.55)',
                        border: isToday ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                        cursor: isFuture ? 'default' : 'pointer',
                        boxShadow: isClean ? '0 0 12px rgba(74,222,128,0.15)' : 'none',
                      }}
                    >
                      {day}
                    </button>
                  )
                })}
          </div>
        </div>

      </div>
    </div>
  )
}
