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
  { id: 'necromancer', name: 'Necromancer', rgb: '80,80,100'    },
  { id: 'psychic',     name: 'Psychic',     rgb: '148,100,190'  },
  { id: 'tank',        name: 'Tank',        rgb: '180,155,90'   },
  { id: 'thief',       name: 'Thief',       rgb: '240,215,80'   },
  { id: 'tinkerer',    name: 'Tinkerer',    rgb: '72,210,185'   },
]

const SWAY_CSS = `
  @keyframes sway {
    0%   { transform: rotate(0deg); }
    18%  { transform: rotate(-9deg); }
    40%  { transform: rotate(7deg); }
    58%  { transform: rotate(-4deg); }
    74%  { transform: rotate(2deg); }
    86%  { transform: rotate(-1deg); }
    100% { transform: rotate(0deg); }
  }
  .collar-hang {
    transform-origin: top center;
    animation: none;
  }
  .collar-hang.swaying {
    animation: sway 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }
`

function CollarHanger({
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
  return (
    <div
      className="flex-1 flex flex-col items-center cursor-pointer select-none"
      style={{ padding: '0 6px' }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
    >
      {/* Hook mount on rack */}
      <div
        style={{
          width: '3px',
          height: '14px',
          background: 'linear-gradient(to bottom, #888, #555)',
          borderRadius: '0 0 2px 2px',
        }}
      />

      {/* Everything below rotates as one unit from the hook top */}
      <div className={`collar-hang flex flex-col items-center w-full ${hovered ? 'swaying' : ''}`}>
        {/* Chain */}
        <div
          style={{
            width: '2px',
            height: '40px',
            background: 'linear-gradient(to bottom, #666, #444)',
          }}
        />

        {/* Collar icon — fills column width */}
        <div
          className="w-full"
          style={{
            filter: hovered
              ? `drop-shadow(0 10px 22px rgba(${collar.rgb},0.75)) drop-shadow(0 0 8px rgba(${collar.rgb},0.4)) brightness(1.15)`
              : 'drop-shadow(0 6px 14px rgba(0,0,0,0.7)) brightness(0.82)',
            transition: 'filter 0.2s ease',
          }}
        >
          <img
            src={`/games/mewgenics/${collar.id}.png`}
            alt={collar.name}
            draggable={false}
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              objectFit: 'contain',
              imageRendering: 'pixelated',
            }}
          />
        </div>

        {/* Label */}
        <p
          className="mt-2 uppercase font-semibold"
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.1em',
            color: hovered ? `rgba(${collar.rgb},0.9)` : 'rgba(255,255,255,0.28)',
            transition: 'color 0.2s ease',
          }}
        >
          {collar.name}
        </p>
      </div>
    </div>
  )
}

export default function Mewgenics() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  function handleCollarClick(collar: Collar) {
    // TODO: open tasks popup
    console.log('clicked', collar.name)
  }

  return (
    <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ background: '#0c0c0c' }}>
      <style>{SWAY_CSS}</style>

      {/* Header */}
      <div className="px-7 pt-8 pb-7 shrink-0">
        <div className="flex items-center gap-5">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }}/>
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-[.35em] uppercase" style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '0.35em' }}>
              Collar Progress
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

      {/* Single rack */}
      <div className="flex-1 flex flex-col px-4 pb-8 min-h-0">
        {/* Rack bar */}
        <div className="relative shrink-0" style={{ height: '16px' }}>
          <div className="absolute" style={{
            left: '-4px', top: '-5px', width: '12px', height: '26px',
            borderRadius: '4px',
            background: 'linear-gradient(to bottom, #666, #333)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.6)',
          }}/>
          <div className="w-full h-full rounded" style={{
            background: 'linear-gradient(to bottom, rgba(140,140,140,0.9) 0%, rgba(70,70,70,0.95) 50%, rgba(35,35,35,0.95) 100%)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)',
          }}/>
          <div className="absolute" style={{
            right: '-4px', top: '-5px', width: '12px', height: '26px',
            borderRadius: '4px',
            background: 'linear-gradient(to bottom, #666, #333)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.6)',
          }}/>
        </div>

        {/* All 12 collars */}
        <div className="flex flex-1">
          {COLLARS.map((collar) => (
            <CollarHanger
              key={collar.id}
              collar={collar}
              hovered={hoveredId === collar.id}
              onHover={(v) => setHoveredId(v ? collar.id : null)}
              onClick={() => handleCollarClick(collar)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
