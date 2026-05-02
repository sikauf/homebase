import { useEffect, useState } from 'react'
import GamePageShell from '../_shared/GamePageShell'
import { CONFIG } from './data'
import { CharacterAscension, fetchAscensions } from './api'

function SkeletonCard() {
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse flex flex-col"
      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex-1 bg-white/5" />
      <div className="h-24 bg-white/[0.03]" />
    </div>
  )
}

export default function SlayTheSpire2() {
  const [characters, setCharacters] = useState<CharacterAscension[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchAscensions()
      .then((data) => { setCharacters(data); setError(null) })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <GamePageShell title="Ascension Progress">
      <div className="flex-1 px-5 pb-5 grid grid-cols-5 gap-3 min-h-0">
        {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}

        {error && (
          <div
            className="col-span-5 text-red-400 text-sm p-5 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            {error}
          </div>
        )}

        {!loading && !error && characters.map((c) => {
          const cfg = CONFIG[c.id]
          if (!cfg) return null
          const isHovered = hoveredId === c.id

          return (
            <div
              key={c.id}
              className="relative rounded-xl overflow-hidden flex flex-col cursor-default select-none"
              style={{
                background: '#1a1a1a',
                border: `1px solid ${isHovered ? `rgba(${cfg.rgb},0.45)` : 'rgba(255,255,255,0.04)'}`,
                boxShadow: isHovered
                  ? `0 12px 40px rgba(${cfg.rgb},0.35), 0 0 0 1px rgba(${cfg.rgb},0.1)`
                  : '0 2px 16px rgba(0,0,0,0.6)',
                transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              }}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex-1 relative overflow-hidden min-h-0">
                <img
                  src={cfg.image}
                  alt={c.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    objectPosition: cfg.objPos,
                    filter: isHovered ? 'brightness(1.15) saturate(1.2)' : 'brightness(0.8) saturate(0.85)',
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center top',
                    transition: 'filter 0.3s ease, transform 0.3s ease',
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, transparent, #111)' }}
                />
              </div>

              <div
                className="shrink-0 relative flex items-center justify-center"
                style={{ height: '5.5rem', background: '#111' }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `rgba(${cfg.rgb},0.07)`,
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                />
                <span
                  className="text-7xl leading-none"
                  style={{
                    fontFamily: "'Kreon', serif",
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {c.max_ascension}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </GamePageShell>
  )
}
