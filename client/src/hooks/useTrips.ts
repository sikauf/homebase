import { useState, useEffect, useCallback } from 'react'
import { fetchTrips, createTrip, deleteTrip } from '../api/golf'
import type { GolfTrip, CreateTripPayload } from '../types/golf'

export function useTrips() {
  const [trips, setTrips] = useState<GolfTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setTrips(await fetchTrips())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trips')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addTrip = useCallback(async (payload: CreateTripPayload) => {
    await createTrip(payload)
    await load()
  }, [load])

  const removeTrip = useCallback(async (id: number) => {
    await deleteTrip(id)
    await load()
  }, [load])

  return { trips, loading, error, addTrip, removeTrip, refresh: load }
}
