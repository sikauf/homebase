import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { modules } from './modules/registry'
import { authRouter, requireAuth } from './shared/auth'

export function createApp() {
  const app = express()
  app.use(cors())
  // 2mb: the StS2 save file is ~220KB and arrives base64-encoded via /save
  app.use(express.json({ limit: '2mb' }))
  app.use('/api/auth', authRouter)
  app.use('/api', requireAuth)
  for (const m of modules) app.use(m.path, m.router)

  // Production: serve the built SPA (client/dist exists after `npm run build`).
  // Resolves to <repo>/client/dist from both src (tsx) and dist (tsc output).
  const clientDist = path.resolve(__dirname, '../../client/dist')
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
  }
  return app
}
