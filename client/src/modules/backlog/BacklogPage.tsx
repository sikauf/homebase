import { useState } from 'react'
import { useQuickAdd } from './QuickAddContext'
import type { BacklogItem } from './types'
import { sections } from '../registry'

const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  sections.map((s) => [s.path.replace(/^\//, ''), s.label]),
)

function sectionLabel(section: string | null): string | null {
  if (!section) return null
  return SECTION_LABELS[section] ?? section
}

export default function BacklogPage() {
  const { items, loading, toggleStatus, deleteItem } = useQuickAdd()
  const [groupBySection, setGroupBySection] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const visible = items.filter((i) => showCompleted || i.status === 'open')

  const grouped = (() => {
    if (!groupBySection) return [{ key: '', label: '', items: visible }]
    const groups = new Map<string, BacklogItem[]>()
    for (const item of visible) {
      const key = item.section ?? ''
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    return [...groups.entries()]
      .sort((a, b) => (a[0] === '' ? 1 : b[0] === '' ? -1 : a[0].localeCompare(b[0])))
      .map(([key, items]) => ({ key, label: sectionLabel(key) ?? 'Untagged', items }))
  })()

  const openCount = items.filter((i) => i.status === 'open').length
  const doneCount = items.filter((i) => i.status === 'done').length

  return (
    <div className="flex-1 flex flex-col min-h-screen p-8" style={{ background: '#0c0c0c' }}>
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-[.2em] uppercase text-white" style={{ fontFamily: "'Kreon', serif" }}>
            Backlog
          </h1>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Press <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>n</kbd> from anywhere to add a new item.
          </p>
        </div>

        <div className="flex gap-4 mb-4 text-xs items-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span>{openCount} open</span>
          <span>{doneCount} done</span>
          <span className="ml-auto flex gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={groupBySection}
                onChange={(e) => setGroupBySection(e.target.checked)}
              />
              Group by section
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
              />
              Show completed
            </label>
          </span>
        </div>

        {loading && <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading…</p>}

        {!loading && visible.length === 0 && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            No items{showCompleted ? '' : ' open'}. Press <kbd className="px-1 rounded" style={{ background: '#1a1a1a' }}>n</kbd> to add one.
          </p>
        )}

        {grouped.map((group) => (
          <div key={group.key} className="mb-6">
            {groupBySection && group.items.length > 0 && (
              <h2 className="text-[10px] uppercase tracking-[.2em] mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {group.label}
              </h2>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => (
                <BacklogRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleStatus(item)}
                  onDelete={() => deleteItem(item.id)}
                  hideTag={groupBySection}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function BacklogRow({
  item,
  onToggle,
  onDelete,
  hideTag,
}: {
  item: BacklogItem
  onToggle: () => void
  onDelete: () => void
  hideTag?: boolean
}) {
  const tag = item.section
    ? item.tab
      ? `${sectionLabel(item.section) ?? item.section} / ${item.tab}`
      : (sectionLabel(item.section) ?? item.section)
    : null

  return (
    <li
      className="group flex items-center gap-3 px-3 py-2 rounded-lg"
      style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <input
        type="checkbox"
        checked={item.status === 'done'}
        onChange={onToggle}
        className="cursor-pointer"
      />
      <span
        className={`flex-1 text-sm ${item.status === 'done' ? 'line-through' : ''}`}
        style={{ color: item.status === 'done' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.92)' }}
      >
        {item.text}
      </span>
      {tag && !hideTag && (
        <span className="text-[10px] uppercase tracking-[.15em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {tag}
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-xs"
        style={{ color: 'rgba(255,255,255,0.35)' }}
        aria-label="Delete"
      >
        ✕
      </button>
    </li>
  )
}
