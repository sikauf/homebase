import { useEffect, useState } from 'react'
import * as api from './api'
import type { Species, State } from './api'
import { Sprite } from './MonCard'
import { byName, OUTCOME_LABELS, SINNOH_LOCATIONS } from './data'

interface Props {
  encounters: NonNullable<State['encounters']>
  runId: number
  graveLocations: string[]
  onLog: (location: string, outcome: string, note: string, species: number | null) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

/**
 * Type-ahead over all 493 species. Resolves to a dex number so the logged loss
 * can show the sprite; leaving it blank is fine — the row falls back to a "?".
 */
function SpeciesPicker({ species, value, onChange }: {
  species: Species[]
  value: string
  onChange: (text: string) => void
}) {
  const matched = species.find((s) => s.name.toLowerCase() === value.trim().toLowerCase())
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-40">
      <span className="shrink-0 w-10 h-10 flex items-center justify-center">
        {matched ? (
          <Sprite species={matched.id} size={40} />
        ) : (
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.15)' }}>?</span>
        )}
      </span>
      <input
        list="renplat-species"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Which Pokémon?"
        className="flex-1 min-w-0 rounded-lg px-3 py-2 text-xs"
        style={{
          background: '#1a1a1a',
          border: `1px solid ${
            value.trim() && !matched ? 'rgba(220,90,90,0.4)' : 'rgba(255,255,255,0.08)'
          }`,
          color: 'rgba(255,255,255,0.92)',
        }}
      />
      <datalist id="renplat-species">
        {species.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>
    </div>
  )
}

/**
 * The won half of encounter tracking is free — every living mon records where it
 * was met. Only the losses (fled, fainted, dupe-skipped) need typing in.
 *
 * Laid out as a dense grid rather than full-width rows: a route usually yields
 * exactly one Pokémon, so a row per location is almost entirely empty space.
 */
export default function Encounters({ encounters, graveLocations, onLog, onDelete }: Props) {
  const [location, setLocation] = useState('')
  // Fainted is the common case — most lost encounters die to your own attack.
  const [outcome, setOutcome] = useState('fainted')
  const [note, setNote] = useState('')
  const [speciesText, setSpeciesText] = useState('')
  const [species, setSpecies] = useState<Species[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.fetchSpecies().then(setSpecies).catch(() => setSpecies([]))
  }, [])

  const matchedSpecies = species.find((s) => s.name.toLowerCase() === speciesText.trim().toLowerCase())
  // A name typed but not recognised is a typo worth blocking on, rather than
  // silently logging the loss with no Pokémon attached.
  const speciesInvalid = speciesText.trim().length > 0 && !matchedSpecies

  const used = new Set([
    ...encounters.byLocation.map((e) => e.location),
    ...graveLocations,
    ...encounters.losses.map((l) => l.location),
  ])
  const unused = SINNOH_LOCATIONS.filter((l) => !used.has(l)).sort(byName)
  const losses = [...encounters.losses].sort((a, b) => byName(a.location, b.location))
  // "Starter" isn't a route, so it leads rather than sorting under S.
  const caught = [...encounters.byLocation].sort((a, b) =>
    a.location === 'Starter' ? -1 : b.location === 'Starter' ? 1 : byName(a.location, b.location),
  )

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>
          Caught — {encounters.byLocation.reduce((n, e) => n + e.mons.length, 0)} across{' '}
          {encounters.byLocation.length} {encounters.byLocation.length === 1 ? 'location' : 'locations'}
        </SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {caught.map((entry) => {
            // A location only greys out once nothing it gave you is left alive.
            const allDead = entry.mons.every((m) => m.dead)
            const buried = entry.mons.filter((m) => m.dead).length
            return (
              <div
                key={entry.location}
                className="rounded-lg px-2 py-1.5 flex items-center gap-2 min-w-0"
                style={{
                  background: allDead ? '#151515' : '#1a1a1a',
                  border: `1px solid rgba(255,255,255,${allDead ? '0.04' : '0.06'})`,
                }}
              >
                <div className="flex shrink-0 -space-x-3">
                  {entry.mons.slice(0, 3).map((m) => (
                    <Sprite key={m.pid} species={m.species} size={56} dead={m.dead} />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-xs truncate"
                    style={{ color: `rgba(255,255,255,${allDead ? '0.4' : '0.75'})` }}
                  >
                    {entry.location}
                  </div>
                  <div
                    className="text-[10px] truncate"
                    style={{ color: `rgba(255,255,255,${allDead ? '0.22' : '0.3'})` }}
                  >
                    {entry.mons.length > 1
                      ? `${entry.mons.length} caught${buried ? ` · ${buried} dead` : ''}`
                      : `${entry.mons[0].nickname} · Lv ${entry.mons[0].level}${
                          entry.mons[0].dead ? ' · dead' : ''
                        }`}
                  </div>
                </div>
              </div>
            )
          })}
          {encounters.byLocation.length === 0 && <Empty>Nothing caught yet.</Empty>}
        </div>
      </div>

      <div>
        <SectionLabel>Lost — {encounters.losses.length}</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {losses.map((loss) => (
            <div
              key={loss.id}
              className="group rounded-lg px-2 py-1.5 flex items-center gap-2 min-w-0"
              style={{ background: '#151515', border: '1px solid rgba(255,255,255,0.05)' }}
              title={loss.note ?? undefined}
            >
              {loss.species ? (
                <Sprite species={loss.species} size={56} dead />
              ) : (
                <span
                  className="w-[56px] h-[56px] shrink-0 rounded flex items-center justify-center text-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.2)' }}
                >
                  ?
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {loss.location}
                </div>
                <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {[
                    species.find((s) => s.id === loss.species)?.name,
                    OUTCOME_LABELS[loss.outcome] ?? loss.outcome,
                    loss.note,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <button
                onClick={() => onDelete(loss.id)}
                className="shrink-0 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                title="Remove"
              >
                ×
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
          <SpeciesPicker species={species} value={speciesText} onChange={setSpeciesText} />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            className="flex-1 min-w-32 rounded-lg px-3 py-2 text-xs"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.92)' }}
          />
          <button
            disabled={!location.trim() || speciesInvalid || saving}
            title={speciesInvalid ? `No Pokémon named "${speciesText.trim()}"` : undefined}
            onClick={async () => {
              setSaving(true)
              try {
                await onLog(location.trim(), outcome, note.trim(), matchedSpecies?.id ?? null)
                setLocation('')
                setNote('')
                setSpeciesText('')
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
  <div className="text-xs py-3 col-span-full" style={{ color: 'rgba(255,255,255,0.2)' }}>
    {children}
  </div>
)
