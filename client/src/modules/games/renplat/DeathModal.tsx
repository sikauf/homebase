import { useEffect, useState } from 'react'
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
  const [index, setIndex] = useState(0)
  const [fightId, setFightId] = useState<string>('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const mon = pending[index]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setFightId('')
    setNote('')
  }, [index])

  if (!mon) return null

  async function submit() {
    setSaving(true)
    try {
      await onConfirm(mon, fightId ? Number(fightId) : null, note.trim())
      if (index + 1 < pending.length) setIndex(index + 1)
      else onClose()
    } finally {
      setSaving(false)
    }
  }

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
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: '#e06060' }}>
              Confirm death
            </div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {pending.length > 1 ? `${index + 1} of ${pending.length} in the Grave box` : 'Found in the Grave box'}
            </div>
          </div>
          <button onClick={onClose} className="text-lg leading-none" style={{ color: 'rgba(255,255,255,0.3)' }}>
            ×
          </button>
        </div>

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

        <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          What killed it?
        </label>
        <select
          value={fightId}
          onChange={(e) => setFightId(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm mb-3"
          style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
        >
          <option value="">Not a boss fight</option>
          {fights.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
              {f.location ? ` — ${f.location}` : ''}
            </option>
          ))}
        </select>

        <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Note
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Crit through Reflect, no switch-in for Ice Fang…"
          className="w-full rounded-lg px-3 py-2 text-sm mb-4 resize-none"
          style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
        />

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: 'rgba(220,90,90,0.18)', border: '1px solid rgba(220,90,90,0.4)', color: '#e88' }}
          >
            {saving ? 'Saving…' : 'Bury it'}
          </button>
          {pending.length > 1 && index + 1 < pending.length && (
            <button
              onClick={() => setIndex(index + 1)}
              className="rounded-lg px-4 py-2 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
