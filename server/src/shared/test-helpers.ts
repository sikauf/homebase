import http from 'node:http'
import { before, after } from 'node:test'
import { createApp } from '../app'

export function setupTestServer(): () => string {
  let server: http.Server
  let base = ''
  before(() => new Promise<void>((resolve) => {
    server = createApp().listen(0, () => {
      base = `http://localhost:${(server.address() as { port: number }).port}`
      resolve()
    })
  }))
  after(() => new Promise<void>((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve())
  }))
  return () => base
}
