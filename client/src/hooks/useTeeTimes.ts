import { useState, useEffect, useCallback } from 'react'
import { fetchTeeTimes, createTeeTime, deleteTeeTime } from '../api/golf'
import type { TeeTime, CreateTeeTimePayload } from '../types/golf'

export function useTeeTimes() {
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setTeeTimes(await fetchTeeTimes())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tee times')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addTeeTime = useCallback(async (payload: CreateTeeTimePayload) => {
    await createTeeTime(payload)
    await load()
  }, [load])

  const removeTeeTime = useCallback(async (id: number) => {
    await deleteTeeTime(id)
    await load()
  }, [load])

  return { teeTimes, loading, error, addTeeTime, removeTeeTime, refresh: load }
}
