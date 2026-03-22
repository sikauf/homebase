import { useEffect, useState } from 'react'

interface CharacterAscension {
  id: string
  name: string
  max_ascension: number
  preferred_ascension: number
}

const MAX_ASCENSION = 10

const CONFIG: Record<string, {
  image: string
  objPos: string
  color: string
  rgb: string
  label: string
}> = {
  'CHARACTER.IRONCLAD': {
    image: '/games/sts2/ironclad.png',
    objPos: '50% 0%',
    color: '#f87171',
    rgb: '248,113,113',
    label: 'The Warrior',
  },
  'CHARACTER.SILENT': {
    image: '/games/sts2/silent.png',
    objPos: '50% 15%',
    color: '#4ade80',
    rgb: '74,222,128',
    label: 'The Hunter',
  },
  'CHARACTER.DEFECT': {
    image: '/games/sts2/defect.png',
    objPos: '50% 5%',
    color: '#60a5fa',
    rgb: '96,165,250',
    label: 'The Machine',
  },
  'CHARACTER.REGENT': {
    image: '/games/sts2/regent.png',
    objPos: '50% 10%',
    color: '#fb923c',
    rgb: '251,146,60',
    label: 'The Sorcerer',
  },
  'CHARACTER.NECROBINDER': {
    image: '/games/sts2/necrobinder.png',
    objPos: '45% 5%',
    color: '#c084fc',
    rgb: '192,132,252',
    label: 'The Undead',
  },
}

function SkeletonCard() {
  return (
    <div
      className="relative h-44 rounded-2xl overflow-hidden animate-pulse"
      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="absolute inset-y-0 left-0 w-56 bg-white/5" />
      <div className="absolute inset-y-0 right-0 left-52 flex flex-col justify-center px-8 gap-3">
        <div className="h-2.5 w-20 rounded bg-white/10" />
        <div className="h-14 w-16 rounded bg-white/10" />
        <div className="h-1 w-full rounded bg-white/10" />
      </div>
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
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0c0c0c' }}>
      {/* Header */}
      <div className="px-7 pt-7 pb-5 flex items-end justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div>
          <p className="text-xs tracking-[.4em] uppercase mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Currently Playing
          </p>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Slay the Spire <span style={{ color: 'rgba(255,255,255,0.3)' }}>2</span>
          </h2>
        </div>
        <p className="text-xs pb-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Ascension Progress
        </p>
      </div>

      {/* Cards */}
      <div className="p-5 flex flex-col gap-3">
        {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}

        {error && (
          <div className="text-red-400 text-sm p-5 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
            {error}
          </div>
        )}

        {!loading && !error && characters.map((c) => {
          const cfg = CONFIG[c.id]
          if (!cfg) return null
          const isHovered = hoveredId === c.id
          const pct = Math.min((c.max_ascension / MAX_ASCENSION) * 100, 100)
          const isEmpty = c.max_ascension === 0

          return (
            <div
              key={c.id}
              className="relative h-44 rounded-2xl overflow-hidden flex cursor-default select-none"
              style={{
                background: '#1a1a1a',
                border: `1px solid ${isHovered ? `rgba(${cfg.rgb},0.35)` : 'rgba(255,255,255,0.04)'}`,
                boxShadow: isHovered
                  ? `0 0 50px rgba(${cfg.rgb},0.18), inset 0 0 80px rgba(${cfg.rgb},0.04)`
                  : '0 2px 12px rgba(0,0,0,0.4)',
                transform: isHovered ? 'scale(1.015)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              }}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Character art */}
              <img
                src={cfg.image}
                alt={c.name}
                className="absolute inset-y-0 left-0 h-full object-cover"
                style={{
                  width: '240px',
                  objectPosition: cfg.objPos,
                  filter: isHovered ? 'brightness(1.1) saturate(1.1)' : 'brightness(0.9) saturate(0.9)',
                  transition: 'filter 0.3s ease',
                }}
              />

              {/* Gradient: art → dark */}
              <div
                className="absolute inset-y-0 left-0 pointer-events-none"
                style={{
                  width: '320px',
                  background: `linear-gradient(to right, transparent 35%, rgba(26,26,26,0.6) 55%, #1a1a1a 72%)`,
                }}
              />

              {/* Colored ambient glow at art boundary */}
              <div
                className="absolute inset-y-0 pointer-events-none"
                style={{
                  left: '180px',
                  width: '60px',
                  background: `linear-gradient(to right, rgba(${cfg.rgb},0.08), transparent)`,
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                }}
              />

              {/* Content */}
              <div className="relative z-10 flex h-full" style={{ marginLeft: '210px' }}>
                {/* Thin colored accent bar on left edge of content */}
                <div
                  className="w-px shrink-0 my-6"
                  style={{
                    background: `linear-gradient(to bottom, transparent, rgba(${cfg.rgb},0.6), transparent)`,
                    opacity: isHovered ? 1 : 0.3,
                    transition: 'opacity 0.3s ease',
                  }}
                />

                <div className="flex flex-col justify-center px-7 flex-1">
                  {/* Label */}
                  <p
                    className="text-xs font-semibold tracking-[.3em] uppercase mb-2"
                    style={{ color: `rgba(${cfg.rgb},0.7)` }}
                  >
                    {cfg.label}
                  </p>

                  {/* Name */}
                  <p className="text-lg font-black tracking-tight text-white leading-none mb-3">
                    {c.name}
                  </p>

                  {/* Ascension number */}
                  <div className="flex items-end gap-2.5 mb-4">
                    <span
                      className="text-7xl font-black leading-none"
                      style={{
                        color: isEmpty ? 'rgba(255,255,255,0.15)' : 'white',
                        textShadow: isHovered && !isEmpty
                          ? `0 0 30px rgba(${cfg.rgb},0.7), 0 0 60px rgba(${cfg.rgb},0.3)`
                          : `0 0 20px rgba(${cfg.rgb},0.3)`,
                        transition: 'text-shadow 0.3s ease',
                      }}
                    >
                      {c.max_ascension}
                    </span>
                    <div className="flex flex-col pb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      <span className="text-sm font-bold leading-tight">/ {MAX_ASCENSION}</span>
                      <span className="text-xs leading-tight">MAX</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative w-full h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: isEmpty
                          ? 'rgba(255,255,255,0.1)'
                          : `linear-gradient(to right, rgba(${cfg.rgb},0.7), rgba(${cfg.rgb},1))`,
                        boxShadow: !isEmpty ? `0 0 6px rgba(${cfg.rgb},0.8)` : 'none',
                        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
