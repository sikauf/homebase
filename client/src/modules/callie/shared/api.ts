export type AddedBy = 'sam' | 'callie'
export type Recurrence = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface CallieMood {
  id: number
  mood: string
  note: string | null
  added_by: AddedBy
  created_at: string
}

export interface CallieEvent {
  id: number
  title: string
  date: string
  time: string | null
  recurrence: Recurrence
  until: string | null
  notes: string | null
  added_by: AddedBy
  created_at: string
}

export interface CalliePhoto {
  name: string
  url: string
  added_by?: AddedBy
}

export interface CreateEventPayload {
  title: string
  date: string
  time?: string
  recurrence?: Recurrence
  until?: string
  notes?: string
}

const BASE = '/api/callie'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`Request failed: ${path}`)
  return res.status === 204 ? (undefined as T) : res.json()
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const fetchMoods = () => request<CallieMood[]>('/moods')
export const createMood = (mood: string, note?: string) =>
  request<CallieMood>('/moods', jsonInit('POST', { mood, note }))
export const deleteMood = (id: number) => request<void>(`/moods/${id}`, { method: 'DELETE' })

export const fetchEvents = () => request<CallieEvent[]>('/events')
export const createEvent = (payload: CreateEventPayload) =>
  request<CallieEvent>('/events', jsonInit('POST', payload))
export const deleteEvent = (id: number) => request<void>(`/events/${id}`, { method: 'DELETE' })

export const fetchPhotos = () => request<CalliePhoto[]>('/photos')
export const uploadPhoto = (mime: string, data: string) =>
  request<CalliePhoto>('/photos', jsonInit('POST', { mime, data }))
