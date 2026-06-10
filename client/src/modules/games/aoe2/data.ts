export interface Mission {
  index: number
  name: string
  completed: boolean
  detected: boolean
  overridden: boolean
}

export interface Campaign {
  code: string
  name: string
  expansion: string
  completed: number
  total: number
  missions: Mission[]
}

export interface Expansion {
  id: string
  label: string
  rgb: string
  order: number
}

export interface Progress {
  saveAvailable: boolean
  expansions: Expansion[]
  campaigns: Campaign[]
}
