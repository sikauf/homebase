// Age of Empires II: Definitive Edition campaign catalogue.
//
// `code` is the campaign's internal id as it appears in the player profile
// (`Player.nfp`) — that's the key used to read progress out of the save. The
// names/groupings below are a best-effort mapping of those codes to the real
// campaigns and are safe to edit: changing a name or mission list here is the
// only thing needed to fix a mislabelled campaign. Joan of Arc (`cam1`) is the
// one verified against real progress; the others are reasoned from the profile
// layout and the published expansion line-ups.

export interface Expansion {
  id: string
  label: string
  rgb: string // "r,g,b" — accent colour for this expansion's cards
  order: number
}

export interface Campaign {
  code: string // internal id in Player.nfp (e.g. "cam1")
  name: string
  expansion: string // Expansion.id
  // Real per-mission names where known; otherwise `missionCount` drives a
  // generated "Scenario N" list.
  missionNames?: string[]
  missionCount?: number
}

export const EXPANSIONS: Expansion[] = [
  { id: 'aok', label: 'The Age of Kings', rgb: '96,165,235', order: 0 },
  { id: 'aoc', label: 'The Conquerors', rgb: '210,92,80', order: 1 },
  { id: 'forgotten', label: 'The Forgotten', rgb: '168,130,225', order: 2 },
  { id: 'african', label: 'The African Kingdoms', rgb: '224,170,80', order: 3 },
  { id: 'rajas', label: 'Rise of the Rajas', rgb: '90,200,180', order: 4 },
  { id: 'khans', label: 'The Last Khans', rgb: '220,140,70', order: 5 },
  { id: 'west', label: 'Lords of the West', rgb: '150,170,195', order: 6 },
  { id: 'dukes', label: 'Dawn of the Dukes', rgb: '212,120,150', order: 7 },
  { id: 'india', label: 'Dynasties of India', rgb: '200,100,180', order: 8 },
]

export const CAMPAIGNS: Campaign[] = [
  // —— The Age of Kings (base) ——
  { code: 'cam0', name: 'William Wallace', expansion: 'aok', missionCount: 6 },
  {
    code: 'cam1',
    name: 'Joan of Arc',
    expansion: 'aok',
    missionNames: [
      'An Unlikely Messiah',
      'The Maid of Orléans',
      'The Cleansing of the Loire',
      'The Rising',
      'The Siege of Paris',
      'A Perfect Martyr',
    ],
  },
  { code: 'cam2', name: 'Saladin', expansion: 'aok', missionCount: 6 },
  { code: 'cam3', name: 'Genghis Khan', expansion: 'aok', missionCount: 6 },
  { code: 'cam4', name: 'Barbarossa', expansion: 'aok', missionCount: 5 },
  { code: 'cam5', name: 'The Conquerors', expansion: 'aok', missionCount: 6 },

  // —— The Conquerors ——
  { code: 'acam1', name: 'Attila the Hun', expansion: 'aoc', missionCount: 6 },
  { code: 'acam2', name: 'El Cid', expansion: 'aoc', missionCount: 6 },
  { code: 'acam3', name: 'Montezuma', expansion: 'aoc', missionCount: 6 },
  { code: 'acam4', name: 'Battles of the Conquerors', expansion: 'aoc', missionCount: 8 },

  // —— The Forgotten ——
  { code: 'fcam1', name: 'Alaric', expansion: 'forgotten', missionCount: 5 },
  { code: 'fcam2', name: 'Sforza', expansion: 'forgotten', missionCount: 5 },
  { code: 'fcam3', name: 'Bari', expansion: 'forgotten', missionCount: 5 },
  { code: 'fcam4', name: 'El Dorado', expansion: 'forgotten', missionCount: 5 },
  { code: 'fcam5', name: 'Sundjata', expansion: 'forgotten', missionCount: 5 },
  { code: 'fcam6', name: 'Dracula', expansion: 'forgotten', missionCount: 5 },
  { code: 'fcam7', name: 'Prithviraj', expansion: 'forgotten', missionCount: 6 },

  // —— The African Kingdoms ——
  { code: 'rcam1', name: 'Tariq ibn Ziyad', expansion: 'african', missionCount: 5 },
  { code: 'rcam2', name: 'Sundjata', expansion: 'african', missionCount: 5 },
  { code: 'rcam3', name: 'Francisco de Almeida', expansion: 'african', missionCount: 5 },
  { code: 'rcam4', name: 'Yodit', expansion: 'african', missionCount: 5 },

  // —— Rise of the Rajas ——
  { code: 'kcam1', name: 'Gajah Mada', expansion: 'rajas', missionCount: 5 },
  { code: 'kcam2', name: 'Suryavarman I', expansion: 'rajas', missionCount: 5 },
  { code: 'kcam3', name: 'Bayinnaung', expansion: 'rajas', missionCount: 5 },

  // —— The Last Khans ——
  { code: 'incam1', name: 'Tamerlane', expansion: 'khans', missionCount: 4 },
  { code: 'incam2', name: 'Ismail', expansion: 'khans', missionCount: 5 },
  { code: 'incam3', name: 'Kotyan Khan', expansion: 'khans', missionCount: 5 },

  // —— Lords of the West ——
  { code: 'wecam1', name: 'Edward Longshanks', expansion: 'west', missionCount: 6 },
  { code: 'wecam2', name: 'Grand Dukes of the West', expansion: 'west', missionCount: 5 },
  { code: 'wecam3', name: 'The Hautevilles', expansion: 'west', missionCount: 6 },

  // —— Dawn of the Dukes ——
  { code: 'eecam1', name: 'Algirdas and Kestutis', expansion: 'dukes', missionCount: 5 },
  { code: 'eecam2', name: 'Jadwiga', expansion: 'dukes', missionCount: 5 },
  { code: 'eecam3', name: 'Jan Žižka', expansion: 'dukes', missionCount: 6 },

  // —— Dynasties of India ——
  { code: 'xcam1', name: 'Babur', expansion: 'india', missionCount: 5 },
  { code: 'xcam2', name: 'Rajendra Chola', expansion: 'india', missionCount: 5 },
  { code: 'xcam3', name: 'Devapala', expansion: 'india', missionCount: 5 },
]

export function missionList(c: Campaign): string[] {
  if (c.missionNames) return c.missionNames
  const n = c.missionCount ?? 5
  return Array.from({ length: n }, (_, i) => `Scenario ${i + 1}`)
}
