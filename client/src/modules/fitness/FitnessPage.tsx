import { useEffect, useState } from 'react'

const WORKOUT_TYPES = [
  { id: 'core',      label: 'Core',      color: '#fb923c' },
  { id: 'cardio',    label: 'Cardio',    color: '#f87171' },
  { id: 'legs',      label: 'Legs',      color: '#a78bfa' },
  { id: 'shoulders', label: 'Shoulders', color: '#38bdf8' },
  { id: 'triceps',   label: 'Triceps',   color: '#2dd4bf' },
  { id: 'biceps',    label: 'Biceps',    color: '#4ade80' },
  { id: 'chest',     label: 'Chest',     color: '#f472b6' },
  { id: 'back',      label: 'Back',      color: '#818cf8' },
]

const TYPE_COLOR: Record<string, string> = Object.fromEntries(WORKOUT_TYPES.map((t) => [t.id, t.color]))

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayIso() {
  const d = new Date()
  return toIso(d.getFullYear(), d.getMonth(), d.getDate())
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function FitnessPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [workouts, setWorkouts] = useState<Map<string, Set<string>>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/fitness/workouts')
      .then((r) => r.json())
      .then((rows: { date: string; type: string }[]) => {
        const map = new Map<string, Set<string>>()
        for (const { date, type } of rows) {
          if (!map.has(date)) map.set(date, new Set())
          map.get(date)!.add(type)
        }
        setWorkouts(map)
        setError(null)
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  async function toggleWorkout(iso: string, type: string) {
    const hasIt = workouts.get(iso)?.has(type) ?? false
    setWorkouts((prev) => {
      const next = new Map(prev)
      const types = new Set(next.get(iso) ?? [])
      hasIt ? types.delete(type) : types.add(type)
      types.size === 0 ? next.delete(iso) : next.set(iso, types)
      return next
    })
    try {
      if (hasIt) {
        const r = await fetch(`/api/fitness/workouts/${iso}/${type}`, { method: 'DELETE' })
        if (!r.ok) throw new Error()
      } else {
        const r = await fetch('/api/fitness/workouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: iso, type }),
        })
        if (!r.ok) throw new Error()
      }
    } catch {
      setWorkouts((prev) => {
        const next = new Map(prev)
        const types = new Set(next.get(iso) ?? [])
        hasIt ? types.add(type) : types.delete(type)
        types.size === 0 ? next.delete(iso) : next.set(iso, types)
        return next
      })
    }
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (isCurrentMonth) return
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  const todayStr = todayIso()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const monthName = new Date(year, month, 1).toLocaleString('en-US', { month: 'long' })
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // Streak: consecutive days up to today (lenient — skip today if not yet logged)
  let streak = 0
  const checkDate = new Date(today)
  if (!workouts.has(todayStr)) checkDate.setDate(checkDate.getDate() - 1)
  while (true) {
    const iso = toIso(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate())
    if (workouts.has(iso)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // This month
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  const workoutDaysThisMonth = [...workouts.keys()].filter((d) => d.startsWith(monthPrefix)).length
  const monthTypeCounts = new Map<string, number>()
  for (const [date, types] of workouts) {
    if (!date.startsWith(monthPrefix)) continue
    for (const type of types) monthTypeCounts.set(type, (monthTypeCounts.get(type) ?? 0) + 1)
  }
  const monthTypesSorted = [...monthTypeCounts.entries()].sort((a, b) => b[1] - a[1])

  const selectedDayTypes = selectedDay ? (workouts.get(selectedDay) ?? new Set()) : new Set<string>()

  return (
    <div className="flex-1 flex p-5 min-h-0 overflow-y-auto" style={{ background: '#0c0c0c' }}>
      <div className="flex-1 flex flex-col items-center" style={{ background: '#0c0c0c' }}>

        {/* Page header */}
        <div className="w-full max-w-lg px-7 pt-8 pb-6 shrink-0">
          <div className="flex items-center gap-5">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-[.35em] uppercase text-white">Fitness</h2>
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

        {error && <p className="text-sm mb-4" style={{ color: '#f87171' }}>{error}</p>}

        {/* Dashboard stats */}
        <div className="w-full max-w-lg grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl p-4 flex flex-col items-center gap-1" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-3xl font-black text-white">{streak}</span>
            <span className="text-xs tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              day streak
            </span>
          </div>
          <div className="rounded-xl p-4 flex flex-col items-center gap-1" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-3xl font-black text-white">{workoutDaysThisMonth}</span>
            <span className="text-xs tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              days this month
            </span>
          </div>
        </div>

        {/* Calendar */}
        <div
          className="w-full max-w-lg mb-5 rounded-2xl overflow-hidden"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >‹</button>
            <p className="text-white font-semibold" style={{ fontFamily: "'Kreon', serif", fontSize: '1.1rem' }}>
              {monthName} {year}
            </p>
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
            >›</button>
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
                  const dayTypes = workouts.get(iso)
                  const hasWorkout = (dayTypes?.size ?? 0) > 0
                  const isToday = iso === todayStr
                  const isFuture = iso > todayStr
                  const dotTypes = dayTypes ? [...dayTypes].slice(0, 3) : []
                  const overflow = (dayTypes?.size ?? 0) - dotTypes.length

                  return (
                    <button
                      key={iso}
                      onClick={() => { if (!isFuture) setSelectedDay(iso) }}
                      disabled={isFuture}
                      className="rounded-lg flex flex-col items-center justify-center py-1 gap-0.5 transition-all"
                      style={{
                        minHeight: '3rem',
                        background: hasWorkout
                          ? 'rgba(255,255,255,0.05)'
                          : isToday
                          ? 'rgba(255,255,255,0.06)'
                          : 'transparent',
                        border: isToday ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                        cursor: isFuture ? 'default' : 'pointer',
                        color: isFuture ? 'rgba(255,255,255,0.15)' : hasWorkout ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
                      }}
                      onMouseEnter={(e) => { if (!isFuture) e.currentTarget.style.background = hasWorkout ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = hasWorkout ? 'rgba(255,255,255,0.05)' : isToday ? 'rgba(255,255,255,0.06)' : 'transparent' }}
                    >
                      <span className="text-sm font-medium leading-none">{day}</span>
                      {dotTypes.length > 0 && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {dotTypes.map((type) => (
                            <div
                              key={type}
                              className="w-1 h-1 rounded-full"
                              style={{ background: TYPE_COLOR[type] }}
                            />
                          ))}
                          {overflow > 0 && (
                            <span className="text-[9px] leading-none" style={{ color: 'rgba(255,255,255,0.35)' }}>+{overflow}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
          </div>
        </div>

        {/* Month type breakdown */}
        {monthTypesSorted.length > 0 && (
          <div
            className="w-full max-w-lg rounded-2xl px-5 py-4 flex flex-col gap-2.5"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {monthName}
            </p>
            {monthTypesSorted.map(([type, count]) => {
              const max = monthTypesSorted[0][1]
              const pct = (count / max) * 100
              return (
                <div key={type} className="flex items-center gap-3">
                  <span
                    className="text-xs capitalize font-medium w-16 shrink-0 text-right"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    {type}
                  </span>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: '5px', background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: TYPE_COLOR[type], opacity: 0.75 }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-5 shrink-0 text-right" style={{ color: TYPE_COLOR[type] }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Spacer */}
        <div className="h-8" />
      </div>

      {/* Day editor modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="rounded-2xl p-6 w-80"
            style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {selectedDay === todayStr ? 'Today' : selectedDay < todayStr ? 'Log workout' : ''}
              </p>
              <h3 className="text-white font-semibold text-base">{formatDate(selectedDay)}</h3>
            </div>

            {(() => {
              const btn = (id: string, label: string, color: string) => {
                const active = selectedDayTypes.has(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleWorkout(selectedDay, id)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-all flex items-center gap-2"
                    style={{
                      background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
                      border: active ? `1px solid ${color}60` : '1px solid rgba(255,255,255,0.06)',
                      color: active ? color : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? color : 'rgba(255,255,255,0.15)' }} />
                    {label}
                  </button>
                )
              }
              return (
                <div className="flex flex-col gap-3">
                  {/* Push / Pull side by side */}
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-2">
                      <p className="text-[10px] tracking-widest uppercase px-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Push</p>
                      {btn('chest', 'Chest', TYPE_COLOR['chest'])}
                      {btn('triceps', 'Triceps', TYPE_COLOR['triceps'])}
                      {btn('shoulders', 'Shoulders', TYPE_COLOR['shoulders'])}
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <p className="text-[10px] tracking-widest uppercase px-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Pull</p>
                      {btn('biceps', 'Biceps', TYPE_COLOR['biceps'])}
                      {btn('back', 'Back', TYPE_COLOR['back'])}
                    </div>
                  </div>
                  {/* Other */}
                  <div className="grid grid-cols-3 gap-2">
                    {btn('core', 'Core', TYPE_COLOR['core'])}
                    {btn('cardio', 'Cardio', TYPE_COLOR['cardio'])}
                    {btn('legs', 'Legs', TYPE_COLOR['legs'])}
                  </div>
                </div>
              )
            })()}

            <button
              onClick={() => setSelectedDay(null)}
              className="mt-5 w-full rounded-xl py-2 text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
