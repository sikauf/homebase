import { useMemo, useState, type FormEvent } from 'react'
import type { ParallelBook } from './api'

interface AddParallelModalProps {
  library: ParallelBook[] | null
  libraryError: string | null
  initialA?: ParallelBook
  initialB?: ParallelBook
  onClose: () => void
  onSubmit: (a: ParallelBook, b: ParallelBook, note: string) => Promise<void>
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

function BookPicker({ label, value, onChange, library, excludeId }: {
  label: string
  value: ParallelBook | null
  onChange: (book: ParallelBook | null) => void
  library: ParallelBook[]
  excludeId?: number
}) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return library
      .filter((b) => b.book_id !== excludeId)
      .filter((b) => !q || b.title.toLowerCase().includes(q) || (b.author ?? '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [library, query, excludeId])

  const showSuggestions = focused && value == null && suggestions.length > 0

  return (
    <div style={{ position: 'relative' }}>
      <label style={labelStyle}>{label} <span style={{ color: '#f87171' }}>*</span></label>
      <div className="flex items-center gap-2">
        {value?.cover_url && (
          <img
            src={value.cover_url}
            alt=""
            className="rounded"
            style={{ width: '26px', height: '38px', objectFit: 'cover', flexShrink: 0 }}
          />
        )}
        <input
          type="text"
          value={value ? value.title : query}
          onChange={(e) => { onChange(null); setQuery(e.target.value) }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search your library…"
          autoComplete="off"
          style={inputStyle}
        />
      </div>
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
          {suggestions.map((b) => (
            <li
              key={b.book_id}
              role="option"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(b)
                setQuery('')
              }}
              className="flex items-center gap-3 rounded-md cursor-pointer transition-colors"
              style={{ padding: '6px', color: 'rgba(255,255,255,0.85)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {b.cover_url ? (
                <img
                  src={b.cover_url}
                  alt=""
                  className="rounded"
                  style={{ width: '28px', height: '42px', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div
                  className="rounded flex items-center justify-center"
                  style={{ width: '28px', height: '42px', background: '#242424', flexShrink: 0 }}
                >
                  📖
                </div>
              )}
              <span className="min-w-0">
                <span className="block text-sm truncate">{b.title}</span>
                {b.author && (
                  <span className="block text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {b.author}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function AddParallelModal({ library, libraryError, initialA, initialB, onClose, onSubmit }: AddParallelModalProps) {
  const [a, setA] = useState<ParallelBook | null>(initialA ?? null)
  const [b, setB] = useState<ParallelBook | null>(initialB ?? null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = a != null && b != null && a.book_id !== b.book_id && note.trim() !== ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit(a!, b!, note.trim())
      onClose()
    } catch (err) {
      setError((err as Error).message)
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">Add a Parallel</h2>
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

        {libraryError ? (
          <p className="text-sm py-8 text-center" style={{ color: '#f87171' }}>{libraryError}</p>
        ) : library == null ? (
          <p className="text-sm py-8 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading your library…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <BookPicker label="First book" value={a} onChange={setA} library={library} excludeId={b?.book_id} />
            <BookPicker label="Second book" value={b} onChange={setB} library={library} excludeId={a?.book_id} />

            <div>
              <label style={labelStyle}>The parallel <span style={{ color: '#f87171' }}>*</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What connects them?"
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}

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
                disabled={saving || !canSubmit}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  background: saving || !canSubmit ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
                  color: saving || !canSubmit ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
                  cursor: saving || !canSubmit ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Add Parallel'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
