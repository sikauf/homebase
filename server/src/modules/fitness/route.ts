import db from '../../db/client'
import { defineCrud, dateField, enumField } from '../../shared/crud'

const VALID_TYPES = new Set(['core', 'cardio', 'legs', 'shoulders', 'triceps', 'biceps', 'chest', 'back'])

export default defineCrud({
  db,
  table: 'fitness_workouts',
  list: { route: '/workouts', orderBy: 'date ASC' },
  create: {
    route: '/workouts',
    fields: {
      date: dateField(),
      type: enumField(VALID_TYPES, 'type'),
    },
    onConflict: 'ignore',
  },
  remove: {
    route: '/workouts/:date/:type',
    keys: ['date', 'type'],
    notFoundError: 'Workout not found',
  },
})
