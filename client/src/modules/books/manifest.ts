import type { SectionManifest } from '../manifest'
import CurrentlyReading from './CurrentlyReading'
import Completed from './Completed'
import Shelf from './Shelf'

export const manifest: SectionManifest = {
  path: '/books',
  label: 'Books',
  icon: '📚',
  order: 3,
  description: 'Reading & archive',
  tabs: [
    { label: 'On the Nightstand', path: 'currently-reading', Page: CurrentlyReading },
    { label: 'Archive', path: 'completed', Page: Completed },
    { label: 'Shelf', path: 'shelf', Page: Shelf },
  ],
}
