import type { SectionManifest } from '../manifest'
import SlayTheSpire2 from './sts2/Page'
import HadesII from './hades2/Page'
import Mewgenics from './mewgenics/Page'
import MinishootAdventures from './minishoot/Page'

export const manifest: SectionManifest = {
  path: '/games',
  label: 'Games',
  icon: '🎮',
  order: 2,
  description: 'Runs & progress',
  tabs: [
    { label: 'Slay the Spire 2', path: 'sts2', Page: SlayTheSpire2 },
    { label: 'Hades II', path: 'hades2', Page: HadesII },
    { label: 'Mewgenics', path: 'mewgenics', Page: Mewgenics },
    { label: 'Minishoot Adventures', path: 'minishoot', Page: MinishootAdventures },
  ],
  routesClassName: 'flex-1 flex p-5 bg-black min-h-0',
}
