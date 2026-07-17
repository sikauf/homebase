export interface MoodPreset {
  value: string
  label: string
  emoji: string
}

export const MOOD_PRESETS: MoodPreset[] = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'loved', label: 'Loved', emoji: '🥰' },
  { value: 'excited', label: 'Excited', emoji: '🤩' },
  { value: 'silly', label: 'Silly', emoji: '😜' },
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'sleepy', label: 'Sleepy', emoji: '😴' },
  { value: 'meh', label: 'Meh', emoji: '😐' },
  { value: 'stressed', label: 'Stressed', emoji: '😖' },
  { value: 'sad', label: 'Sad', emoji: '🥺' },
  { value: 'grumpy', label: 'Grumpy', emoji: '😤' },
]

export function moodMeta(value: string): MoodPreset {
  return (
    MOOD_PRESETS.find((m) => m.value === value) ?? { value, label: value, emoji: '💭' }
  )
}

/** 'Today' / 'Yesterday' / 'Tuesday, Jul 15' for a mood's created_at. */
export function dayLabel(createdAt: string, now: Date = new Date()): string {
  const then = new Date(createdAt)
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return then.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function timeLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
