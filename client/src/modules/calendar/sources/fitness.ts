import { WORKOUT_TYPES } from '../../fitness/FitnessPage'
import { CalendarSource, getJSON } from '../types'

interface WorkoutRow { date: string; type: string }

const TYPE_INFO = new Map(WORKOUT_TYPES.map((t) => [t.id, t]))

const fitness: CalendarSource = {
  id: 'fitness',
  label: 'Fitness',
  icon: '💪',
  color: '#38bdf8',
  async fetch() {
    const rows = await getJSON<WorkoutRow[]>('/api/fitness/workouts')
    return {
      events: rows.map((r) => {
        const info = TYPE_INFO.get(r.type)
        return {
          date: r.date,
          label: info?.label ?? r.type,
          color: info?.color ?? 'rgba(255,255,255,0.5)',
        }
      }),
    }
  },
}

export default fitness
