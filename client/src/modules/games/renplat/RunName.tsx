import { useEffect, useRef, useState } from 'react'
import type { Run } from './api'
import { runLabel } from './data'

/**
 * The run's name, editable in place. Blanking it falls back to "Run #N" rather
 * than leaving the run nameless, so there's always a label to click on.
 */
export default function RunName({
  run,
  onRename,
  className = 'text-sm font-bold text-white',
}: {
  run: Pick<Run, 'id' | 'name' | 'number'>
  onRename: (id: number, name: string) => Promise<unknown>
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  function start() {
    setDraft(run.name ?? '')
    setEditing(true)
  }

  async function commit() {
    setEditing(false)
    if (draft.trim() !== (run.name ?? '').trim()) await onRename(run.id, draft.trim())
  }

  if (editing) {
    return (
      <input
        ref={input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void commit()
          if (e.key === 'Escape') {
            // The page closes modals on Escape — this one just abandons the edit.
            e.stopPropagation()
            setEditing(false)
          }
        }}
        placeholder={`Run #${run.number}`}
        maxLength={80}
        className={`${className} rounded px-1.5 py-0.5 min-w-32`}
        style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.15)' }}
      />
    )
  }

  return (
    <button
      onClick={start}
      className={`${className} text-left hover:underline decoration-dotted underline-offset-2`}
      title="Rename this run"
    >
      {runLabel(run)}
    </button>
  )
}
