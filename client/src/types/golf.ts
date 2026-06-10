export interface GolfRound {
  id: number
  course: string
  tees: string | null
  score: number | null
  par: number
  birdies: number | null
  gir: number | null
  putts: number | null
  notes: string | null
  played_at: string
  holes: number
}

export interface GolfStats {
  total_rounds: number
  best_score: number | null
  avg_score: number | null
  avg_putts: number | null
  avg_gir: number | null
  avg_birdies: number | null
}

export interface CreateRoundPayload {
  course: string
  tees?: string | null
  score?: number | null
  par?: number
  birdies?: number | null
  gir?: number | null
  putts?: number | null
  notes?: string | null
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

export interface GolfTrip {
  id: number
  name: string
  location: string | null
  start_date: string
  end_date: string
  courses: string[]
}

export interface CreateTripPayload {
  name: string
  location?: string
  start_date: string
  end_date: string
  courses: string[]
}
