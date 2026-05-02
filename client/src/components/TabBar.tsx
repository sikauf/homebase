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
  const [overTo, setOverTo] = useState<string | null>(null)
  const didDrag = useRef(false)

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

  function reorder(targetTo: string) {
    if (!draggingTo || draggingTo === targetTo) return
    const list = orderedTabs.map((t) => t.to)
    const fromIdx = list.indexOf(draggingTo)
    const toIdx = list.indexOf(targetTo)
    if (fromIdx < 0 || toIdx < 0) return
    const next = [...list]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    persist(next)
  }

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-4 flex gap-1 shrink-0">
      {orderedTabs.map((tab) => {
        const isOver = persistKey && overTo === tab.to && draggingTo && draggingTo !== tab.to
        const isDragging = draggingTo === tab.to
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            draggable={!!persistKey}
            onDragStart={persistKey ? (e) => {
              didDrag.current = true
              setDraggingTo(tab.to)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', tab.to)
            } : undefined}
            onDragEnd={persistKey ? () => {
              setDraggingTo(null)
              setOverTo(null)
              setTimeout(() => { didDrag.current = false }, 0)
            } : undefined}
            onDragOver={persistKey ? (e) => {
              if (!draggingTo) return
              e.preventDefault()
              if (overTo !== tab.to) setOverTo(tab.to)
            } : undefined}
            onDragLeave={persistKey ? () => {
              if (overTo === tab.to) setOverTo(null)
            } : undefined}
            onDrop={persistKey ? (e) => {
              e.preventDefault()
              reorder(tab.to)
            } : undefined}
            onClick={persistKey ? (e) => {
              if (didDrag.current) e.preventDefault()
            } : undefined}
            className={({ isActive }) =>
              `px-4 py-3 text-sm font-medium border-b-2 transition-colors select-none ${
                isActive
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              } ${isDragging ? 'opacity-40' : ''} ${isOver ? 'bg-white/5' : ''} ${
                persistKey ? 'cursor-grab active:cursor-grabbing' : ''
              }`
            }
          >
            {tab.label}
          </NavLink>
        )
      })}
    </div>
  )
}
