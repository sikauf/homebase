import { useState } from 'react'
import type { State } from './api'
import { Sprite } from './MonCard'
import { OUTCOME_LABELS, SINNOH_LOCATIONS } from './data'

interface Props {
  encounters: NonNullable<State['encounters']>
  runId: number
  graveLocations: string[]
  onLog: (location: string, outcome: string, note: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

/**
 * The won half of encounter tracking is free — every living mon records where it
 * was met. Only the losses (fled, fainted, dupe-skipped) need typing in.
 */
export default function Encounters({ encounters, graveLocations, onLog, onDelete }: Props) {
  const [location, setLocation] = useState('')
  const [outcome, setOutcome] = useState('fled')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const used = new Set([...encounters.byLocation.map((e) => e.location), ...graveLocations, ...encounters.losses.map((l) => l.location)])
  const unused = SINNOH_LOCATIONS.filter((l) => !used.has(l))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel>
          Caught — {encounters.byLocation.length} {encounters.byLocation.length === 1 ? 'location' : 'locations'}
        </SectionLabel>
        <div className="flex flex-col gap-1">
          {encounters.byLocation.map((entry) => (
            <div
              key={entry.location}
              className="rounded-lg px-3 py-2 flex items-center gap-2"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-xs w-40 shrink-0 truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {entry.location}
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {entry.mons.map((m) => (
                  <span key={m.pid} className="flex items-center" title={`${m.nickname} Lv ${m.level}`}>
                    <Sprite species={m.species} size={28} />
                  </span>
                ))}
              </div>
            </div>
          ))}
          {encounters.byLocation.length === 0 && <Empty>Nothing caught yet.</Empty>}
        </div>
      </div>

      <div>
        <SectionLabel>Lost — {encounters.losses.length}</SectionLabel>
        <div className="flex flex-col gap-1">
          {encounters.losses.map((loss) => (
            <div
              key={loss.id}
              className="rounded-lg px-3 py-2 flex items-center gap-2"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-xs w-40 shrink-0 truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {loss.location}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                {OUTCOME_LABELS[loss.outcome] ?? loss.outcome}
              </span>
              {loss.note && (
                <span className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {loss.note}
                </span>
              )}
              <span className="flex-1" />
              <button onClick={() => onDelete(loss.id)} className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                remove
              </button>
            </div>
          ))}
          {encounters.losses.length === 0 && <Empty>No lost encounters logged.</Empty>}
        </div>

        <div className="flex gap-2 mt-2 flex-wrap">
          <input
            list="renplat-locations"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where?"
            className="flex-1 min-w-32 rounded-lg px-3 py-2 text-xs"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.92)' }}
          />
          <datalist id="renplat-locations">
            {SINNOH_LOCATIONS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="rounded-lg px-2 py-2 text-xs"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.92)' }}
          >
            {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            className="flex-1 min-w-32 rounded-lg px-3 py-2 text-xs"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.92)' }}
          />
          <button
            disabled={!location.trim() || saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onLog(location.trim(), outcome, note.trim())
                setLocation('')
                setNote('')
              } finally {
                setSaving(false)
              }
            }}
            className="rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
          >
            Log
          </button>
        </div>
      </div>

      <div>
        <SectionLabel>Untouched — {unused.length}</SectionLabel>
        <div className="flex flex-wrap gap-1">
          {unused.map((l) => (
            <span
              key={l}
              className="text-[10px] px-2 py-1 rounded"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)' }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
    {children}
  </div>
)

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs py-3 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
    {children}
  </div>
)
