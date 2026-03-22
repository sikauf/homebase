import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import { fetchRounds } from '../../api/golf'
import type { GolfRound } from '../../types/golf'

const COMING_SOON = [
  { label: 'Books', icon: '📚', desc: 'Track your reading list and reviews.' },
  { label: 'Fitness', icon: '💪', desc: 'Log workouts and monitor progress.' },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function HomePage() {
  const [lastRound, setLastRound] = useState<GolfRound | null>(null)

  useEffect(() => {
    fetchRounds()
      .then((rounds) => setLastRound(rounds[0] ?? null))
      .catch(() => {})
  }, [])

  const today = formatDate(new Date().toISOString())

  return (
    <PageWrapper title="Home" subtitle="Welcome back" dark>
      {/* Welcome card */}
      <div className="rounded-2xl px-7 py-6 mb-6" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Today is</p>
        <p className="text-2xl font-bold text-white">{today}</p>
      </div>

      {/* Last golf round */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Recent Activity
        </h2>
        {lastRound ? (
          <Link to="/golf" className="block">
            <div
              className="rounded-xl p-5 transition-colors"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg">⛳</span>
                    <h3 className="font-semibold text-white">{lastRound.course}</h3>
                  </div>
                  <p className="text-sm ml-7" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatShortDate(lastRound.played_at)}</p>
                </div>
                {lastRound.score != null && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white" style={{ fontFamily: "'Kreon', serif" }}>{lastRound.score}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>par {lastRound.par}</p>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-xl p-5 text-center" style={{ background: '#1a1a1a', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No recent activity yet.</p>
          </div>
        )}
      </div>

      {/* Coming soon */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Coming Soon
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COMING_SOON.map((m) => (
            <div
              key={m.label}
              className="rounded-xl p-5"
              style={{ background: '#1a1a1a', border: '1px dashed rgba(255,255,255,0.08)', opacity: 0.5 }}
            >
              <p className="text-2xl mb-2">{m.icon}</p>
              <p className="font-semibold text-white">{m.label}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
