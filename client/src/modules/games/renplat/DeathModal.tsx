import { useEffect, useRef, useState } from 'react'
import type { Fight, Mon } from './api'
import { Sprite, TypeChip } from './MonCard'

interface Props {
  /** The Grave-box mons that don't have a death recorded yet. */
  pending: Mon[]
  fights: Fight[]
  onConfirm: (mon: Mon, fightId: number | null, note: string) => Promise<void>
  onClose: () => void
}

/**
 * Walks the queue of unconfirmed corpses one at a time. Nothing is ever marked
 * dead without going through here — the save only tells us a mon is in the Grave
 * box, not what killed it.
 */
export default function DeathModal({ pending, fights, onConfirm, onClose }: Props) {
  const [skipped, setSkipped] = useState<number[]>([])
  const [fightId, setFightId] = useState<string>('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Confirming a death drops that mon out of `pending`, so the list shifts under
  // us — walk it by pid instead of by index, or the second corpse gets skipped.
  const queue = pending.filter((m) => !skipped.includes(m.pid))
  const mon = queue[0]
  const total = useRef(pending.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setFightId('')
    setNote('')
  }, [mon?.pid])

  // Nothing left to ask about — everything is either buried or skipped.
  useEffect(() => {
    if (!mon) onClose()
  }, [mon, onClose])

  if (!mon) return null

  async function submit() {
    setSaving(true)
    try {
      await onConfirm(mon, fightId ? Number(fightId) : null, note.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: '#e06060' }}>
            Confirm death
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {total.current > 1
              ? `${total.current - queue.length + 1} of ${total.current} in the Grave box`
              : 'Found in the Grave box'}
          </div>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <MonHeader mon={mon} />

      <DeathFields fights={fights} fightId={fightId} note={note} onFightId={setFightId} onNote={setNote} />

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'rgba(220,90,90,0.18)', border: '1px solid rgba(220,90,90,0.4)', color: '#e88' }}
        >
          {saving ? 'Saving…' : 'Bury it'}
        </button>
        {queue.length > 1 && (
          <button
            onClick={() => setSkipped([...skipped, mon.pid])}
            className="rounded-lg px-4 py-2 text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
          >
            Skip
          </button>
        )}
      </div>
    </ModalShell>
  )
}

export function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5"
        style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className="text-lg leading-none" style={{ color: 'rgba(255,255,255,0.3)' }}>
      ×
    </button>
  )
}

export function MonHeader({ mon }: { mon: Mon }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <Sprite species={mon.species} size={64} dead />
      <div>
        <div className="text-white font-semibold">{mon.nickname}</div>
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {mon.name} · Lv {mon.level} · caught {mon.metLocation}
        </div>
        <div className="flex gap-1 mt-1.5">
          {mon.types.map((t) => (
            <TypeChip key={t} type={t} small />
          ))}
        </div>
      </div>
    </div>
  )
}

const fightLabel = (f: Fight) => `${f.name}${f.location ? ` — ${f.location}` : ''}`

/**
 * The fight list runs to forty-odd entries, so a native dropdown means scrolling
 * a wall of names to find the one that just killed you. Typing "may" or "215"
 * gets there in two keystrokes instead. Empty stays "not a boss fight" — most
 * deaths are wild ones.
 */
export function FightPicker({
  fights,
  fightId,
  onFightId,
}: {
  fights: Fight[]
  fightId: string
  onFightId: (value: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const selected = fights.find((f) => String(f.id) === fightId)
  const q = query.trim().toLowerCase()
  const matches = q ? fights.filter((f) => fightLabel(f).toLowerCase().includes(q)) : fights
  // Clearing back to a wild death is only offered when nothing is typed —
  // "Not a boss fight" is noise under a search for Maylene.
  const options: (Fight | null)[] = q ? matches : [null, ...matches]

  function choose(option: Fight | null) {
    onFightId(option ? String(option.id) : '')
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return setOpen(true)
      const next = active + (e.key === 'ArrowDown' ? 1 : -1)
      setActive(Math.max(0, Math.min(options.length - 1, next)))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && options[active] !== undefined) choose(options[active])
    } else if (e.key === 'Escape' && open) {
      // The modal closes on Escape too — dismiss just the list first.
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="relative mb-3">
      <input
        value={open ? query : selected ? fightLabel(selected) : ''}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => {
          setQuery('')
          setActive(0)
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder="Search fights — leave empty for a wild death"
        aria-label="What killed it?"
        className="w-full rounded-lg px-3 py-2 pr-7 text-sm"
        style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
      />
      {selected && !open && (
        <button
          type="button"
          onClick={() => choose(null)}
          aria-label="Clear fight"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-sm leading-none"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          ×
        </button>
      )}

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-10 max-h-48 overflow-y-auto rounded-lg py-1"
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              No fight matches “{query.trim()}”.
            </div>
          )}
          {options.map((option, i) => (
            <button
              key={option ? option.id : 'none'}
              type="button"
              // mousedown, not click: blur would close the list before a click lands.
              onMouseDown={(e) => {
                e.preventDefault()
                choose(option)
              }}
              onMouseEnter={() => setActive(i)}
              ref={(el) => {
                // jsdom has no scrollIntoView, so guard rather than crash in tests.
                if (el && i === active) el.scrollIntoView?.({ block: 'nearest' })
              }}
              className="block w-full text-left px-3 py-1.5 text-sm"
              style={{
                background: i === active ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: option ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)',
              }}
            >
              {option ? fightLabel(option) : 'Not a boss fight'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function DeathFields({
  fights,
  fightId,
  note,
  onFightId,
  onNote,
}: {
  fights: Fight[]
  fightId: string
  note: string
  onFightId: (value: string) => void
  onNote: (value: string) => void
}) {
  return (
    <>
      <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
        What killed it?
      </label>
      <FightPicker fights={fights} fightId={fightId} onFightId={onFightId} />

      <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Note
      </label>
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        rows={2}
        placeholder="Crit through Reflect, no switch-in for Ice Fang…"
        className="w-full rounded-lg px-3 py-2 text-sm mb-4 resize-none"
        style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
      />
    </>
  )
}
