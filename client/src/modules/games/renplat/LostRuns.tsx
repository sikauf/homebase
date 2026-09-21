import { useState } from 'react'
import type { Fight, RunSummary } from './api'
import { Sprite } from './MonCard'
import { formatPlaytime } from './data'

interface Props {
  runs: RunSummary[]
  fights: Fight[]
  onEnd: (id: number, status: 'lost' | 'won', fightId: number | null, postMortem: string) => Promise<void>
  onReopen: (id: number) => Promise<void>
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#5fb85f', bg: 'rgba(95,184,95,0.15)' },
  lost: { label: 'Dead', color: '#e06060', bg: 'rgba(220,90,90,0.15)' },
  won: { label: 'Cleared', color: '#d2a03c', bg: 'rgba(210,160,60,0.18)' },
}

function EndRunForm({ run, fights, onEnd }: { run: RunSummary; fights: Fight[]; onEnd: Props['onEnd'] }) {
  const [open, setOpen] = useState(false)
  const [fightId, setFightId] = useState('')
  const [postMortem, setPostMortem] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] px-2 py-1 rounded"
        style={{ background: 'rgba(220,90,90,0.1)', border: '1px solid rgba(220,90,90,0.25)', color: '#c77' }}
      >
        Mark this run dead
      </button>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <select
        value={fightId}
        onChange={(e) => setFightId(e.target.value)}
        className="rounded-lg px-2 py-1.5 text-xs"
        style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
      >
        <option value="">What ended it?</option>
        {fights.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
            {f.location ? ` — ${f.location}` : ''}
          </option>
        ))}
      </select>
      <textarea
        value={postMortem}
        onChange={(e) => setPostMortem(e.target.value)}
        rows={2}
        placeholder="Post-mortem — what would you do differently?"
        className="rounded-lg px-2 py-1.5 text-xs resize-none"
        style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
      />
      <div className="flex gap-2">
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            try {
              await onEnd(run.id, 'lost', fightId ? Number(fightId) : null, postMortem.trim())
              setOpen(false)
            } finally {
              setSaving(false)
            }
          }}
          className="flex-1 rounded-lg py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ background: 'rgba(220,90,90,0.18)', border: '1px solid rgba(220,90,90,0.4)', color: '#e88' }}
        >
          {saving ? 'Saving…' : 'End the run'}
        </button>
        <button
          onClick={async () => {
            await onEnd(run.id, 'won', null, postMortem.trim())
            setOpen(false)
          }}
          className="rounded-lg px-3 py-1.5 text-xs"
          style={{ background: 'rgba(210,160,60,0.15)', border: '1px solid rgba(210,160,60,0.35)', color: '#d2a03c' }}
        >
          Actually, I won
        </button>
        <button onClick={() => setOpen(false)} className="text-[10px] px-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function LostRuns({ runs, fights, onEnd, onReopen }: Props) {
  if (runs.length === 0) {
    return (
      <div className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.25)' }}>
        No runs yet — upload a save to open run #1.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {runs.map((run) => {
        const style = STATUS_STYLE[run.status] ?? STATUS_STYLE.active
        const killedBy = fights.find((f) => f.id === run.death_fight_id)
        return (
          <div
            key={run.id}
            className="rounded-xl p-3"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white">Run #{run.number}</span>
              <span
                className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                style={{ background: style.bg, color: style.color }}
              >
                {style.label}
              </span>
              <span className="text-[11px] tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {run.badges} {run.badges === 1 ? 'badge' : 'badges'} · {formatPlaytime(run.playtime_seconds)} ·{' '}
                {run.deaths} {run.deaths === 1 ? 'death' : 'deaths'}
              </span>
              <span className="flex-1" />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {run.trainer_name} · ID {run.trainer_id}
              </span>
            </div>

            {killedBy && (
              <div className="text-xs mt-1.5" style={{ color: '#c77' }}>
                Ended at {killedBy.name}
                {killedBy.location ? ` — ${killedBy.location}` : ''}
              </div>
            )}
            {run.post_mortem && (
              <div className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {run.post_mortem}
              </div>
            )}

            {run.final_team.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                <span className="text-[10px] mr-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {run.status === 'active' ? 'Team' : 'Final team'}
                </span>
                {run.final_team.map((m, i) => (
                  <span key={i} className="flex items-center" title={`${m.nickname} Lv ${m.level}`}>
                    <Sprite species={m.species} size={32} dead={run.status === 'lost'} />
                    <span className="text-[9px] tabular-nums -ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {m.level}
                    </span>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-2">
              {run.status === 'active' ? (
                <EndRunForm run={run} fights={fights} onEnd={onEnd} />
              ) : (
                <button
                  onClick={() => onReopen(run.id)}
                  className="text-[10px]"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  Reopen
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
