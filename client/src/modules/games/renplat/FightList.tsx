import { useState } from 'react'
import type { Fight } from './api'
import { CALCULATOR_URL } from './data'

interface Props {
  fights: Fight[]
  levelCaps: number[]
  currentBadges: number
  onSave: (id: number, payload: { danger?: number | null; threat_note?: string }) => Promise<void>
  onAdd: (name: string, location: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

function DangerDots({ danger, onPick }: { danger: number | null; onPick?: (n: number) => void }) {
  return (
    <span className="inline-flex gap-0.5 shrink-0">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={onPick ? () => onPick(n === danger ? 0 : n) : undefined}
          disabled={!onPick}
          className="w-2.5 h-2.5 rounded-full transition-colors"
          style={{
            background: danger && n <= danger ? '#d05555' : 'rgba(255,255,255,0.12)',
            cursor: onPick ? 'pointer' : 'default',
          }}
          title={onPick ? `Danger ${n}` : undefined}
        />
      ))}
    </span>
  )
}

function FightRow({ fight, cap, current, onSave, onDelete }: {
  fight: Fight
  cap: number | undefined
  current: boolean
  onSave: Props['onSave']
  onDelete: Props['onDelete']
}) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(fight.threat_note ?? '')

  async function commit() {
    setEditing(false)
    if (note !== (fight.threat_note ?? '')) await onSave(fight.id, { threat_note: note })
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: current ? 'rgba(210,160,60,0.07)' : '#1a1a1a',
        border: `1px solid ${current ? 'rgba(210,160,60,0.3)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm text-white">{fight.name}</span>
        {current && (
          <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(210,160,60,0.2)', color: '#d2a03c' }}>
            next up
          </span>
        )}
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {fight.location}
        </span>
        <span className="flex-1" />
        {fight.kills > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(220,90,90,0.15)', color: '#e06060' }}>
            {fight.kills} {fight.kills === 1 ? 'kill' : 'kills'}
          </span>
        )}
        <DangerDots danger={fight.danger} onPick={(n) => onSave(fight.id, { danger: n === 0 ? null : n })} />
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        {cap !== undefined && (
          <span className="text-[10px] tabular-nums" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {fight.badge_index} badges · cap {cap}
          </span>
        )}
        <span className="flex-1" />
        <a
          href={CALCULATOR_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] hover:underline"
          style={{ color: 'rgba(120,170,230,0.7)' }}
        >
          calc ↗
        </a>
        <button onClick={() => onDelete(fight.id)} className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          remove
        </button>
      </div>

      {editing ? (
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={commit}
          rows={2}
          placeholder="What makes this fight dangerous?"
          className="w-full mt-2 rounded-lg px-2 py-1.5 text-xs resize-none"
          style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="mt-2 text-xs cursor-text leading-relaxed"
          style={{ color: fight.threat_note ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)' }}
        >
          {fight.threat_note || 'Add a threat note…'}
        </div>
      )}
    </div>
  )
}

export default function FightList({ fights, levelCaps, currentBadges, onSave, onAdd, onDelete }: Props) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')

  // The first fight at or past your badge count is what you're walking into.
  const nextFight = fights.find((f) => (f.badge_index ?? 99) >= currentBadges)

  return (
    <div className="flex flex-col gap-2">
      {fights.map((f) => (
        <FightRow
          key={f.id}
          fight={f}
          cap={f.badge_index == null ? undefined : levelCaps[f.badge_index]}
          current={f.id === nextFight?.id}
          onSave={onSave}
          onDelete={onDelete}
        />
      ))}

      <div className="flex gap-2 mt-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a fight…"
          className="flex-1 rounded-lg px-3 py-2 text-xs"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.92)' }}
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Where?"
          className="w-32 rounded-lg px-3 py-2 text-xs"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.92)' }}
        />
        <button
          disabled={!name.trim()}
          onClick={async () => {
            await onAdd(name.trim(), location.trim())
            setName('')
            setLocation('')
          }}
          className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
