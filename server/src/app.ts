import express from 'express'
import cors from 'cors'
import { modules } from './modules/registry'

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json())
  for (const m of modules) app.use(m.path, m.router)
  return app
}
