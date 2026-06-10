import { useMemo, useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import AddTripModal from './AddTripModal'
import { useTrips } from '../../hooks/useTrips'
import { getCourseImage } from './courseImages'
import type { GolfTrip } from '../../types/golf'

function formatRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const startD = new Date(sy, sm - 1, sd)
  const endD = new Date(ey, em - 1, ed)
  const sameMonth = sy === ey && sm === em
  const sameYear = sy === ey
  const monthFmt: Intl.DateTimeFormatOptions = { month: 'short' }
  if (start === end) {
    return `${startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  if (sameMonth) {
    return `${startD.toLocaleDateString('en-US', monthFmt)} ${startD.getDate()}–${endD.getDate()}, ${ey}`
  }
  if (sameYear) {
    return `${startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${ey}`
  }
  return `${startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function startOfTodayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function tripStatus(trip: GolfTrip, today: string): 'upcoming' | 'in_progress' | 'completed' {
  if (today < trip.start_date) return 'upcoming'
  if (today > trip.end_date) return 'completed'
  return 'in_progress'
}

function statusLabel(s: ReturnType<typeof tripStatus>): string {
  if (s === 'upcoming') return 'Upcoming'
  if (s === 'in_progress') return 'In Progress'
  return 'Completed'
}

function TripCard({ trip, onDelete }: { trip: GolfTrip; onDelete: (id: number) => void }) {
  const today = startOfTodayIso()
  const status = tripStatus(trip, today)
  const courseImages = trip.courses.map((c) => ({ name: c, img: getCourseImage(c) }))

  return (
    <div
      className="mb-4 rounded-2xl overflow-hidden grid"
      style={{
        height: '240px',
        gridTemplateColumns: courseImages.length > 0 ? '1fr 2fr' : '1fr',
        gap: '1px',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset',
        opacity: status === 'completed' ? 0.85 : 1,
      }}
    >
      <div className="relative flex flex-col justify-between p-6" style={{ background: '#1a1a1a' }}>
        <div>
          <div className="flex items-start justify-between mb-3">
            <p
              className="text-xs tracking-[.4em] uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              {statusLabel(status)}
            </p>
            <button
              onClick={() => onDelete(trip.id)}
              className="p-1 rounded transition-colors"
              style={{ color: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
              title="Delete trip"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-white leading-tight mb-1" style={{ fontFamily: "'Kreon', serif" }}>
            {trip.name}
          </h3>
          {trip.location && (
            <p className="text-xs tracking-[.2em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {trip.location}
            </p>
          )}
          <p className="text-xs tracking-[.2em] uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {formatRange(trip.start_date, trip.end_date)}
          </p>
        </div>
        {trip.courses.length > 0 && (
          <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {trip.courses.length} {trip.courses.length === 1 ? 'course' : 'courses'}
          </p>
        )}
      </div>

      {courseImages.length > 0 && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${courseImages.length}, 1fr)`,
            gap: '1px',
            background: 'rgba(255,255,255,0.05)',
          }}
        >
          {courseImages.map(({ name, img }) => (
            <div key={name} className="relative overflow-hidden" style={{ background: '#1a1a1a' }}>
              {img ? (
                <img
                  src={img.image}
                  alt={name}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: img.objectPosition ?? '50% 50%' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                  <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{name}</span>
                </div>
              )}
              <div
                className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-10 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))' }}
              >
                <p
                  className="text-white text-sm tracking-wide"
                  style={{ fontFamily: "'Kreon', serif", fontWeight: 700, textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
                >
                  {name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TripsPage() {
  const { trips, loading, error, addTrip, removeTrip } = useTrips()
  const [showModal, setShowModal] = useState(false)

  const today = useMemo(() => startOfTodayIso(), [])
  const grouped = useMemo(() => {
    const upcoming: GolfTrip[] = []
    const past: GolfTrip[] = []
    for (const t of trips) {
      if (tripStatus(t, today) === 'completed') past.push(t)
      else upcoming.push(t)
    }
    upcoming.sort((a, b) => a.start_date.localeCompare(b.start_date))
    past.sort((a, b) => b.start_date.localeCompare(a.start_date))
    return { upcoming, past }
  }, [trips, today])

  return (
    <>
      <PageWrapper
        title="Trips"
        subtitle="Plan and remember your golf trips"
        dark
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Trip
          </button>
        }
      >
        {loading && <div className="text-center py-20 text-gray-400">Loading…</div>}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {trips.length === 0 && (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🏖️</p>
                <p className="text-gray-500 text-sm">No trips yet. Plan your next golf getaway.</p>
              </div>
            )}

            {grouped.upcoming.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Upcoming
                </h2>
                {grouped.upcoming.map((t) => <TripCard key={t.id} trip={t} onDelete={removeTrip} />)}
              </div>
            )}

            {grouped.past.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Completed
                </h2>
                {grouped.past.map((t) => <TripCard key={t.id} trip={t} onDelete={removeTrip} />)}
              </div>
            )}
          </>
        )}
      </PageWrapper>

      {showModal && (
        <AddTripModal onClose={() => setShowModal(false)} onSubmit={addTrip} />
      )}
    </>
  )
}
