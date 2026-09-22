import { useEffect, useState } from 'react'
import type { Death, Fight, Mon } from './api'
import { CloseButton, DeathFields, ModalShell, MonHeader } from './DeathModal'

interface Props {
  mon: Mon & { death: Death | null }
  fights: Fight[]
  onSave: (death: Death, fightId: number | null, note: string) => Promise<void>
  onClose: () => void
}

/** The epitaph, reopened: what you wrote when you buried it, still editable. */
export default function GraveModal({ mon, fights, onSave, onClose }: Props) {
  const death = mon.death
  const [fightId, setFightId] = useState(death?.fight_id ? String(death.fight_id) : '')
  const [note, setNote] = useState(death?.note ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const dirty =
    death != null &&
    (fightId !== (death.fight_id ? String(death.fight_id) : '') || note !== (death.note ?? ''))

  async function submit() {
    if (!death) return
    setSaving(true)
    try {
      await onSave(death, fightId ? Number(fightId) : null, note.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Epitaph
          </div>
          {death && (
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Buried {new Date(death.recorded_at + 'Z').toLocaleString()}
            </div>
          )}
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <MonHeader mon={mon} />

      {death ? (
        <>
          <DeathFields fights={fights} fightId={fightId} note={note} onFightId={setFightId} onNote={setNote} />
          <button
            onClick={submit}
            disabled={saving || !dirty}
            className="w-full rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
          >
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </>
      ) : (
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          No death recorded for this one yet — sync the save and the confirm queue will ask.
        </div>
      )}
    </ModalShell>
  )
}
