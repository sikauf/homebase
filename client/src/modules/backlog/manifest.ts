import type { SectionManifest } from '../manifest'
import BacklogPage from './BacklogPage'

export const manifest: SectionManifest = {
  path: '/backlog',
  label: 'Backlog',
  icon: '📋',
  order: 6,
  description: 'Quick captures',
  Section: BacklogPage,
}
