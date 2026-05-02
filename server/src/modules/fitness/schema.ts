import { Migration } from '../../db/migrations'

export const migrations: Migration[] = [
  {
    id: 'fitness_workouts_v1',
    up: `CREATE TABLE IF NOT EXISTS fitness_workouts (
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      PRIMARY KEY (date, type)
    )`,
  },
]
