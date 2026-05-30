import { useEffect, useRef, useState, CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Character, Feat } from './data'

interface Props {
  character: Character
  completed: Set<string>
  accomplished: Set<string>
  onMark: (feat: Feat) => void
  onClose: () => void
}

type FeatState = 'claimed' | 'unclaimed' | 'incomplete'

const PIXEL = "'Silkscreen', 'Courier New', monospace"
const HOLD_MS = 950

const CSS = `
  @keyframes sk-modal-fade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes sk-modal-rise { from { opacity: 0; transform: translateY(14px) scale(0.985) } to { opacity: 1; transform: translateY(0) scale(1) } }
  @keyframes sk-glow-pulse { 0%,100% { opacity: 0.55; transform: scale(1) } 50% { opacity: 0.9; transform: scale(1.08) } }
  @keyframes sk-pip { 0%,100% { opacity: 0.55; transform: scale(1) } 50% { opacity: 1; transform: scale(1.3) } }

  .sk-modal-backdrop { animation: sk-modal-fade 0.14s ease-out; }
  .sk-modal-panel    { animation: sk-modal-rise 0.2s cubic-bezier(0.2,0.8,0.2,1); }

  .sk-plaque { position: relative; overflow: hidden; transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
  .sk-plaque-locked { cursor: pointer; touch-action: none; }
  .sk-plaque-locked:hover { transform: translateY(-3px); }
  .sk-plaque-locked:hover .sk-hint { opacity: 1; transform: translateY(0); }
  .sk-plaque-locked:active { transform: translateY(-1px) scale(0.997); }

  .sk-hint { opacity: 0; transform: translateY(4px); transition: opacity 0.2s ease, transform 0.2s ease; }
`

function usePressHold(duration: number, onComplete: () => void) {
  const [progress, setProgress] = useState(0)
  const raf = useRef<number | null>(null)
  const startedAt = useRef(0)
  const done = useRef(false)
  const cb = useRef(onComplete)
  cb.current = onComplete

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  function frame(now: number) {
    const p = Math.min(1, (now - startedAt.current) / duration)
    setProgress(p)
    if (p >= 1) {
      if (!done.current) { done.current = true; cb.current() }
      return
    }
    raf.current = requestAnimationFrame(frame)
  }
  function begin() {
    if (done.current) return
    if (raf.current) cancelAnimationFrame(raf.current)
    startedAt.current = performance.now()
    raf.current = requestAnimationFrame(frame)
  }
  function cancel() {
    if (done.current) return
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null }
    setProgress(0)
  }
  return { progress, begin, cancel }
}

function Emblem({ image, rgb, size }: { image: string; rgb: string; size: number }) {
  const radius = Math.round(size * 0.09)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute pointer-events-none"
        style={{
          inset: -size * 0.18, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${rgb},0.55) 0%, rgba(${rgb},0.18) 45%, transparent 72%)`,
          filter: 'blur(3px)', animation: 'sk-glow-pulse 3s ease-in-out infinite',
        }}
      />
      <img
        src={image} alt="" draggable={false}
        className="relative w-full h-full"
        style={{ objectFit: 'cover', borderRadius: radius, imageRendering: 'pixelated', filter: `drop-shadow(0 0 5px rgba(${rgb},0.7)) saturate(1.15)` }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ borderRadius: radius, border: `1px solid rgba(${rgb},0.7)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
      />
    </div>
  )
}

function Rivets({ rgb, lit }: { rgb: string; lit: boolean }) {
  const dot: CSSProperties = {
    position: 'absolute', width: 6, height: 6, borderRadius: '50%',
    background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,${lit ? 0.6 : 0.35}), rgba(${rgb},${lit ? 0.5 : 0.15}) 60%, rgba(0,0,0,0.7))`,
    boxShadow: 'inset 0 0 1px rgba(0,0,0,0.9), 0 1px 1px rgba(0,0,0,0.5)',
  }
  return (
    <>
      <div style={{ ...dot, top: 8, left: 8 }} />
      <div style={{ ...dot, top: 8, right: 8 }} />
      <div style={{ ...dot, bottom: 8, left: 8 }} />
      <div style={{ ...dot, bottom: 8, right: 8 }} />
    </>
  )
}

function FeatPlaque({ feat, character, state, hero, onMark }: {
  feat: Feat; character: Character; state: FeatState; hero: boolean; onMark: () => void
}) {
  const rgb = character.rgb
  const claimed = state === 'claimed'
  const unclaimed = state === 'unclaimed'
  const { progress, begin, cancel } = usePressHold(HOLD_MS, onMark)
  const charging = unclaimed && progress > 0

  const emblemSize = hero ? 76 : 52
  const titleSize = hero ? '1.5rem' : '0.95rem'
  const descSize = hero ? '0.82rem' : '0.72rem'

  // only accomplished-but-unclaimed feats can be held to claim.
  const holdHandlers = unclaimed ? {
    onPointerDown: (e: ReactPointerEvent) => { e.preventDefault(); begin() },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  } : {}

  const base = claimed
    ? `linear-gradient(150deg, rgba(${rgb},0.22) 0%, rgba(${rgb},0.06) 42%, rgba(18,18,22,0.94) 100%)`
    : unclaimed
    ? `linear-gradient(150deg, #27272c 0%, #1a1a1e 48%, #131316 100%)`
    : `linear-gradient(150deg, #18181b 0%, #141416 48%, #0f0f11 100%)`

  const titleColor = claimed ? `rgba(${rgb},1)` : unclaimed ? 'rgba(228,228,232,0.8)' : 'rgba(228,228,232,0.4)'

  return (
    <div
      {...holdHandlers}
      className={`sk-plaque ${claimed ? 'sk-plaque-earned' : unclaimed ? 'sk-plaque-locked' : 'sk-plaque-incomplete'}`}
      style={{
        ['--rgb' as string]: rgb,
        padding: hero ? '20px 24px' : '13px 15px',
        minHeight: hero ? 118 : 92,
        borderRadius: hero ? 14 : 11,
        background: base,
        border: `1px solid ${claimed ? `rgba(${rgb},0.5)` : unclaimed ? `rgba(${rgb},0.24)` : 'rgba(255,255,255,0.05)'}`,
        boxShadow: claimed
          ? `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 6px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.5), 0 0 26px rgba(${rgb},0.22)`
          : unclaimed
          ? `inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -2px 6px rgba(0,0,0,0.55), 0 5px 16px rgba(0,0,0,0.45), 0 0 14px rgba(${rgb},0.1)`
          : 'inset 0 -2px 6px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.4)',
        opacity: state === 'incomplete' ? 0.82 : 1,
      }}
    >
      {/* brushed-metal texture */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 3px)', borderRadius: 'inherit' }} />
      {hero && <Rivets rgb={rgb} lit={claimed} />}

      {/* unclaimed signifier — subtle pulsing pip */}
      {unclaimed && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: hero ? 12 : 9, right: hero ? 14 : 11, width: 7, height: 7, borderRadius: '50%',
            background: `rgba(${rgb},0.95)`,
            boxShadow: `0 0 6px rgba(${rgb},0.85), 0 0 2px rgba(${rgb},1)`,
            animation: 'sk-pip 2.4s ease-in-out infinite',
          }}
        />
      )}

      <div className="relative flex items-center" style={{ gap: hero ? 20 : 14, height: '100%' }}>
        {claimed && <Emblem image={feat.icon} rgb={rgb} size={emblemSize} />}

        <div className="min-w-0 flex-1">
          <div
            className="uppercase leading-none"
            style={{
              fontFamily: PIXEL,
              fontSize: titleSize,
              color: titleColor,
              textShadow: claimed
                ? `2px 2px 0 rgba(0,0,0,0.55), 0 0 14px rgba(${rgb},0.5)`
                : '2px 2px 0 rgba(0,0,0,0.5)',
              letterSpacing: '0.01em',
              wordBreak: 'break-word',
            }}
          >
            {feat.name}
          </div>
          <p className="mt-2" style={{ fontSize: descSize, lineHeight: 1.45, color: claimed ? 'rgba(255,255,255,0.62)' : unclaimed ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.32)' }}>
            {feat.description}
          </p>
        </div>
      </div>

      {/* hold hint (unclaimed, on hover) */}
      {unclaimed && (
        <div
          className="sk-hint absolute pointer-events-none uppercase"
          style={{ bottom: 8, right: 12, fontFamily: PIXEL, fontSize: hero ? '0.6rem' : '0.5rem', letterSpacing: '0.08em', color: `rgba(${rgb},0.9)` }}
        >
          {charging ? 'Hold…' : '◉ Hold to claim'}
        </div>
      )}

      {/* charge progress bar along the bottom edge */}
      {charging && (
        <div className="absolute left-0 bottom-0 pointer-events-none" style={{ height: 3, width: `${progress * 100}%`, background: `rgba(${rgb},1)`, boxShadow: `0 0 8px rgba(${rgb},0.9)` }} />
      )}
    </div>
  )
}

export default function ShovelKnightModal({ character, completed, accomplished, onMark, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stateOf = (f: Feat): FeatState =>
    completed.has(f.id) ? 'claimed' : accomplished.has(f.id) ? 'unclaimed' : 'incomplete'

  const total = character.feats.length
  const doneCount = character.feats.filter((f) => completed.has(f.id)).length
  const readyCount = character.feats.filter((f) => stateOf(f) === 'unclaimed').length
  const pct = Math.round((doneCount / total) * 100)
  const rgb = character.rgb

  // claimed -> unclaimed -> incomplete, preserving game order within each tier (stable sort)
  const rank = (f: Feat) => (stateOf(f) === 'claimed' ? 0 : stateOf(f) === 'unclaimed' ? 1 : 2)
  const byState = (a: Feat, b: Feat) => rank(a) - rank(b)
  const grand = character.feats.filter((f) => f.grand).slice().sort(byState)
  const regular = character.feats.filter((f) => !f.grand).slice().sort(byState)

  return (
    <div className="sk-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={onClose}>
      <style>{CSS}</style>
      <div
        className="sk-modal-panel relative rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #15161a 0%, #0b0b0d 100%)',
          border: `1px solid rgba(${rgb},0.2)`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(${rgb},0.16)`,
          maxWidth: 960, width: '100%', maxHeight: '92vh',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.95)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Header */}
        <div className="shrink-0 px-8 pt-8 pb-6" style={{ background: `linear-gradient(180deg, rgba(${rgb},0.16) 0%, transparent 100%)`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-5">
            <div
              className="shrink-0"
              style={{ width: 78, height: 78, borderRadius: '50%', padding: 4, border: `2px solid rgba(${rgb},0.8)`, boxShadow: `0 0 24px rgba(${rgb},0.5)`, background: `radial-gradient(circle, rgba(${rgb},0.25), rgba(0,0,0,0.5))` }}
            >
              <img src={character.image} alt={character.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', imageRendering: 'pixelated' }} />
            </div>
            <div className="min-w-0">
              <p className="uppercase font-semibold" style={{ fontSize: '0.62rem', letterSpacing: '0.32em', color: `rgba(${rgb},0.85)` }}>
                {character.subtitle}
              </p>
              <h2 className="uppercase mt-1.5" style={{ fontFamily: PIXEL, fontSize: '1.7rem', color: 'rgba(255,255,255,0.95)', textShadow: `2px 2px 0 rgba(0,0,0,0.5), 0 0 22px rgba(${rgb},0.4)` }}>
                {character.name}
              </h2>
              <div className="flex items-center gap-3 mt-3">
                <div className="rounded-full overflow-hidden" style={{ width: 180, height: 7, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(to right, rgba(${rgb},0.7), rgba(${rgb},1))`, boxShadow: `0 0 10px rgba(${rgb},0.7)`, transition: 'width 0.4s ease' }} />
                </div>
                <span className="uppercase font-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)' }}>
                  {doneCount} / {total} feats
                </span>
                {readyCount > 0 && (
                  <span className="uppercase font-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: `rgba(${rgb},0.9)` }}>
                    · {readyCount} ready
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Feats */}
        <div className="overflow-y-auto px-8 py-6">
          {grand.length > 0 && (
            <div className="flex flex-col gap-3.5 mb-5">
              {grand.map((feat) => (
                <FeatPlaque key={feat.id} feat={feat} character={character} state={stateOf(feat)} hero onMark={() => onMark(feat)} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {regular.map((feat) => (
              <FeatPlaque key={feat.id} feat={feat} character={character} state={stateOf(feat)} hero={false} onMark={() => onMark(feat)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
