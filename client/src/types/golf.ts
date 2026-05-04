export interface GolfRound {
  id: number
  course: string
  tees: string | null
  score: number | null
  par: number
  fairways: number | null
  gir: number | null
  putts: number | null
  notes: string | null
  played_at: string
  holes: number
}

export interface GolfStatsBucket {
  total_rounds: number
  best_score: number | null
  avg_score: number | null
  avg_putts: number | null
  avg_gir: number | null
  avg_fairways: number | null
}

export interface GolfStats {
  eighteen: GolfStatsBucket
  nine: GolfStatsBucket
}

export interface CreateRoundPayload {
  course: string
  tees?: string
  score?: number
  par?: number
  fairways?: number
  gir?: number
  putts?: number
  notes?: string
  played_at?: string
  holes?: number
}

export interface TeeTime {
  id: number
  course: string
  date: string
}

export interface CreateTeeTimePayload {
  course: string
  date: string
}
