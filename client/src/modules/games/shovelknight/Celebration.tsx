import { useEffect, useMemo, CSSProperties } from 'react'
import { Character, Feat } from './data'

interface Props {
  character: Character
  feat: Feat
  onDone: () => void
}

const PIXEL = "'Silkscreen', 'Courier New', monospace"

// Grand sequence timing (s)
const SHATTER_AT = 1.5 // seconds

const CSS = `
  @keyframes sk-backdrop-in { from { opacity: 0 } to { opacity: 1 } }
  @keyframes sk-vanish { to { opacity: 0 } }

  @keyframes sk-medallion-in {
    0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4) rotate(-12deg); }
    55%  { opacity: 1; transform: translate(-50%, -50%) scale(1.12) rotate(3deg); }
    70%  { transform: translate(-50%, -50%) scale(0.97) rotate(0deg); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
  }
  @keyframes sk-text-in {
    0%   { opacity: 0; transform: translateY(10px); letter-spacing: 0.6em; }
    100% { opacity: 1; transform: translateY(0);    letter-spacing: 0.22em; }
  }
  @keyframes sk-ring-pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1);   opacity: 0.55; }
    50%      { transform: translate(-50%, -50%) scale(1.25); opacity: 0; }
  }
  @keyframes sk-spark {
    0%   { opacity: 0; transform: translate(-50%, -50%) scale(0); }
    25%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.2); }
  }
  @keyframes sk-rays-spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }

  /* Grand: chisel -> crack -> shatter -> reveal */
  @keyframes sk-emblem-appear { 0% { opacity: 0; transform: scale(0.55) } 100% { opacity: 1; transform: scale(1) } }
  @keyframes sk-chisel {
    0%,24%,42%,62%,78%,100% { transform: translate(0,0) }
    30% { transform: translate(-3px, 1px) } 36% { transform: translate(3px, -1px) }
    66% { transform: translate(-4px, 1px) } 72% { transform: translate(4px, -2px) }
    92% { transform: translate(-6px, 2px) } 96% { transform: translate(6px, -2px) }
  }
  @keyframes sk-crack-draw { from { stroke-dashoffset: 100 } to { stroke-dashoffset: 0 } }
  @keyframes sk-shatter {
    0%   { transform: translate(0,0) rotate(0deg); opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
  }
  @keyframes sk-flash {
    0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.2); }
    25%  { opacity: 0.95; }
    100% { opacity: 0; transform: translate(-50%,-50%) scale(2.4); }
  }
  @keyframes sk-reveal-pop {
    0% { transform: scale(0.88) } 55% { transform: scale(1.07) } 100% { transform: scale(1) }
  }
  @keyframes sk-glow-rise { from { opacity: 0 } to { opacity: 1 } }
  @keyframes sk-stamp {
    0%   { opacity: 0; transform: scale(1.6); }
    55%  { opacity: 1; transform: scale(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes sk-rise-in { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }

  .sk-medallion-in { animation: sk-medallion-in 0.6s cubic-bezier(0.2,0.9,0.3,1.2) both; }
`

function Sparkles({ rgb, count, radius, delay = 0.1 }: { rgb: string; count: number; radius: number; delay?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 2 ? 0.3 : 0)
        const dist = radius * (0.7 + (i % 3) * 0.15)
        const size = 5 + (i % 3) * 3
        const style: CSSProperties = {
          position: 'absolute', top: '50%', left: '50%', width: size, height: size, borderRadius: '50%',
          background: `rgba(${rgb}, 0.95)`,
          boxShadow: `0 0 8px rgba(${rgb},0.9), 0 0 14px rgba(${rgb},0.6)`,
          ['--tx' as string]: `${Math.cos(angle) * dist}px`,
          ['--ty' as string]: `${Math.sin(angle) * dist}px`,
          animation: `sk-spark 1.2s ease-out ${delay + (i % 4) * 0.05}s both`,
        }
        return <div key={i} style={style} />
      })}
    </>
  )
}

// matches the modal: zoom past the decorative frame so the symbol fills the crest.
const ICON_ZOOM = 1.7

function Crest({ image, rgb, size }: { image: string; rgb: string; size: number }) {
  return (
    <div
      style={{
        position: 'relative', width: size, height: size, borderRadius: '50%', padding: 6, overflow: 'hidden',
        background: `radial-gradient(circle at 50% 35%, rgba(${rgb},0.35), rgba(0,0,0,0.6))`,
        border: `2px solid rgba(${rgb},0.85)`,
        boxShadow: `0 0 30px rgba(${rgb},0.7), 0 0 60px rgba(${rgb},0.35), inset 0 0 24px rgba(0,0,0,0.7)`,
      }}
    >
      <img src={image} alt="" draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', imageRendering: 'pixelated', transform: `scale(${ICON_ZOOM})` }} />
    </div>
  )
}

const SIZE = 224
const GRID = 6
const CELL = SIZE / GRID

function ShatterEmblem({ image, rgb }: { image: string; rgb: string }) {
  const shards = useMemo(() => {
    const out: { r: number; c: number; dx: number; dy: number; rot: number; delay: number }[] = []
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const cx = c * CELL + CELL / 2 - SIZE / 2
        const cy = r * CELL + CELL / 2 - SIZE / 2
        const dx = cx * 2.6 + (Math.random() * 60 - 30)
        const dy = cy * 2.6 + (Math.random() * 70 - 10) // slight downward bias
        const rot = Math.random() * 360 - 180
        const delay = SHATTER_AT + Math.random() * 0.14
        out.push({ r, c, dx, dy, rot, delay })
      }
    }
    return out
  }, [])

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE, animation: `sk-emblem-appear 0.35s ease-out both, sk-chisel 1.4s ease-in-out 0.3s both` }}>
      {/* glow behind, rises in after shatter */}
      <div className="absolute pointer-events-none" style={{
        inset: -SIZE * 0.22, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${rgb},0.6) 0%, rgba(${rgb},0.22) 45%, transparent 72%)`,
        filter: 'blur(6px)', animation: `sk-glow-rise 0.9s ease-out ${SHATTER_AT + 0.05}s both`,
      }} />

      {/* full-color emblem, revealed when shards fly */}
      <img src={image} alt="" draggable={false} className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', borderRadius: 10, imageRendering: 'pixelated', animation: `sk-reveal-pop 0.5s ease-out ${SHATTER_AT}s both` }} />

      {/* metal frame (revealed with color emblem) */}
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 10, border: `2px solid rgba(${rgb},0.8)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15)` }} />

      {/* grayscale shards on top, assembled then exploding */}
      {shards.map((s) => (
        <div
          key={`${s.r}-${s.c}`}
          className="absolute"
          style={{
            width: CELL, height: CELL, left: s.c * CELL, top: s.r * CELL,
            backgroundImage: `url(${image})`, backgroundSize: `${SIZE}px ${SIZE}px`,
            backgroundPosition: `-${s.c * CELL}px -${s.r * CELL}px`,
            filter: 'grayscale(1) brightness(0.5) contrast(1.05)',
            boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.35)',
            ['--dx' as string]: `${s.dx}px`,
            ['--dy' as string]: `${s.dy}px`,
            ['--rot' as string]: `${s.rot}deg`,
            animation: `sk-shatter 0.85s cubic-bezier(0.3,0.1,0.2,1) ${s.delay}s both`,
          }}
        />
      ))}

      {/* crack lines drawn over the grayscale, then vanish at shatter */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ animation: `sk-vanish 0.2s linear ${SHATTER_AT}s forwards`, filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.7))' }}>
        {[
          { d: 'M50 50 L43 32 L51 16 L45 2', delay: 0.45 },
          { d: 'M50 50 L70 45 L85 51 L99 43', delay: 0.7 },
          { d: 'M50 50 L55 71 L47 86 L53 99', delay: 0.95 },
          { d: 'M50 50 L29 55 L14 47 L1 53', delay: 1.15 },
          { d: 'M50 50 L66 64 L80 82', delay: 1.3 },
        ].map((cr, i) => (
          <path key={i} d={cr.d} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
            pathLength={100} style={{ strokeDasharray: 100, animation: `sk-crack-draw 0.35s ease-out ${cr.delay}s both` }} />
        ))}
      </svg>

      {/* impact flash at the moment of shatter */}
      <div className="absolute pointer-events-none" style={{
        top: '50%', left: '50%', width: SIZE * 1.1, height: SIZE * 1.1, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(${rgb},0.6) 35%, transparent 70%)`,
        animation: `sk-flash 0.6s ease-out ${SHATTER_AT - 0.02}s both`,
      }} />

      <Sparkles rgb={rgb} count={22} radius={190} delay={SHATTER_AT} />
    </div>
  )
}

export default function Celebration({ character, feat, onDone }: Props) {
  const grand = !!feat.grand

  useEffect(() => {
    // Grand celebrations linger until the user clicks the screen.
    if (grand) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') onDone()
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(onDone, 2600)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [grand, onDone])

  if (grand) {
    const rgb = character.rgb
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center cursor-pointer overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(10,10,14,0.93) 0%, rgba(0,0,0,0.98) 70%)',
          animation: 'sk-backdrop-in 0.25s ease-out',
        }}
        onClick={onDone}
      >
        <style>{CSS}</style>

        <div className="absolute pointer-events-none" style={{
          top: '50%', left: '50%', width: '170vmax', height: '170vmax',
          background: `repeating-conic-gradient(from 0deg, rgba(${rgb},0.06) 0deg 6deg, transparent 6deg 12deg)`,
          animation: 'sk-rays-spin 44s linear infinite',
        }} />

        <div className="relative flex flex-col items-center" style={{ width: 'min(92vw, 560px)' }}>
          <ShatterEmblem image={feat.icon} rgb={rgb} />

          <p className="mt-9 uppercase font-semibold" style={{
            fontSize: '0.68rem', letterSpacing: '0.5em', color: `rgba(${rgb},0.95)`, textShadow: `0 0 14px rgba(${rgb},0.7)`,
            animation: `sk-rise-in 0.5s ease-out ${SHATTER_AT + 0.35}s both`,
          }}>
            Feat Earned
          </p>

          <h2 className="mt-4 px-6 text-center uppercase" style={{
            fontFamily: PIXEL, fontSize: 'clamp(1.5rem, 4.5vw, 2.6rem)', lineHeight: 1.15, color: 'rgba(255,255,255,0.98)',
            textShadow: `3px 3px 0 rgba(0,0,0,0.6), 0 0 30px rgba(${rgb},0.55)`,
            animation: `sk-stamp 0.5s cubic-bezier(0.2,0.8,0.3,1.2) ${SHATTER_AT + 0.45}s both`,
          }}>
            {feat.name}
          </h2>

          <div className="flex items-center gap-3 mt-5" style={{ animation: `sk-rise-in 0.5s ease-out ${SHATTER_AT + 0.6}s both` }}>
            <div style={{ height: 2, width: 70, background: `linear-gradient(to right, transparent, rgba(${rgb},0.9))` }} />
            <div style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: `rgba(${rgb},0.95)`, boxShadow: `0 0 10px rgba(${rgb},0.8)` }} />
            <div style={{ height: 2, width: 70, background: `linear-gradient(to left, transparent, rgba(${rgb},0.9))` }} />
          </div>

          <p className="mt-5 px-10 text-center" style={{
            fontSize: '0.82rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.62)',
            animation: `sk-rise-in 0.5s ease-out ${SHATTER_AT + 0.7}s both`,
          }}>
            {feat.description}
          </p>
          <p className="mt-2 uppercase" style={{
            fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)',
            animation: `sk-rise-in 0.5s ease-out ${SHATTER_AT + 0.8}s both`,
          }}>
            {character.name} &middot; {character.subtitle}
          </p>
          <p className="mt-10 uppercase" style={{
            fontSize: '0.55rem', letterSpacing: '0.35em', color: 'rgba(255,255,255,0.25)',
            animation: `sk-rise-in 0.6s ease-out ${SHATTER_AT + 1.4}s both`,
          }}>
            Click anywhere to continue
          </p>
        </div>
      </div>
    )
  }

  // Normal feat — centered medallion + sparkle burst, auto-dismiss.
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center cursor-pointer"
      style={{ background: 'rgba(0,0,0,0.45)', animation: 'sk-backdrop-in 0.2s ease-out' }}
      onClick={onDone}
    >
      <style>{CSS}</style>
      <div className="sk-medallion-in absolute" style={{ top: '50%', left: '50%' }}>
        <div className="relative flex flex-col items-center" style={{ transform: 'translate(-50%, -50%)' }}>
          <div className="absolute pointer-events-none" style={{
            top: '50%', left: '50%', width: 150, height: 150, borderRadius: '50%',
            border: `2px solid rgba(${character.rgb},0.7)`, animation: 'sk-ring-pulse 1.4s ease-out infinite',
          }} />
          <div className="relative">
            <Crest image={feat.icon} rgb={character.rgb} size={116} />
            <Sparkles rgb={character.rgb} count={14} radius={120} />
          </div>
          <p className="mt-5 uppercase font-semibold" style={{ fontSize: '0.6rem', letterSpacing: '0.45em', color: `rgba(${character.rgb},0.95)`, textShadow: `0 0 12px rgba(${character.rgb},0.7)` }}>
            Feat Earned
          </p>
          <h3 className="mt-2 text-center uppercase whitespace-nowrap" style={{
            fontFamily: PIXEL, fontSize: '1.4rem', color: 'rgba(255,255,255,0.97)',
            textShadow: `2px 2px 0 rgba(0,0,0,0.6), 0 0 22px rgba(${character.rgb},0.5)`,
            animation: 'sk-stamp 0.45s cubic-bezier(0.2,0.8,0.3,1.2) 0.15s both',
          }}>
            {feat.name}
          </h3>
        </div>
      </div>
    </div>
  )
}
