import { useEffect, useMemo, useState } from 'react'
import GamePageShell from '../_shared/GamePageShell'
import { Campaign, Expansion, Progress } from './data'
import { fetchProgress, setMission, clearMission } from './api'
import AoE2Modal from './Modal'
import {
  TITLE, DISPLAY, BODY, INK, INK_SOFT, GOLD, GOLD_LIGHT, GRAIN,
  WARROOM, parchment, toRoman, Shield, WaxSeal,
} from './theme'

export default function AgeOfEmpiresII() {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [openCode, setOpenCode] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    fetchProgress()
      .then(setProgress)
      .catch((e) => console.error('Failed to load AoE2 progress:', e))
  }, [])

  const byExpansion = useMemo(() => {
    if (!progress) return []
    return [...progress.expansions]
      .sort((a, b) => a.order - b.order)
      .map((exp) => ({ exp, campaigns: progress.campaigns.filter((c) => c.expansion === exp.id) }))
      .filter((g) => g.campaigns.length > 0)
  }, [progress])

  const open = progress?.campaigns.find((c) => c.code === openCode) ?? null
  const openExp = open ? progress!.expansions.find((e) => e.id === open.expansion) : undefined

  function updateMission(campaign: Campaign, index: number, completed: boolean, revert = false) {
    setProgress((prev) => {
      if (!prev) return prev
      const campaigns = prev.campaigns.map((c) => {
        if (c.code !== campaign.code) return c
        const missions = c.missions.map((m) =>
          m.index === index ? { ...m, completed: revert ? m.detected : completed, overridden: !revert } : m
        )
        return { ...c, missions, completed: missions.filter((m) => m.completed).length }
      })
      return { ...prev, campaigns }
    })
    const p = revert ? clearMission(campaign.code, index) : setMission(campaign.code, index, completed)
    p.catch((e) => console.error('Failed to save mission state:', e))
  }

  const totalDone = progress?.campaigns.reduce((s, c) => s + c.completed, 0) ?? 0
  const totalAll = progress?.campaigns.reduce((s, c) => s + c.total, 0) ?? 0

  return (
    <GamePageShell title="Campaigns">
      <style>{CSS}</style>
      <div className="flex-1 min-h-0 overflow-y-auto aoe2-scroll" style={WARROOM}>
        <div className="px-7 pb-12 max-w-6xl mx-auto">
          {/* sub-banner */}
          <div className="flex flex-col items-center mt-1 mb-9">
            <p style={{ fontFamily: TITLE, fontWeight: 600, fontSize: '0.64rem', letterSpacing: '0.42em', color: 'rgba(224,190,118,0.95)', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
              AGE OF EMPIRES II · DEFINITIVE EDITION
            </p>
            <div className="flex items-center gap-2.5 mt-2.5" aria-hidden>
              <span style={{ height: 1, width: 64, background: 'linear-gradient(to right, transparent, rgba(184,150,78,0.55))' }} />
              <span style={{ color: GOLD, fontSize: '0.7rem' }}>✦</span>
              <span style={{ height: 1, width: 64, background: 'linear-gradient(to left, transparent, rgba(184,150,78,0.55))' }} />
            </div>
            <p className="mt-3" style={{ fontFamily: BODY, fontStyle: 'italic', fontSize: '0.92rem', color: 'rgba(220,200,160,0.7)' }}>
              {totalDone} of {totalAll} scenarios secured across the ages
            </p>
            {progress && !progress.saveAvailable && (
              <span
                className="mt-3 text-[0.58rem] uppercase tracking-[0.2em] rounded-full px-2.5 py-0.5"
                style={{ fontFamily: TITLE, color: 'rgba(220,180,120,0.85)', border: '1px solid rgba(220,180,120,0.3)' }}
              >
                profile not detected — record by hand
              </span>
            )}
          </div>

          {byExpansion.map(({ exp, campaigns }) => (
            <section key={exp.id} className="mb-11">
              <ExpansionBanner exp={exp} campaigns={campaigns} />
              <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))' }}>
                {campaigns.map((c) => (
                  <CampaignCharter
                    key={c.code}
                    campaign={c}
                    rgb={exp.rgb}
                    hovered={hovered === c.code}
                    onHover={(h) => setHovered(h ? c.code : null)}
                    onClick={() => setOpenCode(c.code)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {open && openExp && (
        <AoE2Modal
          campaign={open}
          rgb={openExp.rgb}
          expansionLabel={openExp.label}
          onToggle={(index, completed) => updateMission(open, index, completed)}
          onRevert={(index) => updateMission(open, index, false, true)}
          onClose={() => setOpenCode(null)}
        />
      )}
    </GamePageShell>
  )
}

const CSS = `
  @keyframes aoe2-seal-in { from { opacity: 0; transform: rotate(-9deg) scale(1.4) } to { opacity: 1; transform: rotate(-9deg) scale(1) } }
  .aoe2-scroll::-webkit-scrollbar { width: 10px; }
  .aoe2-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
  .aoe2-scroll::-webkit-scrollbar-thumb { background: rgba(184,150,78,0.35); border-radius: 5px; border: 2px solid transparent; background-clip: padding-box; }
  .aoe2-scroll::-webkit-scrollbar-thumb:hover { background: rgba(184,150,78,0.55); background-clip: padding-box; }
`

function ExpansionBanner({ exp, campaigns }: { exp: Expansion; campaigns: Campaign[] }) {
  const done = campaigns.reduce((s, c) => s + c.completed, 0)
  const total = campaigns.reduce((s, c) => s + c.total, 0)
  const allDone = done === total
  return (
    <div className="flex items-center gap-4">
      <span className="flex-1 hidden sm:block" style={{ height: 1, background: `linear-gradient(to right, transparent, rgba(${exp.rgb},0.5))` }} />
      {/* hanging cloth pennant */}
      <div
        className="relative px-7 pt-3 pb-5 text-center shrink-0"
        style={{
          background: `linear-gradient(175deg, rgb(${exp.rgb}) 0%, rgba(${exp.rgb},0.78) 100%)`,
          clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)',
          boxShadow: `0 6px 18px rgba(0,0,0,0.5)`,
          minWidth: 230,
        }}
      >
        {/* gold pinstripe + inner shade */}
        <span className="absolute inset-x-2 top-1.5" style={{ height: 1, background: 'rgba(255,240,200,0.5)' }} />
        <h3 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '1.02rem', letterSpacing: '0.04em', color: '#fbf2dc', textShadow: '0 1px 3px rgba(0,0,0,0.55)' }}>
          {exp.label}
        </h3>
        <p style={{ fontFamily: TITLE, fontSize: '0.56rem', letterSpacing: '0.3em', color: 'rgba(255,245,225,0.78)', marginTop: 3 }}>
          {allDone ? 'FULLY CONQUERED' : `${done} / ${total} SCENARIOS`}
        </p>
      </div>
      <span className="flex-1 hidden sm:block" style={{ height: 1, background: `linear-gradient(to left, transparent, rgba(${exp.rgb},0.5))` }} />
    </div>
  )
}

function CampaignCharter({
  campaign, rgb, hovered, onHover, onClick,
}: {
  campaign: Campaign
  rgb: string
  hovered: boolean
  onHover: (h: boolean) => void
  onClick: () => void
}) {
  const { completed, total } = campaign
  const complete = total > 0 && completed === total
  const started = completed > 0
  const status = complete ? 'Conquered' : started ? 'On Campaign' : 'Sealed Orders'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="relative text-left rounded-[10px] overflow-hidden select-none"
      style={{
        ...parchment(hovered),
        padding: '15px 17px 14px',
        border: `1px solid ${hovered ? 'rgba(184,150,78,0.95)' : 'rgba(120,90,40,0.55)'}`,
        boxShadow: hovered
          ? `inset 0 0 0 1px rgba(255,240,200,0.35), inset 0 0 30px rgba(120,80,30,0.18), 0 14px 32px rgba(0,0,0,0.55), 0 0 22px rgba(${rgb},0.22)`
          : 'inset 0 0 0 1px rgba(255,240,200,0.18), 0 4px 14px rgba(0,0,0,0.5)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.25s cubic-bezier(0.3,0.8,0.3,1), box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease',
      }}
    >
      {/* paper grain */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRAIN, backgroundSize: '180px 180px', opacity: 0.5, mixBlendMode: 'multiply' }}
      />

      <div className="relative">
        {/* top row: house mark + status */}
        <div className="flex items-center gap-2 mb-2.5">
          <Shield size={13} fill={`rgb(${rgb})`} stroke="rgba(0,0,0,0.25)" />
          <span style={{ fontFamily: TITLE, fontSize: '0.56rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: started ? INK_SOFT : 'rgba(94,74,46,0.55)' }}>
            {status}
          </span>
        </div>

        {/* name */}
        <h4 style={{ fontFamily: TITLE, fontWeight: 600, fontSize: '1.16rem', lineHeight: 1.12, color: INK, paddingRight: complete ? 40 : 0 }}>
          {campaign.name}
        </h4>

        {/* mission shields + roman tally */}
        <div className="flex items-end justify-between gap-3 mt-4">
          <div className="flex items-center" style={{ gap: 4 }}>
            {campaign.missions.map((m) => (
              <Shield
                key={m.index}
                size={13}
                fill={m.completed ? GOLD : 'rgba(58,44,24,0.10)'}
                stroke={m.completed ? GOLD_LIGHT : 'rgba(58,44,24,0.4)'}
                glow={m.completed ? 'rgba(184,150,78,0.6)' : undefined}
              />
            ))}
          </div>
          <span style={{ fontFamily: TITLE, fontSize: '0.82rem', fontWeight: 600, color: complete ? GOLD : INK_SOFT, whiteSpace: 'nowrap' }}>
            {toRoman(completed)}<span style={{ color: 'rgba(94,74,46,0.45)' }}> / {toRoman(total)}</span>
          </span>
        </div>
      </div>

      {/* victory wax seal */}
      {complete && (
        <div className="absolute" style={{ top: 10, right: 10, animation: 'aoe2-seal-in 0.4s cubic-bezier(0.3,0.9,0.3,1)' }}>
          <WaxSeal size={46} glyph="✓" />
        </div>
      )}
    </button>
  )
}
