import type { GolfRound } from '../../types/golf'
import { getCourseImage } from './courseImages'

interface RoundCardProps {
  round: GolfRound
  onDelete: (id: number) => void
  onEdit: (round: GolfRound) => void
}

function scoreDiff(score: number | null, par: number): string | null {
  if (score == null) return null
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function scoreBadgeStyle(score: number | null, par: number, holes: number): React.CSSProperties {
  if (score == null) return { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
  const diff = score - par
  if (holes < 18) {
    if (diff >= 10) return { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
    return { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
  }
  if (diff > 14) return { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
  if (diff >= 8) return { background: 'rgba(250,204,21,0.15)', color: '#facc15' }
  return { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const chipStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  color: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(2px)',
}

export default function RoundCard({ round, onDelete, onEdit }: RoundCardProps) {
  const diff = scoreDiff(round.score, round.par)
  const badgeStyle = scoreBadgeStyle(round.score, round.par, round.holes)
  const courseImage = getCourseImage(round.course)
  const hasStats = round.birdies != null || round.gir != null || round.putts != null

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="relative w-full overflow-hidden" style={{ height: '140px' }}>
        {courseImage ? (
          <img
            src={courseImage.image}
            alt={round.course}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: courseImage.objectPosition ?? '50% 50%' }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1f1f1f, #141414)' }} />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: courseImage
              ? 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.55) 100%)'
              : 'transparent',
          }}
        />

        <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
          <button
            onClick={() => onEdit(round)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(0,0,0,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(0,0,0,0.35)' }}
            title="Edit round"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(round.id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(0,0,0,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(0,0,0,0.35)' }}
            title="Delete round"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="absolute inset-0 flex items-end p-5">
          <div className="flex items-end justify-between w-full gap-4 min-w-0">
            <div className="min-w-0">
              <h3
                className="text-white text-xl font-bold leading-tight truncate"
                style={{ fontFamily: "'Kreon', serif", textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}
              >
                {round.course}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className="text-xs uppercase tracking-[.2em]"
                  style={{ color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                >
                  {formatDate(round.played_at)}
                </span>
                {round.holes !== 18 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={chipStyle}>
                    {round.holes} holes
                  </span>
                )}
                {round.tees && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={chipStyle}>
                    {round.tees}
                  </span>
                )}
              </div>
            </div>
            {round.score != null && (
              <div className="text-right shrink-0">
                <span
                  className="text-3xl font-bold leading-none"
                  style={{
                    color: '#fff',
                    fontFamily: "'Kreon', serif",
                    textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                  }}
                >
                  {round.score}
                </span>
                {diff && (
                  <div className="mt-1.5">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={badgeStyle}
                    >
                      {diff}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {(hasStats || round.notes) && (
        <div className="px-5 py-4">
          {hasStats && (
            <div className="flex gap-6">
              {round.birdies != null && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Birdies</p>
                  <p className="text-sm font-semibold text-white">{round.birdies}</p>
                </div>
              )}
              {round.gir != null && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>GIR</p>
                  <p className="text-sm font-semibold text-white">{round.gir}</p>
                </div>
              )}
              {round.putts != null && (
                <div>
                  <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Putts</p>
                  <p className="text-sm font-semibold text-white">{round.putts}</p>
                </div>
              )}
            </div>
          )}
          {round.notes && (
            <p className={`text-sm italic ${hasStats ? 'mt-3' : ''}`} style={{ color: 'rgba(255,255,255,0.35)' }}>
              "{round.notes}"
            </p>
          )}
        </div>
      )}
    </div>
  )
}
