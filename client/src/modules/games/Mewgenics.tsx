import { useState } from 'react'

interface Collar { id: string; name: string; rgb: string }

const COLLARS: Collar[] = [
  { id: 'butcher',     name: 'Butcher',     rgb: '220,80,80'    },
  { id: 'cleric',      name: 'Cleric',      rgb: '210,210,210'  },
  { id: 'druid',       name: 'Druid',       rgb: '160,110,60'   },
  { id: 'fighter',     name: 'Fighter',     rgb: '240,140,120'  },
  { id: 'hunter',      name: 'Hunter',      rgb: '80,160,80'    },
  { id: 'mage',        name: 'Mage',        rgb: '130,150,220'  },
  { id: 'monk',        name: 'Monk',        rgb: '160,160,170'  },
  { id: 'necromancer', name: 'Necromancer', rgb: '160,100,210'  },
  { id: 'psychic',     name: 'Psychic',     rgb: '148,100,190'  },
  { id: 'tank',        name: 'Tank',        rgb: '180,155,90'   },
  { id: 'thief',       name: 'Thief',       rgb: '240,215,80'   },
  { id: 'tinkerer',    name: 'Tinkerer',    rgb: '72,210,185'   },
]


function CollarCard({
  collar,
  hovered,
  onHover,
  onClick,
}: {
  collar: Collar
  hovered: boolean
  onHover: (v: boolean) => void
  onClick: () => void
}) {
  const { rgb } = collar

  return (
    <div
      className="relative flex flex-col rounded-xl overflow-hidden cursor-pointer select-none"
      style={{
        background: '#161616',
        border: `1px solid ${hovered ? `rgba(${rgb},0.5)` : 'rgba(255,255,255,0.05)'}`,
        boxShadow: hovered
          ? `0 14px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(${rgb},0.12), 0 0 28px rgba(${rgb},0.3)`
          : '0 4px 20px rgba(0,0,0,0.6)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
    >
      {/* Icon area */}
      <div
        className="relative flex items-center justify-center"
        style={{ aspectRatio: '1 / 1', padding: '16px', background: '#161616' }}
      >
        {/* Radial glow on hover */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 75% 75% at 50% 55%, rgba(${rgb},0.18) 0%, transparent 70%)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
        <img
          src={`/games/mewgenics/${collar.id}.png`}
          alt={collar.name}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            imageRendering: 'pixelated',
            filter: hovered ? `drop-shadow(0 0 10px rgba(${rgb},0.7)) brightness(1.1)` : 'brightness(0.9)',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'filter 0.2s ease, transform 0.2s ease',
          }}
        />
      </div>

      {/* Name panel */}
      <div
        className="shrink-0 relative flex items-center justify-center"
        style={{
          padding: '10px 12px 13px',
          background: '#111',
          borderTop: `1px solid ${hovered ? `rgba(${rgb},0.2)` : 'rgba(255,255,255,0.04)'}`,
          transition: 'border-color 0.2s ease',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `rgba(${rgb},0.06)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
        <span
          className="relative tracking-widest uppercase text-xs font-semibold"
          style={{
            color: hovered ? `rgba(${rgb},0.9)` : 'rgba(255,255,255,0.45)',
            transition: 'color 0.2s ease',
            letterSpacing: '0.12em',
          }}
        >
          {collar.name}
        </span>
      </div>
    </div>
  )
}

export default function Mewgenics() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  function handleCollarClick(collar: Collar) {
    // TODO: open tasks popup for this collar
    console.log('clicked', collar.name)
  }

  return (
    <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ background: '#0c0c0c' }}>
      {/* Header */}
      <div className="px-7 pt-8 pb-7 shrink-0">
        <div className="flex items-center gap-5">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }}/>
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-[.35em] uppercase" style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '0.35em' }}>
              Mewgenics
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }}/>
              <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }}/>
              <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }}/>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }}/>
              <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }}/>
              <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }}/>
              <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }}/>
            </div>
          </div>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.12))' }}/>
        </div>
      </div>

      {/* Collar grid */}
      <div className="flex-1 px-5 pb-5 grid grid-cols-4 gap-4 min-h-0 content-start">
        {COLLARS.map((collar) => (
          <CollarCard
            key={collar.id}
            collar={collar}
            hovered={hoveredId === collar.id}
            onHover={(v) => setHoveredId(v ? collar.id : null)}
            onClick={() => handleCollarClick(collar)}
          />
        ))}
      </div>
    </div>
  )
}
