import { useMemo, useState, type FormEvent } from 'react'
import type { CreateTripPayload } from '../../types/golf'
import { getCourseSuggestions } from './courseImages'

interface Props {
  onClose: () => void
  onSubmit: (payload: CreateTripPayload) => Promise<void>
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

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function AddTripModal({ onClose, onSubmit }: Props) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const today = todayIso()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [courses, setCourses] = useState<string[]>([])
  const [courseDraft, setCourseDraft] = useState('')
  const [courseFocused, setCourseFocused] = useState(false)

  const suggestions = useMemo(() => getCourseSuggestions(courseDraft), [courseDraft])
  const showSuggestions =
    courseFocused &&
    suggestions.length > 0 &&
    !suggestions.some((s) => s.name.toLowerCase() === courseDraft.trim().toLowerCase())

  function addCourse(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    if (courses.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCourseDraft('')
      return
    }
    setCourses((cs) => [...cs, trimmed])
    setCourseDraft('')
  }

  function removeCourse(name: string) {
    setCourses((cs) => cs.filter((c) => c !== name))
  }

  function handleCourseKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCourse(courseDraft)
    } else if (e.key === 'Backspace' && courseDraft === '' && courses.length > 0) {
      e.preventDefault()
      setCourses((cs) => cs.slice(0, -1))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || !startDate || !endDate) return
    if (endDate < startDate) return
    setSaving(true)
    try {
      await onSubmit({
        name: trimmedName,
        location: location.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        courses,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const invalid = !name.trim() || !startDate || !endDate || endDate < startDate

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div
        className="relative rounded-2xl w-full max-w-lg mx-4 p-6"
        style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-2xl" onClick={onClose} style={{ zIndex: -1 }} />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">Add Trip</h2>
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
          <div>
            <label style={labelStyle}>Name <span style={{ color: '#f87171' }}>*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Myrtle Beach"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. South Carolina"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Start <span style={{ color: '#f87171' }}>*</span></label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>End <span style={{ color: '#f87171' }}>*</span></label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Courses</label>
            {courses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {courses.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => removeCourse(c)}
                      className="text-xs leading-none"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={courseDraft}
              onChange={(e) => setCourseDraft(e.target.value)}
              onKeyDown={handleCourseKeyDown}
              onFocus={() => setCourseFocused(true)}
              onBlur={() => setTimeout(() => setCourseFocused(false), 150)}
              placeholder="Type a course, press Enter"
              autoComplete="off"
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
                    onMouseDown={(e) => { e.preventDefault(); addCourse(s.name) }}
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
              disabled={saving || invalid}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                background: saving || invalid ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
                color: saving || invalid ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
                cursor: saving || invalid ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Add Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
