import { migrations as golf } from './golf/schema'
import { migrations as clean } from './clean/schema'
import { migrations as fitness } from './fitness/schema'
import { migrations as books } from './books/schema'
import { migrations as exportSchema } from './export/schema'
import { migrations as hades2 } from './games/hades2/schema'
import { migrations as sts2 } from './games/sts2/schema'
import { migrations as backlog } from './backlog/schema'

export const allMigrations = [
  ...golf,
  ...clean,
  ...fitness,
  ...books,
  ...exportSchema,
  ...hades2,
  ...sts2,
  ...backlog,
]
