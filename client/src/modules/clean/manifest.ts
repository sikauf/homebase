import type { SectionManifest } from '../manifest'
import { useIsSam } from '../../auth'
import { useCleanVisible } from '../../hooks/useCleanVisible'
import CleanPage from './CleanPage'

export const manifest: SectionManifest = {
  path: '/clean',
  label: 'Clean',
  icon: '🌿',
  order: 4,
  description: 'Day tracker',
  // Sam-only: hidden from the sidebar/home for anonymous viewers (the server
  // also rejects clean reads without auth), plus the local visibility toggle.
  useVisible: () => {
    const [visible] = useCleanVisible()
    const isSam = useIsSam()
    return visible && isSam
  },
  Section: CleanPage,
}
