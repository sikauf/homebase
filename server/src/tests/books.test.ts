import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createApp } from '../app'

let server: http.Server
let base: string

before(() => new Promise<void>((resolve) => {
  server = createApp().listen(0, () => {
    base = `http://localhost:${(server.address() as { port: number }).port}`
    resolve()
  })
}))

after(() => new Promise<void>((resolve, reject) => {
  server.close((err) => err ? reject(err) : resolve())
}))

describe('GET /api/books/profile', () => {
  it('returns 503 when HARDCOVER_API_TOKEN is not set', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    delete process.env.HARDCOVER_API_TOKEN
    const res = await fetch(`${base}/api/books/profile`)
    assert.equal(res.status, 503)
    process.env.HARDCOVER_API_TOKEN = orig
  })
})

describe('GET /api/books/currently-reading', () => {
  it('returns 503 when HARDCOVER_API_TOKEN is not set', async () => {
    const orig = process.env.HARDCOVER_API_TOKEN
    delete process.env.HARDCOVER_API_TOKEN
    const res = await fetch(`${base}/api/books/currently-reading`)
    assert.equal(res.status, 503)
    process.env.HARDCOVER_API_TOKEN = orig
  })
})
