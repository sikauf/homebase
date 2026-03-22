import express from 'express'
import cors from 'cors'
import golfRouter from './routes/golf'
import gamesRouter from './routes/games'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api/golf', golfRouter)
  app.use('/api/games', gamesRouter)
  return app
}
