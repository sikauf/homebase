import { timestampToLocalIso } from '../dates'
import { CalendarSource, CalendarEvent, getJSON } from '../types'

interface BacklogItem {
  id: number
  text: string
  status: 'open' | 'done'
  created_at: string        // sqlite UTC datetime
  completed_at: string | null
}

const DONE_COLOR = 'rgb(94,234,212)'

// Only completions land on the calendar — adding an item isn't something that
// happened that day worth marking, finishing it is.
const backlog: CalendarSource = {
  id: 'backlog',
  label: 'Backlog',
  icon: '📋',
  color: DONE_COLOR,
  async fetch() {
    const items = await getJSON<BacklogItem[]>('/api/backlog/items')
    const events: CalendarEvent[] = []
    for (const item of items) {
      if (item.status !== 'done' || !item.completed_at) continue
      events.push({
        date: timestampToLocalIso(item.completed_at),
        label: `Done — ${item.text}`,
        color: DONE_COLOR,
      })
    }
    return { events }
  },
}

export default backlog
