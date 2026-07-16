import { timestampToLocalIso } from '../dates'
import { CalendarSource, CalendarEvent, getJSON } from '../types'

interface BacklogItem {
  id: number
  text: string
  status: 'open' | 'done'
  created_at: string        // sqlite UTC datetime
  completed_at: string | null
}

const ADDED_COLOR = 'rgb(148,163,184)'
const DONE_COLOR = 'rgb(94,234,212)'

const backlog: CalendarSource = {
  id: 'backlog',
  label: 'Backlog',
  icon: '📋',
  color: ADDED_COLOR,
  async fetch() {
    const items = await getJSON<BacklogItem[]>('/api/backlog/items')
    const events: CalendarEvent[] = []
    for (const item of items) {
      events.push({
        date: timestampToLocalIso(item.created_at),
        label: `Added — ${item.text}`,
        color: ADDED_COLOR,
      })
      if (item.status === 'done' && item.completed_at) {
        events.push({
          date: timestampToLocalIso(item.completed_at),
          label: `Done — ${item.text}`,
          color: DONE_COLOR,
        })
      }
    }
    return { events }
  },
}

export default backlog
