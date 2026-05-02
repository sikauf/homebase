import db from '../../db/client'
import { defineCrud, dateField, enumField } from '../../shared/crud'

const VALID_STATES = new Set(['clean', 'gold'])

export default defineCrud({
  db,
  table: 'clean_days',
  list: { route: '/days', orderBy: 'date ASC' },
  create: {
    route: '/days',
    fields: {
      date: dateField(),
      state: enumField(VALID_STATES, 'state', { default: 'clean', error: 'state must be "clean" or "gold"' }),
    },
    onConflict: 'upsert',
    upsertKeys: ['date'],
  },
  remove: {
    route: '/days/:date',
    keys: ['date'],
    notFoundError: 'Date not found',
  },
})
