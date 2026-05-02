import type { SectionManifest } from '../manifest'
import FitnessPage from './FitnessPage'

export const manifest: SectionManifest = {
  path: '/fitness',
  label: 'Fitness',
  icon: '💪',
  order: 5,
  description: 'Workouts & progress',
  Section: FitnessPage,
}
