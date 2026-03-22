import { useState, type FormEvent } from 'react'
import type { CreateRoundPayload } from '../../types/golf'

interface AddRoundModalProps {
  onClose: () => void
  onSubmit: (payload: CreateRoundPayload) => Promise<void>
}

export default function AddRoundModal({ onClose, onSubmit }: AddRoundModalProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    course: '',
    tees: '',
    score: '',
    par: '72',
    fairways: '',
    gir: '',
    putts: '',
    notes: '',
    played_at: new Date().toISOString().split('T')[0],
  })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.course.trim()) return
    setSaving(true)
    try {
      const payload: CreateRoundPayload = {
        course: form.course.trim(),
        tees: form.tees || undefined,
        score: form.score ? Number(form.score) : undefined,
        par: form.par ? Number(form.par) : 72,
        fairways: form.fairways ? Number(form.fairways) : undefined,
        gir: form.gir ? Number(form.gir) : undefined,
        putts: form.putts ? Number(form.putts) : undefined,
        notes: form.notes || undefined,
        played_at: form.played_at ? `${form.played_at} 12:00:00` : undefined,
      }
      await onSubmit(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Log a Round</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.course}
              onChange={set('course')}
              placeholder="e.g. Pebble Beach Golf Links"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tees</label>
              <input
                type="text"
                value={form.tees}
                onChange={set('tees')}
                placeholder="e.g. Blue"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.played_at}
                onChange={set('played_at')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
              <input
                type="number"
                value={form.score}
                onChange={set('score')}
                placeholder="88"
                min={50}
                max={150}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Par</label>
              <input
                type="number"
                value={form.par}
                onChange={set('par')}
                min={60}
                max={80}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FIR</label>
              <input
                type="number"
                value={form.fairways}
                onChange={set('fairways')}
                placeholder="—"
                min={0}
                max={18}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GIR</label>
              <input
                type="number"
                value={form.gir}
                onChange={set('gir')}
                placeholder="—"
                min={0}
                max={18}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Putts</label>
              <input
                type="number"
                value={form.putts}
                onChange={set('putts')}
                placeholder="—"
                min={18}
                max={72}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="How'd it go?"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.course.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Log Round'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
