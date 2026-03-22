import { useState, useEffect, useCallback } from 'react'
import { fetchRounds, fetchStats, createRound, deleteRound } from '../api/golf'
import type { GolfRound, GolfStats, CreateRoundPayload } from '../types/golf'

export function useGolf() {
  const [rounds, setRounds] = useState<GolfRound[]>([])
  const [stats, setStats] = useState<GolfStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [r, s] = await Promise.all([fetchRounds(), fetchStats()])
      setRounds(r)
      setStats(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addRound = useCallback(
    async (payload: CreateRoundPayload) => {
      await createRound(payload)
      await load()
    },
    [load]
  )

  const removeRound = useCallback(
    async (id: number) => {
      await deleteRound(id)
      await load()
    },
    [load]
  )

  return { rounds, stats, loading, error, addRound, removeRound, refresh: load }
}
