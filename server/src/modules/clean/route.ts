import { Router } from 'express'
import db from '../../db/client'
import { defineCrud, dateField, enumField } from '../../shared/crud'
import { requireSam } from '../../shared/auth'

const VALID_STATES = new Set(['clean', 'gold'])

const crud = defineCrud({
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

// Clean is private: unlike the rest of the app, even reads require auth.
const router = Router()
router.use(requireSam)
router.use(crud)

export default router
