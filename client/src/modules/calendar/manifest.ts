import type { SectionManifest } from '../manifest'
import CalendarPage from './CalendarPage'

export const manifest: SectionManifest = {
  path: '/calendar',
  label: 'Calendar',
  icon: '🗓️',
  order: 7,
  description: 'Everything, day by day',
  Section: CalendarPage,
}
