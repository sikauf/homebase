import { useEffect, useState } from 'react'
import CallieFrame from '../shared/CallieFrame'
import { callieTheme, addedByChip } from '../shared/theme'
import { CallieMood, createMood, deleteMood, fetchMoods } from '../shared/api'
import { MOOD_PRESETS, moodMeta, dayLabel, timeLabel } from './data'

export default function MoodPage() {
  const [moods, setMoods] = useState<CallieMood[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchMoods()
      .then(setMoods)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function logMood() {
    if (selected.length === 0 || saving) return
    setSaving(true)
    try {
      const created = await createMood(selected.join(','), note.trim() || undefined)
      setMoods((prev) => [created, ...prev])
      setSelected([])
      setNote('')
    } catch {
      // leave the form as-is so nothing typed is lost
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    try {
      await deleteMood(id)
      setMoods((prev) => prev.filter((m) => m.id !== id))
    } catch {
      // keep the entry if the delete failed
    }
  }

  const groups: { label: string; entries: CallieMood[] }[] = []
  for (const mood of moods) {
    const label = dayLabel(mood.created_at)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.entries.push(mood)
    else groups.push({ label, entries: [mood] })
  }

  return (
    <CallieFrame title="Mood Tracker 🎀">
      <div className="rounded-2xl p-4 sm:p-6 mb-6" style={callieTheme.card}>
        <div className="flex flex-wrap gap-2">
          {MOOD_PRESETS.map((preset) => {
            const active = selected.includes(preset.value)
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => toggle(preset.value)}
                className="rounded-full px-3.5 py-2 text-sm font-medium transition-transform hover:scale-105"
                style={
                  active
                    ? { background: callieTheme.pink, color: '#fff', border: '1px solid transparent' }
                    : { background: '#fdf2f8', color: callieTheme.pinkText, border: '1px solid #fbcfe3' }
                }
              >
                {preset.emoji} {preset.label}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') logMood() }}
            placeholder="Add a little note… (optional)"
            maxLength={200}
            className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
            style={{ border: '1px solid #fbcfe3', background: '#fffafc', color: '#831843' }}
          />
          <button
            type="button"
            onClick={logMood}
            disabled={selected.length === 0 || saving}
            className="rounded-full px-6 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-transform enabled:hover:scale-105"
            style={{ background: callieTheme.green }}
          >
            {saving ? '…' : 'Log it 💚'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: callieTheme.muted }}>Loading…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={callieTheme.card}>
          <p className="text-3xl mb-2">🎀</p>
          <p className="text-sm" style={{ color: callieTheme.muted }}>
            No moods yet — pick one above to start the diary!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: callieTheme.muted }}>
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.entries.map((entry) => {
                  const metas = entry.mood.split(',').map(moodMeta)
                  const chip = addedByChip(entry.added_by)
                  return (
                    <div
                      key={entry.id}
                      className="group rounded-2xl px-4 py-3 flex items-center gap-3"
                      style={callieTheme.card}
                    >
                      <span className="text-2xl leading-none whitespace-nowrap">
                        {metas.map((m) => m.emoji).join('')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: callieTheme.pinkText }}>
                            {metas.map((m) => m.label).join(' · ')}
                          </span>
                          <span className="text-[11px] rounded-full px-2 py-0.5 font-medium" style={chip.style}>
                            {chip.label}
                          </span>
                          <span className="text-xs" style={{ color: callieTheme.muted }}>
                            {timeLabel(entry.created_at)}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="mt-0.5 text-sm break-words" style={{ color: '#9d5c81' }}>
                            {entry.note}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        aria-label="Delete mood"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-sm px-2"
                        style={{ color: callieTheme.muted }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </CallieFrame>
  )
}
