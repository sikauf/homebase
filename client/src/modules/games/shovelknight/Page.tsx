import { useEffect, useState } from 'react'
import GamePageShell from '../_shared/GamePageShell'
import { CHARACTERS, Character, Feat } from './data'
import { fetchFeats, fetchAccomplished, markFeat } from './api'
import ShovelKnightModal from './Modal'
import Celebration from './Celebration'

const PIXEL = "'Silkscreen', 'Courier New', monospace"

export default function ShovelKnight() {
  const [completed, setCompleted] = useState<Map<string, Set<string>>>(new Map())
  const [accomplished, setAccomplished] = useState<Map<string, Set<string>>>(new Map())
  const [open, setOpen] = useState<Character | null>(null)
  const [celebration, setCelebration] = useState<{ character: Character; feat: Feat } | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    fetchFeats()
      .then((rows) => {
        const map = new Map<string, Set<string>>()
        for (const row of rows) {
          if (!map.has(row.character_id)) map.set(row.character_id, new Set())
          map.get(row.character_id)!.add(row.feat_id)
        }
        setCompleted(map)
      })
      .catch((e) => console.error('Failed to load feats:', e))

    fetchAccomplished()
      .then((data) => {
        const map = new Map<string, Set<string>>()
        for (const [charId, featIds] of Object.entries(data)) map.set(charId, new Set(featIds))
        setAccomplished(map)
      })
      .catch((e) => console.error('Failed to load accomplished feats:', e))
  }, [])

  function handleMark(character: Character, feat: Feat) {
    setCompleted((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(character.id) ?? [])
      set.add(feat.id)
      next.set(character.id, set)
      return next
    })
    markFeat(character.id, feat.id).catch((e) => console.error('Failed to save feat:', e))
    setCelebration({ character, feat })
  }

  return (
    <GamePageShell title="Feats">
      <style>{`@keyframes sk-ready-pip { 0%,100% { opacity: 0.5; transform: scale(1) } 50% { opacity: 1; transform: scale(1.35) } }`}</style>
      <div className="flex-1 px-5 pb-5 grid grid-cols-4 gap-4 min-h-0">
        {CHARACTERS.map((c) => {
          const done = completed.get(c.id)?.size ?? 0
          const total = c.feats.length
          const pct = Math.round((done / total) * 100)
          const all = total > 0 && done === total
          const claimedSet = completed.get(c.id)
          const readyCount = [...(accomplished.get(c.id) ?? [])].filter((id) => !claimedSet?.has(id)).length
          const isHovered = hoveredId === c.id
          const lit = isHovered || all

          return (
            <div
              key={c.id}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="relative flex"
              style={{
                transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
                willChange: 'transform',
              }}
            >
              {/* colored halo — static shadow, animated via opacity (composited) */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  boxShadow: `0 18px 50px rgba(0,0,0,0.6), 0 0 46px rgba(${c.rgb},0.42)`,
                  opacity: isHovered ? 1 : all ? 0.5 : 0,
                  willChange: 'opacity',
                  transition: 'opacity 0.3s ease',
                }}
              />
              <button
                onClick={() => setOpen(c)}
                className="relative flex-1 min-w-0 rounded-2xl overflow-hidden flex flex-col text-left select-none"
                style={{
                  background: `linear-gradient(180deg, rgba(${c.rgb},0.10) 0%, #141416 55%, #0e0e10 100%)`,
                  border: `1px solid ${lit ? `rgba(${c.rgb},0.5)` : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: '0 4px 22px rgba(0,0,0,0.55)',
                  transition: 'border-color 0.3s ease',
                }}
              >
              <div className="flex-1 relative overflow-hidden min-h-0">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse 72% 58% at 50% 62%, rgba(${c.rgb},0.5) 0%, transparent 70%)`,
                    opacity: isHovered ? 0.92 : 0.6,
                    transition: 'opacity 0.3s ease',
                  }}
                />
                <div
                  className="absolute inset-x-0 top-0 h-20 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)' }}
                />
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: '50%', bottom: '4%', width: '78%', height: 30, transform: 'translateX(-50%)',
                    background: `radial-gradient(ellipse at center, rgba(${c.rgb},0.6) 0%, transparent 72%)`,
                    opacity: isHovered ? 0.92 : 0.57,
                    filter: 'blur(6px)', transition: 'opacity 0.3s ease',
                  }}
                />
                <img
                  src={c.art}
                  alt={c.name}
                  draggable={false}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    height: `${c.artHeight ?? 90}%`,
                    width: 'auto',
                    maxWidth: 'none',
                    transform: `translateX(calc(-50% + ${c.artOffsetX ?? '0px'})) scale(${isHovered ? 1.04 : 1})`,
                    transformOrigin: 'center bottom',
                    willChange: 'transform',
                    transition: 'transform 0.3s ease',
                  }}
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, transparent, #0e0e10)' }}
                />
              </div>

              <div className="shrink-0 relative px-4 pt-3 pb-4" style={{ background: '#0e0e10' }}>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `rgba(${c.rgb},0.06)`, opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s ease' }}
                />
                <div className="relative">
                  <p className="uppercase font-semibold" style={{ fontSize: '0.52rem', letterSpacing: '0.26em', color: `rgba(${c.rgb},0.9)` }}>
                    {c.subtitle}
                  </p>
                  <h3 className="uppercase mt-1.5" style={{ fontFamily: PIXEL, fontSize: '0.95rem', lineHeight: 1.15, color: 'rgba(255,255,255,0.95)', textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
                    {c.name}
                  </h3>
                  <div className="flex items-center gap-2.5 mt-3">
                    <div className="rounded-full overflow-hidden flex-1" style={{ height: 5, background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(to right, rgba(${c.rgb},0.7), rgba(${c.rgb},1))`, boxShadow: `0 0 8px rgba(${c.rgb},0.7)`, transition: 'width 0.4s ease' }} />
                    </div>
                    <span className="shrink-0 tabular-nums font-semibold" style={{ fontSize: '0.72rem', color: all ? `rgba(${c.rgb},1)` : 'rgba(255,255,255,0.55)' }}>
                      {done} / {total}
                    </span>
                  </div>
                </div>
              </div>

              {all ? (
                <div
                  className="absolute top-3 right-3 uppercase font-bold rounded px-1.5 py-0.5"
                  style={{ fontSize: '0.48rem', letterSpacing: '0.12em', color: '#0c0c0c', background: `rgba(${c.rgb},0.95)`, boxShadow: `0 0 12px rgba(${c.rgb},0.6)` }}
                >
                  ✦ Complete
                </div>
              ) : readyCount > 0 ? (
                <div
                  className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full pointer-events-none"
                  style={{ padding: '2px 7px 2px 6px', background: 'rgba(0,0,0,0.5)', border: `1px solid rgba(${c.rgb},0.45)` }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: `rgba(${c.rgb},0.95)`, boxShadow: `0 0 6px rgba(${c.rgb},0.9)`, animation: 'sk-ready-pip 2.4s ease-in-out infinite' }}
                  />
                  <span className="uppercase font-semibold tabular-nums" style={{ fontSize: '0.46rem', letterSpacing: '0.1em', color: `rgba(${c.rgb},0.95)` }}>
                    {readyCount} ready
                  </span>
                </div>
              ) : null}
              </button>
            </div>
          )
        })}
      </div>

      {open && (
        <ShovelKnightModal
          character={open}
          completed={completed.get(open.id) ?? new Set()}
          accomplished={accomplished.get(open.id) ?? new Set()}
          onMark={(feat) => handleMark(open, feat)}
          onClose={() => setOpen(null)}
        />
      )}

      {celebration && (
        <Celebration
          character={celebration.character}
          feat={celebration.feat}
          onDone={() => setCelebration(null)}
        />
      )}
    </GamePageShell>
  )
}
