import { CalendarSource, getJSON } from '../types'

interface CleanDay { date: string; state: 'clean' | 'gold' }

const clean: CalendarSource = {
  id: 'clean',
  label: 'Clean',
  icon: '🌿',
  color: 'rgb(74,222,128)',
  requiresAuth: true,
  async fetch() {
    const days = await getJSON<CleanDay[]>('/api/clean/days')
    return {
      events: days.map((d) => ({
        date: d.date,
        label: d.state === 'gold' ? 'Gold day' : 'Clean day',
        color: d.state === 'gold' ? 'rgb(251,191,36)' : 'rgb(74,222,128)',
      })),
    }
  },
}

export default clean
