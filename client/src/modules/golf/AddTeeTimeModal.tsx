import { useMemo, useState, type FormEvent } from 'react'
import type { CreateTeeTimePayload } from '../../types/golf'
import { getCourseSuggestions } from './courseImages'

interface AddTeeTimeModalProps {
  onClose: () => void
  onSubmit: (payload: CreateTeeTimePayload) => Promise<void>
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

export default function AddTeeTimeModal({ onClose, onSubmit }: AddTeeTimeModalProps) {
  const [saving, setSaving] = useState(false)
  const [courseFocused, setCourseFocused] = useState(false)
  const [course, setCourse] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const suggestions = useMemo(() => getCourseSuggestions(course), [course])
  const showSuggestions =
    courseFocused &&
    suggestions.length > 0 &&
    !suggestions.some((s) => s.name.toLowerCase() === course.trim().toLowerCase())

  function pickCourse(name: string) {
    setCourse(name)
    setCourseFocused(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!course.trim() || !date) return
    setSaving(true)
    try {
      await onSubmit({ course: course.trim(), date })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div
        className="relative rounded-2xl w-full max-w-md mx-4 p-6"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-2xl" onClick={onClose} style={{ zIndex: -1 }} />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">Add Tee Time</h2>
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
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              onFocus={() => setCourseFocused(true)}
              onBlur={() => setTimeout(() => setCourseFocused(false), 150)}
              placeholder="e.g. Bergen Point"
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
                    onMouseDown={(e) => { e.preventDefault(); pickCourse(s.name) }}
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

          <div>
            <label style={labelStyle}>Date <span style={{ color: '#f87171' }}>*</span></label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={inputStyle}
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
              disabled={saving || !course.trim() || !date}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                background: saving || !course.trim() || !date ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
                color: saving || !course.trim() || !date ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
                cursor: saving || !course.trim() || !date ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Add Tee Time'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
