import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createApp } from '../app'
import db from '../db/client'

// Create schema on the in-memory DB (DB_PATH=:memory: set by test script)
before(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS golf_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course TEXT NOT NULL, tees TEXT, score INTEGER, par INTEGER DEFAULT 72,
      fairways INTEGER, gir INTEGER, putts INTEGER, notes TEXT,
      played_at TEXT DEFAULT (datetime('now'))
    )
  `)
})

const app = createApp()
let server: http.Server
let base: string

before(() => new Promise<void>((resolve) => {
  server = app.listen(0, () => {
    base = `http://localhost:${(server.address() as { port: number }).port}`
    resolve()
  })
}))

after(() => new Promise<void>((resolve, reject) => {
  server.close((err) => err ? reject(err) : resolve())
}))

async function get(path: string) { return fetch(`${base}${path}`) }
async function post(path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}
async function patch(path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}
async function del(path: string) { return fetch(`${base}${path}`, { method: 'DELETE' }) }

describe('GET /api/golf/rounds', () => {
  it('returns an empty array when no rounds exist', async () => {
    const res = await get('/api/golf/rounds')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), [])
  })
})

describe('POST /api/golf/rounds', () => {
  it('creates a round and returns it', async () => {
    const res = await post('/api/golf/rounds', { course: 'Augusta National', score: 72, par: 72, putts: 28 })
    assert.equal(res.status, 201)
    const body = await res.json() as { course: string; score: number; id: number }
    assert.equal(body.course, 'Augusta National')
    assert.equal(body.score, 72)
    assert.ok(body.id)
  })

  it('returns 400 when course is missing', async () => {
    const res = await post('/api/golf/rounds', { score: 80 })
    assert.equal(res.status, 400)
    assert.ok((await res.json() as { error: string }).error)
  })
})

describe('GET /api/golf/stats', () => {
  it('returns stats with expected fields', async () => {
    const res = await get('/api/golf/stats')
    assert.equal(res.status, 200)
    const body = await res.json() as Record<string, unknown>
    assert.ok('total_rounds' in body)
    assert.ok('best_score' in body)
    assert.ok('avg_score' in body)
  })
})

describe('PATCH /api/golf/rounds/:id', () => {
  it('updates a field and preserves others', async () => {
    const { id } = await (await post('/api/golf/rounds', { course: 'Original', score: 85 })).json() as { id: number }
    const res = await patch(`/api/golf/rounds/${id}`, { score: 79 })
    assert.equal(res.status, 200)
    const body = await res.json() as { score: number; course: string }
    assert.equal(body.score, 79)
    assert.equal(body.course, 'Original')
  })

  it('returns 404 for a non-existent round', async () => {
    assert.equal((await patch('/api/golf/rounds/99999', { score: 79 })).status, 404)
  })
})

describe('DELETE /api/golf/rounds/:id', () => {
  it('deletes an existing round', async () => {
    const { id } = await (await post('/api/golf/rounds', { course: 'To Delete', score: 90 })).json() as { id: number }
    assert.equal((await del(`/api/golf/rounds/${id}`)).status, 204)
  })

  it('returns 404 for a non-existent round', async () => {
    assert.equal((await del('/api/golf/rounds/99999')).status, 404)
  })
})
