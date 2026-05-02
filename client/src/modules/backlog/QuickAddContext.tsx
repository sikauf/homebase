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

  const value: ContextValue = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    items,
    loading,
    createItem,
    toggleStatus,
    deleteItem,
  }

  return <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>
}
