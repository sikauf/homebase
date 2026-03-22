import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import RoundCard from './RoundCard'
import AddRoundModal from './AddRoundModal'
import { useGolf } from '../../hooks/useGolf'

function StatPill({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value ?? '—'}</p>
    </div>
  )
}

export default function GolfPage() {
  const { rounds, stats, loading, error, addRound, removeRound } = useGolf()
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <PageWrapper
        title="Golf"
        subtitle="Track your rounds and stats"
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
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
