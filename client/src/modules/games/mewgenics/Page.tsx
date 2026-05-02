import { useState } from 'react'
import GamePageShell from '../_shared/GamePageShell'
import { COLLARS, Collar } from './data'

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
      <div
        style={{
          width: '3px',
          height: '14px',
          background: 'linear-gradient(to bottom, #888, #555)',
          borderRadius: '0 0 2px 2px',
        }}
      />

      <div className={`collar-hang flex flex-col items-center w-full ${hovered ? 'swaying' : ''}`}>
        <div
          style={{
            width: '2px',
            height: '40px',
            background: 'linear-gradient(to bottom, #666, #444)',
          }}
        />

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
    <GamePageShell title="Collar Progress">
      <style>{SWAY_CSS}</style>

      <div className="flex-1 flex flex-col px-4 pb-8 min-h-0">
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
    </GamePageShell>
  )
}
