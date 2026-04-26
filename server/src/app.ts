import express from 'express'
import cors from 'cors'
import golfRouter from './routes/golf'
import gamesRouter from './routes/games'
import booksRouter from './routes/books'
import cleanRouter from './routes/clean'
import fitnessRouter from './routes/fitness'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api/golf', golfRouter)
  app.use('/api/games', gamesRouter)
  app.use('/api/books', booksRouter)
  app.use('/api/clean', cleanRouter)
  app.use('/api/fitness', fitnessRouter)
  return app
}
