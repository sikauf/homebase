import { useEffect } from 'react'
import { Campaign, Mission } from './data'
import {
  TITLE, DISPLAY, BODY, INK, INK_SOFT, GOLD, GOLD_LIGHT, WAX, GRAIN,
  parchment, toRoman, Compass,
} from './theme'

interface Props {
  campaign: Campaign
  rgb: string
  expansionLabel: string
  onToggle: (index: number, completed: boolean) => void
  onRevert: (index: number) => void
  onClose: () => void
}

const CSS = `
  @keyframes aoe2-fade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes aoe2-unfurl { from { opacity: 0; transform: translateY(18px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
  @keyframes aoe2-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(184,150,78,0.55) } 50% { box-shadow: 0 0 0 7px rgba(184,150,78,0) } }
  .aoe2-mlist::-webkit-scrollbar { width: 9px; }
  .aoe2-mlist::-webkit-scrollbar-thumb { background: rgba(120,90,40,0.4); border-radius: 5px; }
`

export default function AoE2Modal({ campaign, rgb, expansionLabel, onToggle, onRevert, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { completed, total } = campaign
  const pct = total ? Math.round((completed / total) * 100) : 0
  const nextIndex = campaign.missions.find((m) => !m.completed)?.index ?? -1

  return (
    <div
      className="aoe2-fade fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(8,5,3,0.74)', backdropFilter: 'blur(4px)', animation: 'aoe2-fade 0.15s ease-out' }}
      onClick={onClose}
    >
      <style>{CSS}</style>
      <div className="relative w-full max-w-lg" style={{ animation: 'aoe2-unfurl 0.24s cubic-bezier(0.2,0.8,0.2,1)' }} onClick={(e) => e.stopPropagation()}>
        <Dowel />
        <div
          className="relative overflow-hidden flex flex-col"
          style={{
            ...parchment(true),
            maxHeight: '78vh',
            borderLeft: '1px solid rgba(120,90,40,0.5)',
            borderRight: '1px solid rgba(120,90,40,0.5)',
            boxShadow: 'inset 0 0 60px rgba(120,80,30,0.16)',
          }}
        >
          {/* grain */}
          <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GRAIN, backgroundSize: '180px 180px', opacity: 0.5, mixBlendMode: 'multiply' }} />

          {/* header cartouche */}
          <div className="relative px-7 pt-6 pb-5 shrink-0" style={{ borderBottom: '1px solid rgba(120,90,40,0.3)' }}>
            <div className="absolute top-3 right-4 opacity-70"><Compass size={58} /></div>
            <p style={{ fontFamily: TITLE, fontSize: '0.58rem', letterSpacing: '0.3em', color: WAX, textTransform: 'uppercase' }}>
              {expansionLabel}
            </p>
            <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.85rem', lineHeight: 1.05, color: INK, marginTop: 4, maxWidth: '78%' }}>
              {campaign.name}
            </h3>
            <div className="flex items-center gap-3 mt-4" style={{ maxWidth: '80%' }}>
              <div className="rounded-full overflow-hidden flex-1" style={{ height: 5, background: 'rgba(58,44,24,0.18)', border: '1px solid rgba(58,44,24,0.18)' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(to right, #8a6d2f, ${GOLD}, ${GOLD_LIGHT})`, transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontFamily: TITLE, fontSize: '0.8rem', fontWeight: 600, color: INK_SOFT, whiteSpace: 'nowrap' }}>
                {toRoman(completed)} / {toRoman(total)}
              </span>
            </div>
          </div>

          {/* march route */}
          <div className="aoe2-mlist relative overflow-y-auto px-5 py-4">
            <p className="text-center mb-1" style={{ fontFamily: TITLE, fontSize: '0.54rem', letterSpacing: '0.32em', color: 'rgba(94,74,46,0.6)' }}>
              ⚔ MARCH OF CONQUEST ⚔
            </p>
            {campaign.missions.map((m, i) => (
              <MarchNode
                key={m.index}
                mission={m}
                rgb={rgb}
                first={i === 0}
                last={i === campaign.missions.length - 1}
                isNext={m.index === nextIndex}
                onClick={() => onToggle(m.index, !m.completed)}
                onRevert={() => onRevert(m.index)}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(58,44,24,0.14)', color: INK_SOFT, fontSize: '0.8rem', border: '1px solid rgba(58,44,24,0.2)' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <Dowel />
      </div>
    </div>
  )
}

function Dowel() {
  return (
    <div
      style={{
        height: 13,
        margin: '0 -7px',
        borderRadius: 7,
        background: 'linear-gradient(180deg, #8a6735 0%, #5b3f1e 45%, #34230f 100%)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,220,160,0.45), inset 0 -2px 4px rgba(0,0,0,0.4)',
      }}
    />
  )
}

function MarchNode({
  mission, rgb, first, last, isNext, onClick, onRevert,
}: {
  mission: Mission
  rgb: string
  first: boolean
  last: boolean
  isNext: boolean
  onClick: () => void
  onRevert: () => void
}) {
  const done = mission.completed
  return (
    <div className="relative flex items-stretch" style={{ minHeight: 58 }}>
      {/* route rail with dashed connector */}
      <div className="relative shrink-0" style={{ width: 58 }}>
        <span
          aria-hidden
          className="absolute"
          style={{
            left: 28, width: 0,
            top: first ? '50%' : 0,
            bottom: last ? '50%' : 0,
            borderLeft: '2px dashed rgba(58,44,24,0.32)',
          }}
        />
        {/* medallion */}
        <button
          onClick={onClick}
          className="absolute flex items-center justify-center"
          style={{
            left: 7, top: '50%', transform: 'translateY(-50%)',
            width: 42, height: 42, borderRadius: '50%',
            background: done
              ? 'radial-gradient(circle at 38% 32%, #e7c873, #b8964e 62%, #8a6d2f)'
              : isNext
                ? 'radial-gradient(circle at 38% 32%, #f3e7c8, #e0cca0)'
                : 'rgba(58,44,24,0.08)',
            border: done ? '1.5px solid #6e5523' : isNext ? `2px solid ${GOLD}` : '1.5px dashed rgba(58,44,24,0.35)',
            boxShadow: done
              ? 'inset 0 1px 2px rgba(255,240,200,0.6), inset 0 -2px 4px rgba(0,0,0,0.3), 0 3px 7px rgba(0,0,0,0.35)'
              : 'none',
            color: done ? '#5a4416' : INK_SOFT,
            cursor: 'pointer',
            animation: isNext ? 'aoe2-pulse 2.2s ease-in-out infinite' : undefined,
            transition: 'transform 0.15s ease',
          }}
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        >
          {done ? (
            <span style={{ fontSize: '1.05rem', fontWeight: 700, textShadow: '0 1px 0 rgba(255,240,200,0.5)' }}>✓</span>
          ) : (
            <span style={{ fontFamily: TITLE, fontSize: '0.72rem', fontWeight: 600 }}>{toRoman(mission.index + 1)}</span>
          )}
        </button>
        {/* planted pennant on conquered nodes */}
        {done && (
          <span
            aria-hidden
            className="absolute"
            style={{
              left: 40, top: '50%', transform: 'translateY(-150%)',
              width: 13, height: 9,
              background: `rgb(${rgb})`,
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 38% 100%, 0 60%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
            }}
          />
        )}
      </div>

      {/* label + tags */}
      <div className="flex-1 flex items-center justify-between gap-3 py-2 pr-1" style={{ borderBottom: last ? 'none' : '1px solid rgba(58,44,24,0.1)' }}>
        <div className="min-w-0">
          <span style={{ fontFamily: TITLE, fontSize: '0.52rem', letterSpacing: '0.2em', color: 'rgba(94,74,46,0.6)' }}>
            SCENARIO {toRoman(mission.index + 1)}
          </span>
          <p style={{ fontFamily: BODY, fontSize: '1.04rem', lineHeight: 1.2, color: done ? INK : INK_SOFT, fontWeight: done ? 600 : 500 }}>
            {mission.name}
          </p>
        </div>
        <div className="shrink-0">
          {mission.overridden ? (
            <button
              onClick={onRevert}
              style={{ fontFamily: TITLE, fontSize: '0.52rem', letterSpacing: '0.12em', color: 'rgba(94,74,46,0.6)', textTransform: 'uppercase' }}
              title="Revert to detected state"
            >
              by hand ↺
            </button>
          ) : mission.detected ? (
            <span style={{ fontFamily: TITLE, fontSize: '0.5rem', letterSpacing: '0.16em', color: WAX, textTransform: 'uppercase' }} title="Read from your save">
              from save
            </span>
          ) : isNext ? (
            <span style={{ fontFamily: TITLE, fontSize: '0.5rem', letterSpacing: '0.16em', color: GOLD, textTransform: 'uppercase' }}>
              next
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
