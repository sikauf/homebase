import type { SectionManifest } from '../manifest'
import HomePage from './HomePage'

export const manifest: SectionManifest = {
  path: '/',
  label: 'Home',
  icon: '🏠',
  order: 0,
  Section: HomePage,
}
