export interface BacklogItem {
  id: number
  text: string
  section: string | null
  tab: string | null
  status: 'open' | 'done'
  created_at: string
  completed_at: string | null
}
