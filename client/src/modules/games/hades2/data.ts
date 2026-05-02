import { GameItem } from '../_shared/types'

export type Weapon = GameItem

export interface Boss {
  id: string
  name: string
  image: string
}

export const WEAPONS: Weapon[] = [
  { id: 'witch_staff',   name: "Witch's Staff", image: '/games/hades2/weapons/witch_staff.webp',   rgb: '200,140,255' },
  { id: 'sister_blades', name: 'Sister Blades', image: '/games/hades2/weapons/sister_blades.webp', rgb: '110,190,255' },
  { id: 'umbral_flames', name: 'Umbral Flames', image: '/games/hades2/weapons/umbral_flames.webp', rgb: '255,150,90'  },
  { id: 'moonstone_axe', name: 'Moonstone Axe', image: '/games/hades2/weapons/moonstone_axe.webp', rgb: '200,215,255' },
  { id: 'argent_skull',  name: 'Argent Skull',  image: '/games/hades2/weapons/argent_skull.webp',  rgb: '230,210,170' },
  { id: 'black_coat',    name: 'Black Coat',    image: '/games/hades2/weapons/black_coat.webp',    rgb: '210,110,110' },
]

export const BOSSES: Record<string, Boss> = {
  polyphemus: { id: 'polyphemus', name: 'Polyphemus', image: '/games/hades2/bosses/polyphemus.webp' },
  eris:       { id: 'eris',       name: 'Eris',       image: '/games/hades2/bosses/eris.webp' },
  prometheus: { id: 'prometheus', name: 'Prometheus', image: '/games/hades2/bosses/prometheus.webp' },
  typhon:     { id: 'typhon',     name: 'Typhon',     image: '/games/hades2/bosses/typhon.webp' },
  hecate:     { id: 'hecate',     name: 'Hecate',     image: '/games/hades2/bosses/hecate.webp' },
  scylla:     { id: 'scylla',     name: 'Scylla',     image: '/games/hades2/bosses/scylla.webp' },
  cerberus:   { id: 'cerberus',   name: 'Cerberus',   image: '/games/hades2/bosses/cerberus.webp' },
  chronos:    { id: 'chronos',    name: 'Chronos',    image: '/games/hades2/bosses/chronos.webp' },
}

// Surface ascends Polyphemus -> Eris -> Prometheus -> Typhon (first encountered to final).
// In the modal, displayed bottom-to-top so arrows point upward.
export const SURFACE_ORDER = ['polyphemus', 'eris', 'prometheus', 'typhon']

// Underground descends Hecate -> Scylla -> Cerberus -> Chronos (first encountered to final).
// In the modal, displayed top-to-bottom so arrows point downward.
export const UNDERGROUND_ORDER = ['hecate', 'scylla', 'cerberus', 'chronos']

export const TOTAL_BOSSES = SURFACE_ORDER.length + UNDERGROUND_ORDER.length
