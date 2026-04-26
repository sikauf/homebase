import { useEffect } from 'react'
import { Weapon, BOSSES, SURFACE_ORDER, UNDERGROUND_ORDER, TOTAL_BOSSES } from './hadesData'

interface Props {
  weapon: Weapon
  completedBosses: Set<string>
  onMark: (bossId: string) => void
  onClose: () => void
}

const MODAL_CSS = `
  @keyframes hades-modal-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes hades-modal-rise {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes hades-x-draw {
    from { stroke-dashoffset: 100; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes hades-x-glow-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .hades-backdrop { animation: hades-modal-fade 0.12s ease-out; }
  .hades-panel    { animation: hades-modal-rise 0.18s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .hades-x-line   { stroke-dasharray: 100; animation: hades-x-draw 0.35s ease-out forwards; }
  .hades-x-glow   { animation: hades-x-glow-in 0.35s ease-out forwards; }
`

function FlowChevron({ color }: { color: string }) {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ display: 'block' }}>
      <path d="M2 2 L7 8 L12 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface BossTileProps {
  bossId: string
  completed: boolean
  onClick: () => void
  size: number
}

function BossTile({ bossId, completed, onClick, size }: BossTileProps) {
  const boss = BOSSES[bossId]
  return (
    <div
      className="relative select-none"
      onClick={completed ? undefined : onClick}
      style={{
        width: size, height: size,
        cursor: completed ? 'default' : 'pointer',
      }}
    >
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          background: '#1a1a1a',
          border: completed
            ? '1px solid rgba(220,40,40,0.45)'
            : '1px solid rgba(255,255,255,0.08)',
          boxShadow: completed
            ? '0 0 0 1px rgba(220,40,40,0.15) inset, 0 4px 14px rgba(0,0,0,0.6)'
            : '0 4px 14px rgba(0,0,0,0.5)',
          transition: 'border 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        <img
          src={boss.image}
          alt={boss.name}
          draggable={false}
          className="w-full h-full"
          style={{
            objectFit: 'cover',
            filter: completed
              ? 'grayscale(0.85) brightness(0.45) contrast(1.05)'
              : 'brightness(0.9)',
            transition: 'filter 0.3s ease',
          }}
        />
        {/* Bottom name strip */}
        <div
          className="absolute left-0 right-0 bottom-0 px-2 py-1.5 text-center uppercase font-semibold pointer-events-none"
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.18em',
            color: completed ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)',
            background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 60%, transparent 100%)',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
          }}
        >
          {boss.name}
        </div>

        {/* Red X for completed */}
        {completed && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Static glow underlay — fades in once, no per-frame filter cost */}
            <g className="hades-x-glow" style={{ filter: 'blur(3px)' }}>
              <line x1="14" y1="14" x2="86" y2="86"
                stroke="rgba(220,38,38,0.75)" strokeWidth="9" strokeLinecap="round"/>
              <line x1="86" y1="14" x2="14" y2="86"
                stroke="rgba(220,38,38,0.75)" strokeWidth="9" strokeLinecap="round"/>
            </g>
            {/* Animated solid X on top — no filter */}
            <line className="hades-x-line" x1="14" y1="14" x2="86" y2="86"
              stroke="#dc2626" strokeWidth="6" strokeLinecap="round"/>
            <line className="hades-x-line" x1="86" y1="14" x2="14" y2="86"
              stroke="#dc2626" strokeWidth="6" strokeLinecap="round"
              style={{ animationDelay: '0.08s' }}/>
          </svg>
        )}
      </div>
    </div>
  )
}

export default function HadesIIModal({ weapon, completedBosses, onMark, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const completedCount = SURFACE_ORDER.concat(UNDERGROUND_ORDER)
    .filter((b) => completedBosses.has(b)).length

  const TILE = 124

  return (
    <div
      className="hades-backdrop fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0, 0, 0, 0.92)' }}
      onClick={onClose}
    >
      <style>{MODAL_CSS}</style>

      <div
        className="hades-panel relative rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #131019 0%, #0a0810 100%)',
          border: `1px solid rgba(${weapon.rgb}, 0.18)`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(${weapon.rgb},0.05), 0 0 60px rgba(${weapon.rgb},0.18)`,
          maxWidth: '1080px',
          width: '100%',
          maxHeight: '92vh',
          padding: '36px 40px 40px',
          overflowY: 'auto',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Title */}
        <div className="text-center mb-1">
          <p className="uppercase font-semibold tracking-[0.4em]" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
            Testaments
          </p>
          <h2
            className="text-3xl font-black tracking-[0.2em] uppercase mt-1"
            style={{ color: `rgba(${weapon.rgb}, 0.95)`, textShadow: `0 0 22px rgba(${weapon.rgb},0.5)` }}
          >
            {weapon.name}
          </h2>
          <p className="mt-2 uppercase font-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.5)' }}>
            {completedCount} / {TOTAL_BOSSES} complete
          </p>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-3 gap-6 mt-8 items-center" style={{ minHeight: 560 }}>
          {/* UNDERGROUND COLUMN */}
          <div
            className="relative flex flex-col items-center py-6 rounded-xl"
            style={{
              background: 'linear-gradient(0deg, rgba(120,90,210,0.10) 0%, rgba(60,40,130,0.04) 60%, transparent 100%)',
              border: '1px solid rgba(150,130,230,0.08)',
            }}
          >
            <div className="uppercase font-bold mb-4" style={{ fontSize: '0.7rem', letterSpacing: '0.35em', color: 'rgba(170,150,240,0.75)' }}>
              ↓ Underground
            </div>
            {/* Top-down: Hecate at top, Chronos at bottom */}
            {UNDERGROUND_ORDER.map((bossId, idx, arr) => (
              <div key={bossId} className="flex flex-col items-center">
                <BossTile
                  bossId={bossId}
                  completed={completedBosses.has(bossId)}
                  onClick={() => onMark(bossId)}
                  size={TILE}
                />
                {idx < arr.length - 1 && (
                  <div className="my-2"><FlowChevron color="rgba(150,170,230,0.55)" /></div>
                )}
              </div>
            ))}
          </div>

          {/* CENTER WEAPON */}
          <div className="relative flex flex-col items-center justify-center px-2">
            {/* Pedestal aura */}
            <div className="absolute pointer-events-none" style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '95%', aspectRatio: '1 / 1',
              background: `radial-gradient(circle, rgba(${weapon.rgb},0.30) 0%, rgba(${weapon.rgb},0.10) 35%, transparent 70%)`,
              filter: 'blur(8px)',
            }}/>
            <img
              src={weapon.image}
              alt={weapon.name}
              draggable={false}
              className="relative"
              style={{
                width: '92%',
                aspectRatio: '1 / 1',
                objectFit: 'contain',
                filter: `drop-shadow(0 14px 32px rgba(${weapon.rgb},0.55)) drop-shadow(0 0 18px rgba(${weapon.rgb},0.35)) brightness(1.1)`,
              }}
            />
            {/* Pedestal disc */}
            <div className="relative -mt-3" style={{
              width: '70%', height: '12px',
              borderRadius: '50%',
              background: `radial-gradient(ellipse, rgba(${weapon.rgb},0.55) 0%, rgba(${weapon.rgb},0.18) 50%, transparent 80%)`,
              filter: 'blur(3px)',
            }}/>
          </div>

          {/* SURFACE COLUMN */}
          <div
            className="relative flex flex-col items-center py-6 rounded-xl"
            style={{
              background: 'linear-gradient(180deg, rgba(255,180,90,0.10) 0%, rgba(180,100,40,0.04) 60%, transparent 100%)',
              border: '1px solid rgba(255,200,120,0.08)',
            }}
          >
            <div className="uppercase font-bold mb-4" style={{ fontSize: '0.7rem', letterSpacing: '0.35em', color: 'rgba(255,210,140,0.75)' }}>
              ↓ Surface
            </div>
            {/* Top-down: Polyphemus at top, Typhon at bottom */}
            {SURFACE_ORDER.map((bossId, idx, arr) => (
              <div key={bossId} className="flex flex-col items-center">
                <BossTile
                  bossId={bossId}
                  completed={completedBosses.has(bossId)}
                  onClick={() => onMark(bossId)}
                  size={TILE}
                />
                {idx < arr.length - 1 && (
                  <div className="my-2"><FlowChevron color="rgba(255,210,140,0.55)" /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
