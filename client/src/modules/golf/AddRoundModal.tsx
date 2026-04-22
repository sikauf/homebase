import { useMemo, useState, type FormEvent } from 'react'
import type { CreateRoundPayload } from '../../types/golf'
import { getCourseSuggestions } from './courseImages'

interface AddRoundModalProps {
  onClose: () => void
  onSubmit: (payload: CreateRoundPayload) => Promise<void>
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '0.875rem',
  color: 'rgba(255,255,255,0.9)',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 500,
  marginBottom: '4px',
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export default function AddRoundModal({ onClose, onSubmit }: AddRoundModalProps) {
  const [saving, setSaving] = useState(false)
  const [courseFocused, setCourseFocused] = useState(false)
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

  const suggestions = useMemo(() => getCourseSuggestions(form.course), [form.course])
  const showSuggestions =
    courseFocused &&
    suggestions.length > 0 &&
    !suggestions.some((s) => s.name.toLowerCase() === form.course.trim().toLowerCase())

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function pickCourse(name: string) {
    setForm((f) => ({ ...f, course: name }))
    setCourseFocused(false)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div
        className="relative rounded-2xl w-full max-w-lg mx-4 p-6"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-0 rounded-2xl"
          onClick={onClose}
          style={{ zIndex: -1 }}
        />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">Log a Round</h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Course <span style={{ color: '#f87171' }}>*</span></label>
            <input
              type="text"
              value={form.course}
              onChange={set('course')}
              onFocus={() => setCourseFocused(true)}
              onBlur={() => setTimeout(() => setCourseFocused(false), 150)}
              placeholder="e.g. Augusta National"
              autoComplete="off"
              required
              style={inputStyle}
            />
            {showSuggestions && (
              <ul
                role="listbox"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '4px',
                  listStyle: 'none',
                  zIndex: 10,
                  maxHeight: '260px',
                  overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                {suggestions.map((s) => (
                  <li
                    key={s.name}
                    role="option"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pickCourse(s.name)
                    }}
                    className="flex items-center gap-3 rounded-md cursor-pointer transition-colors"
                    style={{ padding: '6px', color: 'rgba(255,255,255,0.85)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <img
                      src={s.image}
                      alt=""
                      className="rounded"
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'cover',
                        objectPosition: s.objectPosition ?? '50% 50%',
                        flexShrink: 0,
                      }}
                    />
                    <span className="text-sm">{s.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Tees</label>
              <input type="text" value={form.tees} onChange={set('tees')} placeholder="e.g. Blue" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={form.played_at} onChange={set('played_at')} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Score</label>
              <input type="number" value={form.score} onChange={set('score')} placeholder="88" min={50} max={150} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Par</label>
              <input type="number" value={form.par} onChange={set('par')} min={60} max={80} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle}>FIR</label>
              <input type="number" value={form.fairways} onChange={set('fairways')} placeholder="—" min={0} max={18} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>GIR</label>
              <input type="number" value={form.gir} onChange={set('gir')} placeholder="—" min={0} max={18} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Putts</label>
              <input type="number" value={form.putts} onChange={set('putts')} placeholder="—" min={18} max={72} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="How'd it go?"
              rows={2}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.course.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                background: saving || !form.course.trim() ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
                color: saving || !form.course.trim() ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
                cursor: saving || !form.course.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Log Round'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
