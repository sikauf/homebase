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

function scoreBadgeStyle(score: number | null, par: number): React.CSSProperties {
  if (score == null) return { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
  const diff = score - par
  if (diff <= 0) return { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
  if (diff <= 5) return { background: 'rgba(250,204,21,0.15)', color: '#facc15' }
  return { background: 'rgba(248,113,113,0.15)', color: '#f87171' }
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
  const badgeStyle = scoreBadgeStyle(round.score, round.par)

  return (
    <div className="rounded-xl p-5" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-white truncate">{round.course}</h3>
            {round.tees && (
              <span
                className="text-xs px-2 py-0.5 rounded-full shrink-0"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}
              >
                {round.tees}
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatDate(round.played_at)}</p>
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          {round.score != null && (
            <div className="text-right">
              <span
                className="text-2xl font-bold"
                style={{ color: 'rgba(255,255,255,0.9)', fontFamily: "'Kreon', serif" }}
              >
                {round.score}
              </span>
              {diff && (
                <span
                  className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={badgeStyle}
                >
                  {diff}
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => onDelete(round.id)}
            className="p-1 rounded transition-colors"
            style={{ color: 'rgba(255,255,255,0.2)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
            title="Delete round"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {(round.fairways != null || round.gir != null || round.putts != null) && (
        <div className="flex gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {round.fairways != null && (
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>FIR</p>
              <p className="text-sm font-semibold text-white">{round.fairways}</p>
            </div>
          )}
          {round.gir != null && (
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>GIR</p>
              <p className="text-sm font-semibold text-white">{round.gir}</p>
            </div>
          )}
          {round.putts != null && (
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Putts</p>
              <p className="text-sm font-semibold text-white">{round.putts}</p>
            </div>
          )}
        </div>
      )}

      {round.notes && (
        <p className="mt-3 text-sm italic" style={{ color: 'rgba(255,255,255,0.35)' }}>"{round.notes}"</p>
      )}
    </div>
  )
}
