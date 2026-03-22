import { useEffect, useState } from 'react'

interface CharacterAscension {
  id: string
  name: string
  max_ascension: number
  preferred_ascension: number
  total_wins: number
  total_losses: number
}

const CONFIG: Record<string, {
  image: string
  objPos: string
  color: string
  rgb: string
}> = {
  'CHARACTER.IRONCLAD':    { image: '/games/sts2/ironclad.png',    objPos: '38% 0%',  color: '#f87171', rgb: '248,113,113' },
  'CHARACTER.SILENT':      { image: '/games/sts2/silent.png',      objPos: '22% 0%',  color: '#4ade80', rgb: '74,222,128'  },
  'CHARACTER.DEFECT':      { image: '/games/sts2/defect.png',      objPos: '68% 0%',  color: '#60a5fa', rgb: '96,165,250'  },
  'CHARACTER.REGENT':      { image: '/games/sts2/regent.png',      objPos: '50% 0%',  color: '#fb923c', rgb: '251,146,60'  },
  'CHARACTER.NECROBINDER': { image: '/games/sts2/necrobinder.png', objPos: '55% 0%',  color: '#c084fc', rgb: '192,132,252' },
}

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
    fetch('/api/games/sts2/ascensions')
      .then((r) => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
      .then((data) => { setCharacters(data); setError(null) })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ background: '#0c0c0c' }}>
      {/* Header */}
      <div className="px-7 pt-8 pb-7 shrink-0">
        <div className="flex items-center gap-5">
          {/* Left rule */}
          <div
            className="h-px flex-1"
            style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }}
          />

          {/* Title */}
          <div className="text-center">
            <h2
              className="text-2xl font-black tracking-[.35em] uppercase"
              style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '0.35em' }}
            >
              Ascension Progress
            </h2>
            {/* Decorative underline */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div
                className="w-1 h-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.35)' }}
              />
              <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.5)' }}
              />
              <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div
                className="w-1 h-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.35)' }}
              />
              <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>
          </div>

          {/* Right rule */}
          <div
            className="h-px flex-1"
            style={{ background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.12))' }}
          />
        </div>
      </div>

      {/* Portrait grid */}
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
              {/* Art — flex-1 so it fills available space, head always visible at top */}
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
                {/* Bottom fade into number panel */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, transparent, #111)' }}
                />
              </div>

              {/* Ascension number panel */}
              <div
                className="shrink-0 relative flex items-center justify-center"
                style={{ height: '5.5rem', background: '#111' }}
              >
                {/* Colored tint on hover — separate layer avoids gradient transition flicker */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `rgba(${cfg.rgb},0.07)`,
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                />
                <span
                  className="text-7xl font-black leading-none"
                  style={{
                    color: '#fff',
                    textShadow: isHovered
                      ? `0 0 24px rgba(${cfg.rgb},0.95), 0 0 48px rgba(${cfg.rgb},0.5)`
                      : `0 0 16px rgba(${cfg.rgb},0.4)`,
                    transition: 'text-shadow 0.3s ease',
                  }}
                >
                  {c.max_ascension}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
