import { useEffect, useRef, useState } from 'react'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TYPES = [
  { key: 'ball_striking', label: 'Ball striking', rgb: '251,191,36' },
  { key: 'putting',       label: 'Putting',       rgb: '74,222,128' },
  { key: 'chipping',      label: 'Chipping',      rgb: '96,165,250' },
] as const

type TypeKey = typeof TYPES[number]['key']

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayIso(): string {
  const d = new Date()
  return toIso(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function RangeCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [days, setDays] = useState<Map<string, Set<TypeKey>>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openIso, setOpenIso] = useState<string | null>(null)
  const requestChain = useRef<Map<string, Promise<unknown>>>(new Map())

  useEffect(() => {
    fetch('/api/golf/range-days')
      .then((r) => r.json())
      .then((data: { date: string; types: TypeKey[] }[]) => {
        const next = new Map<string, Set<TypeKey>>()
        for (const item of data) next.set(item.date, new Set(item.types))
        setDays(next)
        setError(null)
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  function toggleType(iso: string, type: TypeKey) {
    const current = days.get(iso) ?? new Set<TypeKey>()
    const had = current.has(type)
    const optimistic = new Set(current)
    if (had) optimistic.delete(type)
    else optimistic.add(type)

    setDays((prev) => {
      const m = new Map(prev)
      if (optimistic.size === 0) m.delete(iso)
      else m.set(iso, optimistic)
      return m
    })

    const key = `${iso}:${type}`
    const prevTask = requestChain.current.get(key) ?? Promise.resolve()
    const task: Promise<unknown> = prevTask.catch(() => {}).then(async () => {
      try {
        if (had) {
          const r = await fetch(`/api/golf/range-days/${iso}/${type}`, { method: 'DELETE' })
          if (!r.ok) throw new Error()
        } else {
          const r = await fetch('/api/golf/range-days', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: iso, type }),
          })
          if (!r.ok) throw new Error()
        }
      } catch {
        if (requestChain.current.get(key) === task) {
          setDays((prev) => {
            const m = new Map(prev)
            const restored = new Set(m.get(iso) ?? [])
            if (had) restored.add(type)
            else restored.delete(type)
            if (restored.size === 0) m.delete(iso)
            else m.set(iso, restored)
            return m
          })
        }
        throw new Error()
      }
    })
    requestChain.current.set(key, task)
  }

  function prevMonth() {
    setOpenIso(null)
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    setOpenIso(null)
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
    if (isCurrentMonth) return
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const monthName = new Date(year, month, 1).toLocaleString('en-US', { month: 'long' })
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = todayIso()

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  const countThisMonth = [...days.keys()].filter((d) => d.startsWith(monthPrefix)).length

  return (
    <div className="flex-1 flex p-5 min-h-0 overflow-y-auto" style={{ background: '#0c0c0c' }}>
      <div className="flex-1 flex flex-col items-center" style={{ background: '#0c0c0c' }}>

        <div className="w-full max-w-lg px-7 pt-8 pb-6 shrink-0">
          <div className="flex items-center gap-5">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-[.35em] uppercase text-white">Range</h2>
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

        <div
          className="w-full max-w-lg rounded-2xl overflow-visible relative"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
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
              {countThisMonth > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {countThisMonth} {countThisMonth === 1 ? 'day' : 'days'} at the range
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

          <div className="flex items-center justify-center gap-4 px-6 pt-3 pb-1">
            {TYPES.map((t) => (
              <div key={t.key} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: `rgb(${t.rgb})` }} />
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-4 pt-3 pb-2">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="text-center text-xs font-medium pb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-4 pb-4">
            {loading
              ? Array.from({ length: 35 }, (_, i) => (
                  <div key={i} className="aspect-square rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))
              : cells.map((day, i) => {
                  if (day === null) return <div key={i} />
                  const iso = toIso(year, month, day)
                  const marked = days.get(iso)
                  const hasAny = marked !== undefined && marked.size > 0
                  const isToday = iso === todayStr
                  const isFuture = iso > todayStr
                  const isOpen = openIso === iso
                  return (
                    <div key={iso} className="relative">
                      <button
                        onClick={() => { if (!isFuture) setOpenIso(isOpen ? null : iso) }}
                        disabled={isFuture}
                        className="aspect-square w-full rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all"
                        style={{
                          background: hasAny
                            ? 'rgba(255,255,255,0.08)'
                            : isToday
                            ? 'rgba(255,255,255,0.06)'
                            : 'transparent',
                          color: isFuture
                            ? 'rgba(255,255,255,0.15)'
                            : hasAny
                            ? 'rgba(255,255,255,0.95)'
                            : isToday
                            ? 'rgba(255,255,255,0.9)'
                            : 'rgba(255,255,255,0.55)',
                          border: isOpen
                            ? '1px solid rgba(255,255,255,0.4)'
                            : isToday
                            ? '1px solid rgba(255,255,255,0.15)'
                            : '1px solid transparent',
                          cursor: isFuture ? 'default' : 'pointer',
                        }}
                      >
                        <span>{day}</span>
                        <div className="flex gap-1 mt-0.5 h-1.5">
                          {TYPES.map((t) => (
                            marked?.has(t.key) ? (
                              <div
                                key={t.key}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: `rgb(${t.rgb})`, boxShadow: `0 0 6px rgba(${t.rgb},0.6)` }}
                              />
                            ) : null
                          ))}
                        </div>
                      </button>

                      {isOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenIso(null)}
                          />
                          <div
                            className="absolute z-50 left-1/2 -translate-x-1/2 mt-1 rounded-lg p-1.5 flex flex-col gap-1 min-w-[140px]"
                            style={{
                              top: '100%',
                              background: '#222',
                              border: '1px solid rgba(255,255,255,0.12)',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            }}
                          >
                            {TYPES.map((t) => {
                              const on = marked?.has(t.key) ?? false
                              return (
                                <button
                                  key={t.key}
                                  onClick={() => toggleType(iso, t.key)}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-left transition-colors"
                                  style={{
                                    background: on ? `rgba(${t.rgb},0.18)` : 'transparent',
                                    color: on ? `rgb(${t.rgb})` : 'rgba(255,255,255,0.7)',
                                  }}
                                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent' }}
                                >
                                  <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: on ? `rgb(${t.rgb})` : 'rgba(255,255,255,0.2)' }}
                                  />
                                  <span>{t.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
          </div>
        </div>

      </div>
    </div>
  )
}
