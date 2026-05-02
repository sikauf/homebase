import type { SectionManifest } from '../manifest'
import Rounds from './Rounds'
import RangePage from './RangePage'

export const manifest: SectionManifest = {
  path: '/golf',
  label: 'Golf',
  icon: '⛳',
  order: 1,
  description: 'Rounds & stats',
  tabs: [
    { label: 'Rounds', path: 'rounds', Page: Rounds },
    { label: 'Range', path: 'range', Page: RangePage },
  ],
}
