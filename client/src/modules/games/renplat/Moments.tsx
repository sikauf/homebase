import { useState } from 'react'
import type { Fight, Moment, TeamMember } from './api'
import { FightPicker } from './DeathModal'
import { Sprite } from './MonCard'
import { trainerSpriteUrl } from './data'

interface Props {
  moments: Moment[]
  fights: Fight[]
  /** The party as it stands, so the form can say what it would attach. */
  party: TeamMember[]
  onAdd: (fightId: number | null, note: string, includeTeam: boolean) => Promise<void>
  onUpdate: (
    id: number,
    payload: { fight_id?: number | null; note?: string; include_team?: boolean },
  ) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

/** The team you had at the time, drawn as the sprite row with levels. */
function TeamRow({ team, size = 44 }: { team: TeamMember[]; size?: number }) {
  return (
    <div className="flex -space-x-2 mt-1.5">
      {team.map((m, i) => (
        <span key={i} className="relative" title={`${m.nickname} · Lv ${m.level}`}>
          <Sprite species={m.species} size={size} />
          <span
            className="absolute bottom-0 right-0.5 text-[9px] font-bold tabular-nums px-0.5 rounded"
            style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)' }}
          >
            {m.level}
          </span>
        </span>
      ))}
    </div>
  )
}

/**
 * One form for both writing a moment and editing one. `include_team` is only
 * sent when the checkbox actually changes what the moment holds, so editing a
 * note never silently re-snapshots the team to a later party.
 */
function MomentForm({
  fights,
  party,
  moment,
  onSubmit,
  onCancel,
}: {
  fights: Fight[]
  party: TeamMember[]
  moment?: Moment
  onSubmit: (payload: { fight_id: number | null; note: string; include_team?: boolean }) => Promise<void>
  onCancel?: () => void
}) {
  const hadTeam = moment?.team != null
  const [fightId, setFightId] = useState(moment?.fight_id ? String(moment.fight_id) : '')
  const [note, setNote] = useState(moment?.note ?? '')
  const [withTeam, setWithTeam] = useState(moment ? hadTeam : party.length > 0)
  const [saving, setSaving] = useState(false)

  const empty = !note.trim() && !fightId

  async function save() {
    setSaving(true)
    try {
      await onSubmit({
        fight_id: fightId ? Number(fightId) : null,
        note: note.trim(),
        include_team: withTeam === hadTeam ? undefined : withTeam,
      })
      if (!moment) {
        setFightId('')
        setNote('')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <FightPicker fights={fights} fightId={fightId} onFightId={setFightId} />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="What happened? — Wake's Floatzel crit through Reflect and I won on 3 HP"
        className="w-full rounded-lg px-3 py-2 text-sm resize-none"
        style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
      />
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <input
            type="checkbox"
            checked={withTeam}
            onChange={(e) => setWithTeam(e.target.checked)}
            disabled={!hadTeam && party.length === 0}
          />
          {hadTeam
            ? 'Keep the team snapshot'
            : party.length > 0
              ? `Attach my team (${party.length})`
              : 'No team to attach — upload a save'}
        </label>
        <span className="flex-1" />
        {onCancel && (
          <button onClick={onCancel} className="text-[11px] px-2 py-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Cancel
          </button>
        )}
        <button
          onClick={save}
          disabled={empty || saving}
          title={empty ? 'Pick a fight or write something' : undefined}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-30"
          style={{ background: 'rgba(210,160,60,0.15)', border: '1px solid rgba(210,160,60,0.35)', color: '#d2a03c' }}
        >
          {saving ? 'Saving…' : moment ? 'Save' : 'Remember it'}
        </button>
      </div>
      {withTeam && !hadTeam && party.length > 0 && <TeamRow team={party} size={36} />}
    </div>
  )
}

function MomentCard({ moment, fights, party, onUpdate, onDelete }: {
  moment: Moment
  fights: Fight[]
  party: TeamMember[]
  onUpdate: Props['onUpdate']
  onDelete: Props['onDelete']
}) {
  const [editing, setEditing] = useState(false)
  const fight = fights.find((f) => f.id === moment.fight_id)
  const portrait = fight ? trainerSpriteUrl(fight.name) : null

  if (editing) {
    return (
      <MomentForm
        fights={fights}
        party={party}
        moment={moment}
        onSubmit={async (payload) => {
          await onUpdate(moment.id, payload)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div
      className="group rounded-xl p-3 flex gap-3"
      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {portrait && (
        <img
          src={portrait}
          alt=""
          width={48}
          height={48}
          className="shrink-0 self-start select-none"
          style={{ imageRendering: 'pixelated' }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: fight ? '#d2a03c' : 'rgba(255,255,255,0.4)' }}>
            {fight ? fight.name : 'No fight attached'}
          </span>
          {fight?.location && (
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {fight.location}
            </span>
          )}
          <span className="flex-1" />
          <span className="text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {new Date(moment.created_at + 'Z').toLocaleDateString()}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(moment.id)}
            title="Forget it"
            className="text-xs leading-none shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            ×
          </button>
        </div>
        {moment.note && (
          <div className="text-sm leading-snug mt-0.5 whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {moment.note}
          </div>
        )}
        {moment.team && moment.team.length > 0 && <TeamRow team={moment.team} />}
      </div>
    </div>
  )
}

/**
 * The run's scrapbook: the fights worth remembering, what happened, and the team
 * that was standing at the time. Kept per run, so a dead run keeps its stories.
 */
export default function Moments({ moments, fights, party, onAdd, onUpdate, onDelete }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <MomentForm
        fights={fights}
        party={party}
        onSubmit={({ fight_id, note, include_team }) => onAdd(fight_id, note, include_team ?? false)}
      />
      {moments.length === 0 ? (
        <div className="text-xs text-center py-6" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Nothing written down yet for this run.
        </div>
      ) : (
        moments.map((moment) => (
          <MomentCard
            key={moment.id}
            moment={moment}
            fights={fights}
            party={party}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  )
}
