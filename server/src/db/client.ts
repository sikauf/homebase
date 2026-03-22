import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'

const rawPath = process.env.DB_PATH ?? path.resolve(__dirname, '../../../data/homebase.db')
const inMemory = rawPath === ':memory:'
const dbPath = inMemory ? ':memory:' : path.resolve(rawPath)

if (!inMemory) {
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const db = new DatabaseSync(dbPath)
if (!inMemory) {
  db.exec("PRAGMA journal_mode = WAL")
}

export default db
