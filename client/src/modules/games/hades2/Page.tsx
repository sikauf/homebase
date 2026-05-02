import { useEffect, useState, CSSProperties } from 'react'
import GamePageShell from '../_shared/GamePageShell'
import { WEAPONS, BOSSES, Weapon, TOTAL_BOSSES } from './data'
import { fetchTestaments, markTestament } from './api'
import HadesIIModal from './Modal'

// Flat-top hexagon: 2 top, 2 sides, 2 bottom. Circumradius R as % of square container.
const R = 34
const SQRT3_2 = Math.sqrt(3) / 2
const POSITIONS = [
  { x: -R / 2, y: -R * SQRT3_2 }, // top-left     -> witch_staff
  { x:  R / 2, y: -R * SQRT3_2 }, // top-right    -> sister_blades
  { x:  R,     y: 0 },             // mid-right    -> umbral_flames
  { x:  R / 2, y:  R * SQRT3_2 }, // bottom-right -> moonstone_axe
  { x: -R / 2, y:  R * SQRT3_2 }, // bottom-left  -> argent_skull
  { x: -R,     y: 0 },             // mid-left     -> black_coat
]

const PULSE_CSS = `
  @keyframes hadesOrbPulse {
    0%, 100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }
    50%      { opacity: 1;    transform: translate(-50%, -50%) scale(1.08); }
  }
  .hades-orb-core { animation: hadesOrbPulse 4s ease-in-out infinite; }

  .hades-pedestal { z-index: 1; }
  .hades-pedestal:hover { z-index: 2; }

  .hades-aura {
    background: radial-gradient(circle, rgba(var(--rgb), 0.20) 0%, rgba(var(--rgb), 0.08) 40%, transparent 72%);
    transition: background 0.3s ease;
  }
  .hades-pedestal:hover .hades-aura {
    background: radial-gradient(circle, rgba(var(--rgb), 0.50) 0%, rgba(var(--rgb), 0.22) 40%, transparent 72%);
  }

  .hades-disc {
    background: radial-gradient(ellipse, rgba(var(--rgb), 0.35) 0%, rgba(var(--rgb), 0.12) 50%, transparent 80%);
    transition: background 0.3s ease;
  }
  .hades-pedestal:hover .hades-disc {
    background: radial-gradient(ellipse, rgba(var(--rgb), 0.7) 0%, rgba(var(--rgb), 0.3) 50%, transparent 80%);
  }

  .hades-weapon-img {
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 8px 18px rgba(0,0,0,0.7)) brightness(0.88);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), filter 0.3s ease;
  }
  .hades-pedestal:hover .hades-weapon-img {
    transform: translate(-50%, -50%) translate(0, -6px) scale(1.06);
    filter: drop-shadow(0 10px 26px rgba(var(--rgb), 0.75)) drop-shadow(0 0 14px rgba(var(--rgb), 0.55)) brightness(1.18);
  }

  .hades-label { opacity: 0; transition: opacity 0.25s ease, transform 0.25s ease; }
  .hades-pedestal.label-above .hades-label { transform: translate(-50%, 6px); }
  .hades-pedestal.label-below .hades-label { transform: translate(-50%, -6px); }
  .hades-pedestal:hover .hades-label { transform: translate(-50%, 0); opacity: 1; }
`

export default function HadesII() {
  const [openWeapon, setOpenWeapon] = useState<Weapon | null>(null)
  // Map weapon_id -> Set of completed boss_ids
  const [completed, setCompleted] = useState<Map<string, Set<string>>>(new Map())

  useEffect(() => {
    // Warm the browser cache for boss portraits so the modal opens instantly.
    for (const bossId in BOSSES) {
      const img = new Image()
      img.src = BOSSES[bossId].image
    }
  }, [])

  useEffect(() => {
    fetchTestaments()
      .then((rows) => {
        const map = new Map<string, Set<string>>()
        for (const row of rows) {
          if (!map.has(row.weapon_id)) map.set(row.weapon_id, new Set())
          map.get(row.weapon_id)!.add(row.boss_id)
        }
        setCompleted(map)
      })
      .catch((e) => console.error('Failed to load testaments:', e))
  }, [])

  function handleMark(weaponId: string, bossId: string) {
    setCompleted((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(weaponId) ?? [])
      set.add(bossId)
      next.set(weaponId, set)
      return next
    })
    markTestament(weaponId, bossId).catch((e) => console.error('Failed to save testament:', e))
  }

  return (
    <GamePageShell title="Testaments">
      <style>{PULSE_CSS}</style>

      <div className="flex-1 flex items-center justify-center min-h-0 p-4 relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, rgba(120,90,200,0.10) 0%, rgba(40,20,80,0.05) 35%, transparent 70%)',
        }}/>

        <div className="relative" style={{
          width: 'min(100%, 78vh)',
          aspectRatio: '1 / 1',
          maxWidth: '760px',
        }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="-50 -50 100 100" preserveAspectRatio="none">
            <polygon
              points={POSITIONS.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="rgba(180,160,255,0.10)"
              strokeWidth="0.25"
            />
            {POSITIONS.map((p, i) => (
              <line key={i} x1="0" y1="0" x2={p.x} y2={p.y}
                stroke="rgba(180,160,255,0.07)" strokeWidth="0.18" />
            ))}
          </svg>

          <div className="absolute hades-orb-core" style={{
            top: '50%', left: '50%',
            width: '18%', aspectRatio: '1 / 1',
            background: 'radial-gradient(circle, rgba(220,200,255,0.55) 0%, rgba(140,110,230,0.30) 35%, rgba(80,50,160,0.10) 60%, transparent 80%)',
            borderRadius: '50%',
            filter: 'blur(2px)',
          }}/>
          <div className="absolute pointer-events-none" style={{
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '7%', aspectRatio: '1 / 1',
            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(220,200,255,0.7) 40%, transparent 80%)',
            borderRadius: '50%',
          }}/>

          {WEAPONS.map((w, i) => {
            const pos = POSITIONS[i]
            const labelAbove = pos.y < -1
            const completedCount = completed.get(w.id)?.size ?? 0
            return (
              <div
                key={w.id}
                className={`hades-pedestal absolute select-none ${labelAbove ? 'label-above' : 'label-below'}`}
                style={{
                  top: `${50 + pos.y}%`,
                  left: `${50 + pos.x}%`,
                  width: '22%',
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  ['--rgb' as string]: w.rgb,
                } as CSSProperties}
                onClick={() => setOpenWeapon(w)}
              >
                <div className="hades-aura absolute inset-0 rounded-full pointer-events-none"/>

                <div className="hades-disc absolute pointer-events-none" style={{
                  bottom: '4%', left: '50%',
                  transform: 'translateX(-50%)',
                  width: '78%', height: '14%',
                  borderRadius: '50%',
                  filter: 'blur(3px)',
                }}/>

                <img
                  src={w.image}
                  alt={w.name}
                  draggable={false}
                  className="hades-weapon-img absolute"
                  style={{
                    top: '50%', left: '50%',
                    width: '88%', height: '88%',
                    objectFit: 'contain',
                  }}
                />

                <div
                  className="absolute pointer-events-none flex justify-center items-center"
                  style={{
                    top: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    gap: '6px',
                  }}
                >
                  {Array.from({ length: TOTAL_BOSSES }).map((_, idx) => {
                    const filled = idx < completedCount
                    return (
                      <div
                        key={idx}
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: filled
                            ? `rgba(${w.rgb}, 0.95)`
                            : 'rgba(255,255,255,0.10)',
                          boxShadow: filled
                            ? `0 0 6px rgba(${w.rgb}, 0.7), 0 0 2px rgba(${w.rgb}, 0.9)`
                            : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                          transition: 'background 0.3s ease, box-shadow 0.3s ease',
                        }}
                      />
                    )
                  })}
                </div>

                <div
                  className="hades-label absolute uppercase font-semibold whitespace-nowrap pointer-events-none"
                  style={{
                    [labelAbove ? 'bottom' : 'top']: labelAbove ? '102%' : 'calc(100% + 26px)',
                    left: '50%',
                    fontSize: '0.7rem',
                    letterSpacing: '0.22em',
                    color: `rgba(${w.rgb},0.95)`,
                    textShadow: `0 0 14px rgba(${w.rgb},0.65), 0 2px 8px rgba(0,0,0,0.85)`,
                  }}
                >
                  {w.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {openWeapon && (
        <HadesIIModal
          weapon={openWeapon}
          completedBosses={completed.get(openWeapon.id) ?? new Set()}
          onMark={(bossId) => handleMark(openWeapon.id, bossId)}
          onClose={() => setOpenWeapon(null)}
        />
      )}
    </GamePageShell>
  )
}
