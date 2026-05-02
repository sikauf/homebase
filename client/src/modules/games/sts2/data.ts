export interface Sts2CharacterConfig {
  image: string
  objPos: string
  color: string
  rgb: string
}

export const CONFIG: Record<string, Sts2CharacterConfig> = {
  'CHARACTER.IRONCLAD':    { image: '/games/sts2/ironclad.png',    objPos: '38% 0%',  color: '#f87171', rgb: '248,113,113' },
  'CHARACTER.SILENT':      { image: '/games/sts2/silent.png',      objPos: '22% 0%',  color: '#4ade80', rgb: '74,222,128'  },
  'CHARACTER.DEFECT':      { image: '/games/sts2/defect.png',      objPos: '68% 0%',  color: '#60a5fa', rgb: '96,165,250'  },
  'CHARACTER.REGENT':      { image: '/games/sts2/regent.png',      objPos: '50% 0%',  color: '#fb923c', rgb: '251,146,60'  },
  'CHARACTER.NECROBINDER': { image: '/games/sts2/necrobinder.png', objPos: '55% 0%',  color: '#c084fc', rgb: '192,132,252' },
}
