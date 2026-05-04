import { useMemo, useState } from 'react'
import { useQuickAdd } from './QuickAddContext'
import type { BacklogItem } from './types'
import { sections } from '../registry'

type Filter = 'open' | 'done' | 'all'

const SECTION_COLORS: Record<string, string> = {
  golf:    '74,222,128',
  fitness: '250,204,21',
  clean:   '16,185,129',
  books:   '194,130,82',
  games:   '168,85,247',
}

function colorForSection(section: string | null): string | null {
  if (!section) return null
  return SECTION_COLORS[section] ?? null
}

export default function BacklogPage() {
  const { items, loading, toggleStatus, deleteItem, reorder } = useQuickAdd()
  const [groupBySection, setGroupBySection] = useState(false)
  const [filter, setFilter] = useState<Filter>('open')
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)

  const sectionLabel = useMemo(() => {
    const labels: Record<string, string> = Object.fromEntries(
      sections.map((s) => [s.path.replace(/^\//, ''), s.label]),
    )
    return (section: string | null): string | null => {
      if (!section) return null
      return labels[section] ?? section
    }
  }, [])

  const visible = items.filter((i) =>
    filter === 'all' ? true : filter === 'done' ? i.status === 'done' : i.status === 'open',
  )

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
  const totalCount = items.length

  const dragEnabled = !groupBySection && filter === 'open'

  function handleDrop(targetId: number) {
    if (!dragEnabled || draggingId === null || draggingId === targetId) return
    const ids = visible.map((i) => i.id)
    const fromIdx = ids.indexOf(draggingId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx < 0 || toIdx < 0) return
    const next = [...ids]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    reorder(next)
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen p-8" style={{ background: '#0c0c0c' }}>
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-8 pt-2">
          <div className="flex items-center gap-5 mb-3">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12))' }} />
            <h1 className="text-2xl font-black tracking-[.35em] uppercase text-white" style={{ fontFamily: "'Kreon', serif" }}>
              Backlog
            </h1>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.12))' }} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
            <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
            <div className="h-px w-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
            <div className="h-px w-10" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Press <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>n</kbd> from anywhere to add a new item.
          </p>
        </div>

        <div className="flex items-center mb-6">
          <FilterPill
            filter={filter}
            onChange={setFilter}
            counts={{ open: openCount, done: doneCount, all: totalCount }}
          />
          <div className="ml-auto">
            <GroupToggle active={groupBySection} onClick={() => setGroupBySection((v) => !v)} />
          </div>
        </div>

        {loading && <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading…</p>}

        {!loading && visible.length === 0 && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {filter === 'done'
              ? 'No completed items.'
              : filter === 'all'
              ? <>Nothing here yet. Press <kbd className="px-1 rounded" style={{ background: '#1a1a1a' }}>n</kbd> to add one.</>
              : <>No open items. Press <kbd className="px-1 rounded" style={{ background: '#1a1a1a' }}>n</kbd> to add one.</>}
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
                  sectionRgb={colorForSection(item.section)}
                  onToggle={() => toggleStatus(item)}
                  onDelete={() => deleteItem(item.id)}
                  hideTag={groupBySection}
                  sectionLabel={sectionLabel}
                  dragEnabled={dragEnabled}
                  isDragging={draggingId === item.id}
                  isOver={overId === item.id && draggingId !== null && draggingId !== item.id}
                  onDragStart={() => setDraggingId(item.id)}
                  onDragEnd={() => { setDraggingId(null); setOverId(null) }}
                  onDragOver={() => { if (overId !== item.id) setOverId(item.id) }}
                  onDragLeave={() => { if (overId === item.id) setOverId(null) }}
                  onDrop={() => handleDrop(item.id)}
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
  sectionRgb,
  onToggle,
  onDelete,
  hideTag,
  sectionLabel,
  dragEnabled,
  isDragging,
  isOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  item: BacklogItem
  sectionRgb: string | null
  onToggle: () => void
  onDelete: () => void
  hideTag?: boolean
  sectionLabel: (section: string | null) => string | null
  dragEnabled: boolean
  isDragging: boolean
  isOver: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: () => void
}) {
  const done = item.status === 'done'
  const tag = item.section
    ? item.tab
      ? `${sectionLabel(item.section) ?? item.section} / ${item.tab}`
      : (sectionLabel(item.section) ?? item.section)
    : null

  return (
    <li
      className={`group relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg transition-opacity ${
        isDragging ? 'opacity-40' : ''
      } ${isOver ? 'ring-1 ring-white/30' : ''} ${dragEnabled ? 'select-none' : ''}`}
      style={{
        background: done ? 'transparent' : '#1a1a1a',
        border: done ? '1px solid transparent' : '1px solid rgba(255,255,255,0.06)',
        opacity: done ? 0.5 : 1,
      }}
      draggable={dragEnabled}
      onDragStart={dragEnabled ? (e) => {
        onDragStart()
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(item.id))
      } : undefined}
      onDragEnd={dragEnabled ? onDragEnd : undefined}
      onDragOver={dragEnabled ? (e) => { e.preventDefault(); onDragOver() } : undefined}
      onDragLeave={dragEnabled ? onDragLeave : undefined}
      onDrop={dragEnabled ? (e) => { e.preventDefault(); onDrop() } : undefined}
    >
      {sectionRgb && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
          style={{ background: `rgb(${sectionRgb})` }}
        />
      )}
      {dragEnabled && (
        <span
          aria-hidden
          className="cursor-grab active:cursor-grabbing text-xs leading-none"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          ⋮⋮
        </span>
      )}
      <input
        type="checkbox"
        checked={done}
        onChange={onToggle}
        className="cursor-pointer"
      />
      <span
        className={`flex-1 text-sm ${done ? 'line-through' : ''}`}
        style={{ color: done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.92)' }}
      >
        {item.text}
      </span>
      {tag && !hideTag && (
        <span
          className="text-[10px] uppercase tracking-[.15em] px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{
            background: sectionRgb ? `rgba(${sectionRgb},0.12)` : 'rgba(255,255,255,0.04)',
            color: sectionRgb ? `rgba(${sectionRgb},0.95)` : 'rgba(255,255,255,0.4)',
          }}
        >
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

const FILTER_OPTIONS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'done', label: 'Done' },
  { key: 'all',  label: 'All'  },
]

function FilterPill({
  filter,
  onChange,
  counts,
}: {
  filter: Filter
  onChange: (f: Filter) => void
  counts: Record<Filter, number>
}) {
  return (
    <div
      className="inline-flex rounded-full p-[2px]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {FILTER_OPTIONS.map((opt) => {
        const active = filter === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="px-3 py-1 rounded-full transition-colors flex items-center gap-1.5"
            style={{
              background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
              boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
              transition: 'background 120ms ease, color 120ms ease',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
          >
            <span
              className="text-[10px] uppercase tracking-[.18em] font-medium"
              style={{ color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)' }}
            >
              {opt.label}
            </span>
            <span
              className="text-[10px] tabular-nums"
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                color: active ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)',
              }}
            >
              {counts[opt.key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function GroupToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Group by section"
      aria-label="Group by section"
      aria-pressed={active}
      className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
      style={{
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: active ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.3)',
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' } }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <rect x="2" y="2.5"  width="10" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="2" y="6.25" width="6"  height="1.5" rx="0.75" fill="currentColor" />
        <rect x="2" y="10"   width="8"  height="1.5" rx="0.75" fill="currentColor" />
      </svg>
    </button>
  )
}
