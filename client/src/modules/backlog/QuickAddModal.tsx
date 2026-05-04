import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { sections } from '../registry'
import { useQuickAdd } from './QuickAddContext'

function parsePathname(pathname: string): { section: string; tab: string } {
  const parts = pathname.split('/').filter(Boolean)
  const slug = parts[0] ?? ''
  if (slug === '' || slug === 'backlog') return { section: '', tab: '' }
  return { section: slug, tab: parts[1] ?? '' }
}

export default function QuickAddModal() {
  const { isOpen, close, createItem } = useQuickAdd()
  const location = useLocation()
  const [text, setText] = useState('')
  const [section, setSection] = useState('')
  const [tab, setTab] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectableSections = useMemo(
    () => sections.filter((s) => s.path !== '/' && s.path !== '/backlog'),
    [],
  )

  useEffect(() => {
    if (!isOpen) return
    const parsed = parsePathname(location.pathname)
    setText('')
    setSection(parsed.section)
    setTab(parsed.tab)
    setSubmitting(false)
    queueMicrotask(() => inputRef.current?.focus())
  }, [isOpen, location.pathname])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  if (!isOpen) return null

  const sectionManifest = selectableSections.find((s) => s.path === `/${section}`)
  const tabOptions = sectionManifest?.tabs ?? []

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await createItem({
        text: trimmed,
        section: section || null,
        tab: section && tab ? tab : null,
      })
      close()
    } catch (e) {
      console.error('Failed to create backlog item:', e)
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={close}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-5"
        style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[10px] uppercase tracking-[.2em] mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
          New backlog item
        </div>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="What needs to happen?"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
          style={{
            background: '#0c0c0c',
            color: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />

        <div className="flex gap-2 mb-4">
          <select
            value={section}
            onChange={(e) => {
              setSection(e.target.value)
              setTab('')
            }}
            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
            style={{
              background: '#0c0c0c',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <option value="">Untagged</option>
            {selectableSections.map((s) => (
              <option key={s.path} value={s.path.replace(/^\//, '')}>{s.label}</option>
            ))}
          </select>

          <select
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            disabled={!tabOptions.length}
            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
            style={{
              background: '#0c0c0c',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.08)',
              opacity: tabOptions.length ? 1 : 0.4,
            }}
          >
            <option value="">{tabOptions.length ? 'Any tab' : '—'}</option>
            {tabOptions.map((t) => (
              <option key={t.path} value={t.path}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={close}
            className="px-3 py-1.5 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || submitting}
            className="px-4 py-1.5 rounded-lg disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.92)',
              color: '#0c0c0c',
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
