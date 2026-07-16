import { NavLink } from 'react-router-dom'
import { useMemo, useRef, useState } from 'react'

interface Tab {
  label: string
  to: string
}

interface Props {
  tabs: Tab[]
  persistKey?: string
}

function loadOrder(key: string): string[] {
  try {
    const raw = localStorage.getItem(`tab-order:${key}`)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export default function TabBar({ tabs, persistKey }: Props) {
  const [order, setOrder] = useState<string[]>(() => (persistKey ? loadOrder(persistKey) : []))
  const [draggingTo, setDraggingTo] = useState<string | null>(null)
  // Index in orderedTabs the dragged tab would land before; orderedTabs.length means "at the end".
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  const didDrag = useRef(false)
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>())

  const orderedTabs = useMemo(() => {
    if (!persistKey) return tabs
    const byTo = new Map(tabs.map((t) => [t.to, t]))
    const out: Tab[] = []
    for (const to of order) {
      const t = byTo.get(to)
      if (t) { out.push(t); byTo.delete(to) }
    }
    for (const t of byTo.values()) out.push(t)
    return out
  }, [tabs, order, persistKey])

  function persist(next: string[]) {
    setOrder(next)
    if (persistKey) {
      try { localStorage.setItem(`tab-order:${persistKey}`, JSON.stringify(next)) } catch {}
    }
  }

  // Insertion index based on cursor x: a tab gets the slot before it once the cursor
  // crosses its horizontal midpoint, so dropping anywhere (incl. the container padding
  // past the first/last tab) snaps to the nearest gap.
  function indexForX(clientX: number): number {
    const list = orderedTabs
    for (let i = 0; i < list.length; i++) {
      const el = linkRefs.current.get(list[i].to)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientX < rect.left + rect.width / 2) return i
    }
    return list.length
  }

  function commitDrop() {
    if (!draggingTo || dropIdx === null) return
    const list = orderedTabs.map((t) => t.to)
    const fromIdx = list.indexOf(draggingTo)
    if (fromIdx < 0) return
    const next = [...list]
    const [moved] = next.splice(fromIdx, 1)
    // dropIdx is relative to the pre-removal list; adjust when the source sits before it.
    const insertAt = dropIdx > fromIdx ? dropIdx - 1 : dropIdx
    next.splice(insertAt, 0, moved)
    persist(next)
  }

  if (!persistKey) {
    return (
      <div className="bg-gray-900 border-b border-gray-800 px-4 flex gap-1 shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-b-2 transition-colors select-none whitespace-nowrap shrink-0 ${
                isActive
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    )
  }

  return (
    <div
      className="bg-gray-900 border-b border-gray-800 px-4 flex gap-1 shrink-0 overflow-x-auto"
      onDragOver={(e) => {
        if (!draggingTo) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        const idx = indexForX(e.clientX)
        if (idx !== dropIdx) setDropIdx(idx)
      }}
      onDrop={(e) => {
        if (!draggingTo) return
        e.preventDefault()
        commitDrop()
      }}
    >
      {orderedTabs.map((tab, i) => {
        const isDragging = draggingTo === tab.to
        const showIndicator = draggingTo && dropIdx === i && draggingTo !== tab.to
        return (
          <div key={tab.to} className="flex items-stretch shrink-0">
            <span
              className={`w-0.5 -mx-px rounded-full transition-colors ${
                showIndicator ? 'bg-white/70' : 'bg-transparent'
              }`}
            />
            <NavLink
              to={tab.to}
              ref={(el) => {
                if (el) linkRefs.current.set(tab.to, el)
                else linkRefs.current.delete(tab.to)
              }}
              draggable
              onDragStart={(e) => {
                didDrag.current = true
                setDraggingTo(tab.to)
                setDropIdx(i)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', tab.to)
              }}
              onDragEnd={() => {
                setDraggingTo(null)
                setDropIdx(null)
                setTimeout(() => { didDrag.current = false }, 0)
              }}
              onClick={(e) => {
                if (didDrag.current) e.preventDefault()
              }}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium border-b-2 transition-colors select-none whitespace-nowrap cursor-grab active:cursor-grabbing ${
                  isActive
                    ? 'border-white text-white'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                } ${isDragging ? 'opacity-40' : ''}`
              }
            >
              {tab.label}
            </NavLink>
          </div>
        )
      })}
      {/* trailing indicator for dropping at the very end */}
      <span
        className={`w-0.5 -ml-px self-stretch rounded-full transition-colors ${
          draggingTo && dropIdx === orderedTabs.length ? 'bg-white/70' : 'bg-transparent'
        }`}
      />
    </div>
  )
}
