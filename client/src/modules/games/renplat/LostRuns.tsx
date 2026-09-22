import { useState } from 'react'
import type { Fight, RunSummary } from './api'
import { Sprite } from './MonCard'
import RunName from './RunName'
import { formatPlaytime } from './data'

interface Props {
  runs: RunSummary[]
  fights: Fight[]
  onEnd: (id: number, status: 'lost' | 'won', fightId: number | null, postMortem: string) => Promise<void>
  onReopen: (id: number) => Promise<void>
  onRename: (id: number, name: string) => Promise<void>
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#5fb85f', bg: 'rgba(95,184,95,0.15)' },
  lost: { label: 'Dead', color: '#e06060', bg: 'rgba(220,90,90,0.15)' },
  won: { label: 'Cleared', color: '#d2a03c', bg: 'rgba(210,160,60,0.18)' },
}

function EndRunPanel({ run, fights, onEnd, onClose }: {
  run: RunSummary
  fights: Fight[]
  onEnd: Props['onEnd']
  onClose: () => void
}) {
  const [fightId, setFightId] = useState('')
  const [postMortem, setPostMortem] = useState('')
  const [saving, setSaving] = useState(false)

  const finish = async (status: 'lost' | 'won') => {
    setSaving(true)
    try {
      await onEnd(run.id, status, fightId ? Number(fightId) : null, postMortem.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 flex gap-2 flex-wrap items-start">
      <select
        value={fightId}
        onChange={(e) => setFightId(e.target.value)}
        className="rounded-lg px-2 py-1.5 text-xs flex-1 min-w-40"
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
      <input
        value={postMortem}
        onChange={(e) => setPostMortem(e.target.value)}
        placeholder="Post-mortem — what would you do differently?"
        className="rounded-lg px-2 py-1.5 text-xs flex-1 min-w-48"
        style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
      />
      <button
        disabled={saving}
        onClick={() => finish('lost')}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 shrink-0"
        style={{ background: 'rgba(220,90,90,0.18)', border: '1px solid rgba(220,90,90,0.4)', color: '#e88' }}
      >
        {saving ? 'Saving…' : 'End the run'}
      </button>
      <button
        onClick={() => finish('won')}
        className="rounded-lg px-3 py-1.5 text-xs shrink-0"
        style={{ background: 'rgba(210,160,60,0.15)', border: '1px solid rgba(210,160,60,0.35)', color: '#d2a03c' }}
      >
        I won
      </button>
      <button onClick={onClose} className="text-[10px] px-1 py-2 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Cancel
      </button>
    </div>
  )
}

function RunCard({ run, fights, onEnd, onReopen, onRename }: {
  run: RunSummary
  fights: Fight[]
  onEnd: Props['onEnd']
  onReopen: Props['onReopen']
  onRename: Props['onRename']
}) {
  const [ending, setEnding] = useState(false)
  const style = STATUS_STYLE[run.status] ?? STATUS_STYLE.active
  const killedBy = fights.find((f) => f.id === run.death_fight_id)

  return (
    <div className="rounded-xl p-2.5" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Team on the left, facts filling the width on the right — stacking them
          left most of the row empty. */}
      <div className="flex items-center gap-3">
        {run.final_team.length > 0 && (
          <div className="flex shrink-0 -space-x-2">
            {run.final_team.map((m, i) => (
              <span key={i} className="relative" title={`${m.nickname} Lv ${m.level}`}>
                <Sprite species={m.species} size={52} dead={run.status === 'lost'} />
                <span
                  className="absolute bottom-0 right-1 text-[9px] font-bold tabular-nums px-0.5 rounded"
                  style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)' }}
                >
                  {m.level}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <RunName run={run} onRename={onRename} className="font-bold text-sm text-white" />
            <span
              className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
              style={{ background: style.bg, color: style.color }}
            >
              {style.label}
            </span>
            <span className="text-[11px] tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {run.badges}b · {formatPlaytime(run.playtime_seconds)} · {run.deaths}{' '}
              {run.deaths === 1 ? 'death' : 'deaths'}
            </span>
            <span className="flex-1" />
            <span className="text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {run.trainer_name} · ID {run.trainer_id}
            </span>
            {run.status === 'active' ? (
              !ending && (
                <button
                  onClick={() => setEnding(true)}
                  className="text-[10px] px-2 py-1 rounded shrink-0"
                  style={{ background: 'rgba(220,90,90,0.1)', border: '1px solid rgba(220,90,90,0.25)', color: '#c77' }}
                >
                  Mark dead
                </button>
              )
            ) : (
              <button
                onClick={() => onReopen(run.id)}
                className="text-[10px] shrink-0"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                Reopen
              </button>
            )}
          </div>

          {killedBy && (
            <div className="text-xs truncate" style={{ color: '#c77' }}>
              Ended at {killedBy.name}
              {killedBy.location ? ` — ${killedBy.location}` : ''}
            </div>
          )}
          {run.post_mortem && (
            <div className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {run.post_mortem}
            </div>
          )}
        </div>
      </div>

      {ending && <EndRunPanel run={run} fights={fights} onEnd={onEnd} onClose={() => setEnding(false)} />}
    </div>
  )
}

export default function LostRuns({ runs, fights, onEnd, onReopen, onRename }: Props) {
  if (runs.length === 0) {
    return (
      <div className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.25)' }}>
        No runs yet — upload a save to open run #1.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {runs.map((run) => (
        <RunCard
          key={run.id}
          run={run}
          fights={fights}
          onEnd={onEnd}
          onReopen={onReopen}
          onRename={onRename}
        />
      ))}
    </div>
  )
}
