import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import RoundCard from './RoundCard'
import AddRoundModal from './AddRoundModal'
import MyrtieTripSection from './MyrtieTripSection'
import { useGolf } from '../../hooks/useGolf'

function StatPill({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-xl px-5 py-4 text-center" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
      <p className="text-2xl font-bold text-white" style={{ fontFamily: "'Kreon', serif" }}>{value ?? '—'}</p>
    </div>
  )
}

export default function Rounds() {
  const { rounds, stats, loading, error, addRound, removeRound } = useGolf()
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <PageWrapper
        title="Golf"
        subtitle="Track your rounds and stats"
        dark
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Round
          </button>
        }
      >
        {loading && (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <MyrtieTripSection />
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <StatPill label="Rounds" value={stats.total_rounds} />
                <StatPill label="Avg Score" value={stats.avg_score} />
                <StatPill label="Best Score" value={stats.best_score} />
                <StatPill label="Avg Putts" value={stats.avg_putts} />
              </div>
            )}

            {rounds.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">⛳</p>
                <p className="text-gray-500 text-sm">No rounds yet. Log your first round!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rounds.map((round) => (
                  <RoundCard key={round.id} round={round} onDelete={removeRound} />
                ))}
              </div>
            )}
          </>
        )}
      </PageWrapper>

      {showModal && (
        <AddRoundModal
          onClose={() => setShowModal(false)}
          onSubmit={addRound}
        />
      )}
    </>
  )
}
