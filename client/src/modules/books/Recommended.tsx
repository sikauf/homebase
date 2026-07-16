import { useEffect, useState } from 'react'
import { FALLBACK_RGBS, fetchJSON, toHardcoverSlug } from './shared'

interface Recommendation {
  id: number
  hardcover_id: number | null
  title: string
  author: string | null
  blurb: string
  cover_url: string | null
  accent_rgb: string | null
  hardcover_slug: string | null
}

function hardcoverUrl(rec: Recommendation): string {
  const slug = rec.hardcover_slug ?? toHardcoverSlug(rec.title)
  return `https://hardcover.app/books/${slug}`
}

function RecCard({ rec, index, onRemove }: {
  rec: Recommendation
  index: number
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const rgb = rec.accent_rgb ?? FALLBACK_RGBS[index % FALLBACK_RGBS.length]

  return (
    <div
      className="relative rounded-xl overflow-hidden flex gap-4 p-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#1a1a1a',
        border: `1px solid ${hovered ? 'rgba(160,165,185,0.28)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: hovered
          ? `0 12px 36px rgba(0,0,0,0.6), 0 4px 18px rgba(${rgb},0.18)`
          : '0 4px 18px rgba(0,0,0,0.5)',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
      }}
    >
      {/* Accent edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 pointer-events-none"
        style={{ background: `rgba(${rgb},0.55)` }}
      />

      {/* Cover */}
      <div
        className="shrink-0 rounded-md overflow-hidden flex items-center justify-center"
        style={{ width: 84, height: 126, background: '#0e0e0f' }}
      >
        {rec.cover_url ? (
          <img
            src={rec.cover_url}
            alt={rec.title}
            className="w-full h-full object-cover"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.7))' }}
          />
        ) : (
          <span className="text-3xl">📖</span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col min-w-0 flex-1">
        <p
          className="text-white leading-snug"
          style={{ fontFamily: "'Kreon', serif", fontWeight: 700, fontSize: '1.02rem' }}
        >
          {rec.title}
        </p>
        {rec.author && (
          <p className="text-xs mt-0.5 truncate" style={{ color: `rgba(${rgb},0.85)` }}>
            {rec.author}
          </p>
        )}
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {rec.blurb}
        </p>

        <div className="flex items-center gap-2 mt-auto pt-3">
          <a
            href={hardcoverUrl(rec)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            style={{
              background: `rgba(${rgb},0.16)`,
              color: `rgb(${rgb})`,
              border: `1px solid rgba(${rgb},0.3)`,
            }}
          >
            Want to Read ↗
          </a>
          <button
            onClick={onRemove}
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

interface RecsResponse {
  recommendations: Recommendation[]
  pool_remaining: number
  exhausted?: boolean
}

export default function Recommended() {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [poolRemaining, setPoolRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    fetchJSON<RecsResponse>('/api/books/recommendations')
      .then((data) => { setRecs(data.recommendations); setPoolRemaining(data.pool_remaining); setError(null) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function showMore() {
    setRefreshing(true)
    setNotice(null)
    setError(null)
    try {
      const data = await fetchJSON<RecsResponse>('/api/books/recommendations/more', { method: 'POST' })
      setRecs(data.recommendations)
      setPoolRemaining(data.pool_remaining)
      if (data.exhausted) setNotice("That's the whole batch — ask for a fresh set of recommendations.")
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setRefreshing(false)
    }
  }

  async function remove(id: number) {
    setRecs((prev) => prev.filter((r) => r.id !== id))
    try {
      await fetch(`/api/books/recommendations/${id}`, { method: 'DELETE' })
    } catch { /* optimistic — already gone from view */ }
  }

  return (
    <div className="flex-1 flex p-5 min-h-0 overflow-y-auto" style={{ background: '#0c0c0c' }}>
      <div className="flex-1 flex flex-col" style={{ background: '#0c0c0c' }}>

        {/* Header */}
        <div className="px-7 pt-8 pb-7 shrink-0">
          <div className="flex items-center gap-5">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <div className="text-center">
              <h2 className="text-2xl font-black tracking-[.35em] uppercase text-white">
                For You
              </h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Kreon', serif", letterSpacing: '0.1em' }}>
                Picked from your ratings
              </p>
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

          {poolRemaining > 0 && (
            <div className="flex flex-col items-center gap-2 mt-5">
              <button
                onClick={showMore}
                disabled={refreshing}
                className="text-xs font-semibold tracking-wide uppercase px-4 py-2 rounded-md transition-colors"
                style={{
                  background: refreshing ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
                  color: refreshing ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: refreshing ? 'default' : 'pointer',
                }}
              >
                {refreshing ? 'Loading…' : `Show ${Math.min(12, poolRemaining)} more`}
              </button>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {poolRemaining} more in the batch
              </p>
            </div>
          )}

          {notice && (
            <p className="text-center text-sm mt-3" style={{ color: '#f6a96b' }}>{notice}</p>
          )}
        </div>

        {loading && (
          <div className="px-5 pb-5 grid gap-4" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="rounded-xl animate-pulse"
                style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.04)', height: 158 }}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
          </div>
        )}

        {!loading && !error && recs.length === 0 && !refreshing && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-4xl mb-3">✨</p>
            <p className="text-sm text-center max-w-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {poolRemaining > 0
                ? 'Hit “Show more” to pull in the next batch.'
                : 'No recommendations yet — ask Claude Code for a fresh set based on your ratings.'}
            </p>
          </div>
        )}

        {!loading && !error && recs.length > 0 && (
          <div className="px-5 pb-5 grid gap-4" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {recs.map((rec, i) => (
              <RecCard key={rec.id} rec={rec} index={i} onRemove={() => remove(rec.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
