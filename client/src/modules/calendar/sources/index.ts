import type { CalendarSource } from '../types'
import clean from './clean'
import fitness from './fitness'
import golf from './golf'
import books from './books'

// Adding a data source to the calendar = one adapter file + one entry here.
export const sources: CalendarSource[] = [clean, fitness, golf, books]
