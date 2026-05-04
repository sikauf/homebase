import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import * as api from './api'
import type { BacklogItem } from './types'

interface ContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  items: BacklogItem[]
  loading: boolean
  createItem: (input: { text: string; section: string | null; tab: string | null }) => Promise<void>
  toggleStatus: (item: BacklogItem) => Promise<void>
  deleteItem: (id: number) => Promise<void>
  reorder: (ids: number[]) => Promise<void>
}

const QuickAddContext = createContext<ContextValue | null>(null)

export function useQuickAdd(): ContextValue {
  const ctx = useContext(QuickAddContext)
  if (!ctx) throw new Error('useQuickAdd must be used inside QuickAddProvider')
  return ctx
}

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<BacklogItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.fetchItems()
      .then(setItems)
      .catch((e) => console.error('Failed to load backlog:', e))
      .finally(() => setLoading(false))
  }, [])

  const createItem = useCallback(async (input: { text: string; section: string | null; tab: string | null }) => {
    const created = await api.createItem(input)
    setItems((prev) => [created, ...prev])
  }, [])

  const toggleStatus = useCallback(async (item: BacklogItem) => {
    const next = item.status === 'open' ? 'done' : 'open'
    const updated = await api.updateStatus(item.id, next)
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
  }, [])

  const deleteItem = useCallback(async (id: number) => {
    await api.deleteItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const reorder = useCallback(async (ids: number[]) => {
    setItems((prev) => {
      const targetIds = new Set(ids)
      const subset = prev.filter((i) => targetIds.has(i.id))
      const sortedPositions = subset.map((i) => i.position).sort((a, b) => a - b)
      const newPos = new Map<number, number>()
      ids.forEach((id, i) => newPos.set(id, sortedPositions[i]))
      return prev
        .map((i) => (newPos.has(i.id) ? { ...i, position: newPos.get(i.id)! } : i))
        .sort((a, b) => a.position - b.position || b.id - a.id)
    })
    try {
      await api.reorderItems(ids)
    } catch (e) {
      console.error('Failed to reorder backlog items:', e)
      api.fetchItems().then(setItems).catch(() => {})
    }
  }, [])

  const value: ContextValue = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    items,
    loading,
    createItem,
    toggleStatus,
    deleteItem,
    reorder,
  }

  return <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>
}
