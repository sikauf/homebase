import type { GolfRound } from '../../types/golf'

interface RoundCardProps {
  round: GolfRound
  onDelete: (id: number) => void
}

function scoreDiff(score: number | null, par: number): string | null {
  if (score == null) return null
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function scoreBadgeColor(score: number | null, par: number): string {
  if (score == null) return 'bg-gray-100 text-gray-500'
  const diff = score - par
  if (diff <= 0) return 'bg-green-100 text-green-700'
  if (diff <= 5) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function RoundCard({ round, onDelete }: RoundCardProps) {
  const diff = scoreDiff(round.score, round.par)
  const badgeColor = scoreBadgeColor(round.score, round.par)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{round.course}</h3>
            {round.tees && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                {round.tees}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{formatDate(round.played_at)}</p>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          {round.score != null && (
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">{round.score}</span>
              {diff && (
                <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {diff}
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => onDelete(round.id)}
            className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded"
            title="Delete round"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {(round.fairways != null || round.gir != null || round.putts != null) && (
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
          {round.fairways != null && (
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">FIR</p>
              <p className="text-sm font-semibold text-gray-700">{round.fairways}</p>
            </div>
          )}
          {round.gir != null && (
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">GIR</p>
              <p className="text-sm font-semibold text-gray-700">{round.gir}</p>
            </div>
          )}
          {round.putts != null && (
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Putts</p>
              <p className="text-sm font-semibold text-gray-700">{round.putts}</p>
            </div>
          )}
        </div>
      )}

      {round.notes && (
        <p className="mt-3 text-sm text-gray-500 italic">"{round.notes}"</p>
      )}
    </div>
  )
}
