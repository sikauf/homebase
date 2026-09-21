import { useCallback, useEffect, useRef, useState } from 'react'
import GamePageShell from '../_shared/GamePageShell'
import * as api from './api'
import type { Fight, Mon, RunSummary, State } from './api'
import MonCard, { Sprite } from './MonCard'
import DeathModal from './DeathModal'
import FightList from './FightList'
import LostRuns from './LostRuns'
import Encounters from './Encounters'
import { CALCULATOR_URL, DOCS_URL, formatMoney, formatPlaytime } from './data'

type Tab = 'fights' | 'runs' | 'encounters'

export default function RenegadePlatinum() {
  const [state, setState] = useState<State | null>(null)
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [tab, setTab] = useState<Tab>('fights')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showDeaths, setShowDeaths] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const [next, runList] = await Promise.all([api.fetchState(), api.fetchRuns()])
      setState(next)
      setRuns(runList)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const result = await api.uploadSave(file)
      await load()
      // Straight into the confirm queue — a new corpse is the thing you care
      // about most right after a sync.
      if (result.pending.length > 0) setShowDeaths(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (!state) {
    return (
      <GamePageShell title="Renegade Platinum">
        <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {error ?? 'Loading…'}
        </div>
      </GamePageShell>
    )
  }

  const { save, run, party, grave, pending, fights, levelCaps, encounters } = state
  const badges = save?.badges ?? 0
  const levelCap = save?.levelCap ?? levelCaps[0]
  const highestLevel = party.reduce((max, m) => Math.max(max, m.level), 0)
  const overCapCount = party.filter((m) => m.level > levelCap).length

  return (
    <GamePageShell title="Renegade Platinum">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 sm:px-7 flex flex-col gap-5">
        {/* Header: which run, and the two links that live outside the app. */}
        <div className="flex items-center gap-2 flex-wrap">
          {run && (
            <>
              <span className="text-sm font-bold text-white">Run #{run.number}</span>
              <span
                className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                style={
                  run.status === 'active'
                    ? { background: 'rgba(95,184,95,0.15)', color: '#5fb85f' }
                    : { background: 'rgba(220,90,90,0.15)', color: '#e06060' }
                }
              >
                {run.status === 'active' ? 'Active' : run.status === 'won' ? 'Cleared' : 'Dead'}
              </span>
            </>
          )}
          <span className="flex-1" />
          <LinkButton href={CALCULATOR_URL}>Damage calc ↗</LinkButton>
          <LinkButton href={DOCS_URL}>Doc ↗</LinkButton>
          <input
            ref={fileInput}
            type="file"
            accept=".sav,.dsv,application/octet-stream"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
            style={{ background: 'rgba(120,170,230,0.15)', border: '1px solid rgba(120,170,230,0.35)', color: '#8ab4e8' }}
          >
            {uploading ? 'Reading save…' : 'Upload save'}
          </button>
        </div>

        {error && (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: 'rgba(220,90,90,0.1)', border: '1px solid rgba(220,90,90,0.3)', color: '#e88' }}
          >
            {error}
          </div>
        )}

        {!save ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: '#1a1a1a', border: '1px dashed rgba(255,255,255,0.12)' }}
          >
            <div className="text-sm text-white font-semibold mb-1">No save uploaded yet</div>
            <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Drop in your Renegade Platinum <code>.sav</code> to open run #1. Keep dead Pokémon in a PC box
              named <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Grave</strong> and each sync will ask
              you what killed them.
            </div>
          </div>
        ) : (
          <>
            {/* Stat row */}
            <div className="flex items-center gap-4 sm:gap-7 flex-wrap">
              <div>
                <StatLabel>Badges</StatLabel>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: 8 }, (_, i) => (
                    <span
                      key={i}
                      className="w-3 h-3 rounded-full"
                      style={{
                        background: i < badges ? '#d2a03c' : 'rgba(255,255,255,0.08)',
                        boxShadow: i < badges ? '0 0 8px rgba(210,160,60,0.5)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
              <Stat label="Level cap" value={String(levelCap)} accent={overCapCount > 0 ? '#e06060' : undefined}
                sub={highestLevel > 0 ? `team at ${highestLevel}` : undefined} />
              <Stat label="Played" value={formatPlaytime(save.playtime.total)} />
              <Stat label="Money" value={formatMoney(save.money)} />
              <Stat
                label="Deaths"
                value={String(run?.deaths ?? 0)}
                accent={(run?.deaths ?? 0) > 0 ? '#e06060' : undefined}
              />
              <Stat label="Caught" value={String(encounters?.byLocation.reduce((n, e) => n + e.mons.length, 0) ?? 0)} />
              <span className="flex-1" />
              {state.snapshot && (
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Synced {new Date(state.snapshot.uploaded_at + 'Z').toLocaleString()}
                </span>
              )}
            </div>

            {pending.length > 0 && (
              <button
                onClick={() => setShowDeaths(true)}
                className="rounded-xl px-4 py-3 text-left"
                style={{ background: 'rgba(220,90,90,0.1)', border: '1px solid rgba(220,90,90,0.35)' }}
              >
                <div className="flex items-center gap-2">
                  {pending.map((m) => (
                    <Sprite key={m.pid} species={m.species} size={32} dead />
                  ))}
                  <div>
                    <div className="text-xs font-semibold" style={{ color: '#e88' }}>
                      {pending.length === 1
                        ? `${pending[0].nickname} is in the Grave box`
                        : `${pending.length} Pokémon are in the Grave box`}
                    </div>
                    <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Tap to record what killed{' '}
                      {pending.length === 1 ? 'it' : 'them'}
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Party */}
            <div>
              <StatLabel>Party</StatLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                {party.map((mon) => (
                  <MonCard key={mon.pid} mon={mon} levelCap={levelCap} />
                ))}
                {party.length === 0 && (
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Party is empty.
                  </div>
                )}
              </div>
            </div>

            {/* Graveyard */}
            {grave.length > 0 && (
              <div>
                <StatLabel>Graveyard — {grave.length}</StatLabel>
                <div className="flex flex-wrap gap-2 mt-2">
                  {grave.map((mon) => (
                    <GraveStone key={mon.pid} mon={mon} fights={fights} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Sub-tabs */}
        <div className="flex gap-1 border-b pb-px" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {(
            [
              ['fights', `Trouble fights${fights.some((f) => f.kills > 0) ? '' : ''}`],
              ['runs', `Runs (${runs.length})`],
              ['encounters', 'Encounters'],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className="text-[11px] font-semibold px-3 py-2 rounded-t-lg"
              style={{
                color: tab === value ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.3)',
                borderBottom: `2px solid ${tab === value ? '#d2a03c' : 'transparent'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'fights' && (
          <FightList
            fights={fights}
            levelCaps={levelCaps}
            currentBadges={badges}
            onSave={(id, payload) => act(() => api.updateFight(id, payload))}
            onAdd={(name, location) => act(() => api.createFight({ name, location }))}
            onDelete={(id) => act(() => api.deleteFight(id))}
          />
        )}

        {tab === 'runs' && (
          <LostRuns
            runs={runs}
            fights={fights}
            onEnd={(id, status, fightId, postMortem) =>
              act(() => api.endRun(id, { status, fight_id: fightId, post_mortem: postMortem }))
            }
            onReopen={(id) => act(() => api.reopenRun(id))}
          />
        )}

        {tab === 'encounters' &&
          (encounters && run ? (
            <Encounters
              encounters={encounters}
              runId={run.id}
              graveLocations={grave.map((m) => m.metLocation)}
              onLog={(location, outcome, note) =>
                act(() => api.logEncounterLoss({ run_id: run.id, location, outcome, note }))
              }
              onDelete={(id) => act(() => api.deleteEncounterLoss(id))}
            />
          ) : (
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Upload a save to start tracking encounters.
            </div>
          ))}
      </div>

      {showDeaths && pending.length > 0 && run && (
        <DeathModal
          pending={pending}
          fights={fights}
          onConfirm={async (mon, fightId, note) => {
            await api.confirmDeath({
              run_id: run.id,
              pid: mon.pid,
              species: mon.species,
              nickname: mon.nickname,
              level: mon.level,
              met_location: mon.metLocation,
              fight_id: fightId,
              note,
            })
            await load()
          }}
          onClose={() => setShowDeaths(false)}
        />
      )}
    </GamePageShell>
  )
}

const StatLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
    {children}
  </div>
)

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div>
      <StatLabel>{label}</StatLabel>
      <div className="text-base font-bold tabular-nums mt-0.5" style={{ color: accent ?? 'rgba(255,255,255,0.92)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function GraveStone({ mon, fights }: { mon: Mon & { death: api.Death | null }; fights: Fight[] }) {
  const killer = fights.find((f) => f.id === mon.death?.fight_id)
  return (
    <div
      className="rounded-xl p-2 flex items-center gap-2 max-w-64"
      style={{ background: '#151515', border: '1px solid rgba(255,255,255,0.05)' }}
      title={mon.death?.note ?? undefined}
    >
      <Sprite species={mon.species} size={40} dead />
      <div className="min-w-0">
        <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {mon.nickname}
        </div>
        <div className="text-[10px] tabular-nums" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Lv {mon.level} · {mon.metLocation}
        </div>
        {killer && (
          <div className="text-[10px] truncate" style={{ color: 'rgba(200,120,120,0.7)' }}>
            {killer.name}
          </div>
        )}
      </div>
    </div>
  )
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
    >
      {children}
    </a>
  )
}
