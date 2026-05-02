import type { SectionManifest } from '../manifest'
import { useCleanVisible } from '../../hooks/useCleanVisible'
import CleanPage from './CleanPage'

export const manifest: SectionManifest = {
  path: '/clean',
  label: 'Clean',
  icon: '🌿',
  order: 4,
  description: 'Day tracker',
  useVisible: () => useCleanVisible()[0],
  Section: CleanPage,
}
