import type { ServerModule } from './types'
import golf from './golf'
import clean from './clean'
import fitness from './fitness'
import books from './books'
import games from './games'
import backlog from './backlog'
import exportModule from './export'

export const modules: ServerModule[] = [golf, clean, fitness, books, games, backlog, exportModule]
