import type { SectionManifest } from '../manifest'
import { useIsCouple } from '../../auth'
import MoodPage from './mood/Page'
import OurCalendarPage from './calendar/Page'

export const manifest: SectionManifest = {
  path: '/callie',
  label: 'Callie',
  icon: '🎀',
  order: 8,
  description: 'Moods & our calendar',
  // Private to the two of them: hidden from the sidebar/home unless logged in
  // as Sam or Callie (the server also rejects reads without one of their sessions).
  useVisible: () => useIsCouple(),
  tabs: [
    { label: 'Mood', path: 'mood', Page: MoodPage },
    { label: 'Our Calendar', path: 'calendar', Page: OurCalendarPage },
  ],
  reorderable: false,
}
