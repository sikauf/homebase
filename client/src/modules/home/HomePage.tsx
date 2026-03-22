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
    <PageWrapper title="Home" subtitle="Welcome back">
      {/* Welcome card */}
      <div className="bg-gray-900 text-white rounded-2xl px-7 py-6 mb-6">
        <p className="text-gray-400 text-sm mb-1">Today is</p>
        <p className="text-2xl font-bold">{today}</p>
      </div>

      {/* Last golf round */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Recent Activity
        </h2>
        {lastRound ? (
          <Link to="/golf" className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg">⛳</span>
                    <h3 className="font-semibold text-gray-900">{lastRound.course}</h3>
                  </div>
                  <p className="text-sm text-gray-500 ml-7">{formatShortDate(lastRound.played_at)}</p>
                </div>
                {lastRound.score != null && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{lastRound.score}</p>
                    <p className="text-xs text-gray-400">par {lastRound.par}</p>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-400">No recent activity yet.</p>
          </div>
        )}
      </div>

      {/* Coming soon */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Coming Soon
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COMING_SOON.map((m) => (
            <div
              key={m.label}
              className="bg-white rounded-xl border border-dashed border-gray-200 p-5 opacity-60"
            >
              <p className="text-2xl mb-2">{m.icon}</p>
              <p className="font-semibold text-gray-700">{m.label}</p>
              <p className="text-xs text-gray-400 mt-1">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
