export const CALCULATOR_URL =
  'https://hzla.github.io/Dynamic-Calc-Decomps/?data=renegadeplatinum&view=calculator'
export const DOCS_URL =
  'https://docs.google.com/spreadsheets/d/1G3MNevhLmW1sKYluM4WT9TM1RqrTAi1c4lIdTfeU-Jg/edit?gid=515626425#gid=515626425'

/** Sprites are vendored per national dex number (see client/public/games/renplat). */
export const spriteUrl = (species: number) => `/games/renplat/sprites/${species}.png`

/** Vendored trainer sprites, in `client/public/games/renplat/trainers/`. */
const TRAINER_SPRITES = [
  'crasherwake', 'roark', 'gardenia', 'maylene', 'fantina', 'byron', 'candice', 'volkner',
  'aaron', 'bertha', 'flint', 'lucian', 'cynthia', 'cyrus', 'mars', 'jupiter', 'saturn',
  'barry', 'dawn',
  // Sinnoh's partner characters — Renegade Platinum turns some of them into fights.
  'cheryl', 'mira', 'riley', 'buck', 'marley',
]

/**
 * Picks a trainer sprite from the fight's name rather than a stored column, so
 * fights you add by hand ("Barry — Canalave", "Cyrus rematch") get art for free.
 * Longest match wins, so "Crasher Wake" doesn't resolve to nothing and
 * "Mars & Jupiter" lands on Mars.
 */
export function trainerSpriteUrl(name: string): string | null {
  const needle = name.toLowerCase().replace(/[^a-z]/g, '')
  const hit = TRAINER_SPRITES.filter((t) => needle.includes(t)).sort((a, b) => b.length - a.length)[0]
  return hit ? `/games/renplat/trainers/${hit}.png` : null
}

// Type palette, darkened from the canonical hues so white text sits on it cleanly.
export const TYPE_COLORS: Record<string, string> = {
  Normal: '#8f8f76',
  Fire: '#c4542a',
  Water: '#4a72c4',
  Electric: '#c4a520',
  Grass: '#5d9b3e',
  Ice: '#63a8a8',
  Fighting: '#a3301f',
  Poison: '#7b3a7b',
  Ground: '#a8853f',
  Flying: '#7a6bc4',
  Psychic: '#c43f6b',
  Bug: '#7b8f1b',
  Rock: '#9b8535',
  Ghost: '#5c4a86',
  Dragon: '#5c2fc4',
  Dark: '#5c4a3f',
  Steel: '#7b7b95',
  Fairy: '#b56b9b',
}

export const typeColor = (type: string) => TYPE_COLORS[type] ?? '#6b6b6b'

export function formatPlaytime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Order drives the outcome dropdown; Fainted leads because it's the default.
export const OUTCOME_LABELS: Record<string, string> = {
  fainted: 'Fainted',
  fled: 'Fled',
  dupe: 'Dupe — skipped',
}

/** Sinnoh's routes and towns, for the "lost an encounter" location picker. */
export const SINNOH_LOCATIONS = [
  'Twinleaf Town', 'Sandgem Town', 'Jubilife City', 'Oreburgh City', 'Floaroma Town',
  'Eterna City', 'Hearthome City', 'Solaceon Town', 'Veilstone City', 'Pastoria City',
  'Celestic Town', 'Canalave City', 'Snowpoint City', 'Sunyshore City', 'Fight Area',
  'Survival Area', 'Resort Area',
  'Route 201', 'Route 202', 'Route 203', 'Route 204', 'Route 205', 'Route 206',
  'Route 207', 'Route 208', 'Route 209', 'Route 210', 'Route 211', 'Route 212',
  'Route 213', 'Route 214', 'Route 215', 'Route 216', 'Route 217', 'Route 218',
  'Route 219', 'Route 220', 'Route 221', 'Route 222', 'Route 223', 'Route 224',
  'Route 225', 'Route 226', 'Route 227', 'Route 228', 'Route 229', 'Route 230',
  'Oreburgh Mine', 'Oreburgh Gate', 'Valley Windworks', 'Eterna Forest',
  'Fuego Ironworks', 'Mt. Coronet', 'Great Marsh', 'Solaceon Ruins',
  'Victory Road', 'Ravaged Path', 'Floaroma Meadow', 'Iron Island',
  'Lake Verity', 'Lake Valor', 'Lake Acuity', 'Wayward Cave', 'Stark Mountain',
  'Distortion World', 'Turnback Cave', 'Sendoff Spring', 'Trophy Garden',
  'Amity Square', 'Old Chateau',
]
