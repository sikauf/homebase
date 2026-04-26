import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from './helpers'

const baseUrl = setupTestServer()

async function get(path: string) { return fetch(`${baseUrl()}${path}`) }
async function post(path: string, body: unknown) {
  return fetch(`${baseUrl()}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}
async function patch(path: string, body: unknown) {
  return fetch(`${baseUrl()}${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}
async function del(path: string) { return fetch(`${baseUrl()}${path}`, { method: 'DELETE' }) }

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

describe('GET /api/golf/range-days', () => {
  it('returns an empty array initially', async () => {
    const res = await get('/api/golf/range-days')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), [])
  })
})

describe('POST /api/golf/range-days', () => {
  it('marks a range day and returns it', async () => {
    const res = await post('/api/golf/range-days', { date: '2026-04-10' })
    assert.equal(res.status, 201)
    const body = await res.json() as Record<string, unknown>
    assert.equal(body.date, '2026-04-10')
  })

  it('returns 400 when date is missing', async () => {
    assert.equal((await post('/api/golf/range-days', {})).status, 400)
  })

  it('returns 400 when date format is invalid', async () => {
    assert.equal((await post('/api/golf/range-days', { date: 'not-a-date' })).status, 400)
  })

  it('is idempotent — marking the same day twice does not error', async () => {
    await post('/api/golf/range-days', { date: '2026-04-11' })
    assert.equal((await post('/api/golf/range-days', { date: '2026-04-11' })).status, 201)
  })
})

describe('DELETE /api/golf/range-days/:date', () => {
  it('unmarks a previously marked day', async () => {
    await post('/api/golf/range-days', { date: '2026-04-12' })
    assert.equal((await del('/api/golf/range-days/2026-04-12')).status, 204)
  })

  it('returns 404 for a date that was never marked', async () => {
    assert.equal((await del('/api/golf/range-days/2030-12-31')).status, 404)
  })
})

describe('GET /api/golf/range-days after mutations', () => {
  it('returns marked dates sorted ascending', async () => {
    const body = await (await get('/api/golf/range-days')).json() as string[]
    assert.ok(body.includes('2026-04-10'))
    assert.ok(body.includes('2026-04-11'))
    assert.ok(!body.includes('2026-04-12'))
    for (let i = 1; i < body.length; i++) {
      assert.ok(body[i] >= body[i - 1])
    }
  })
})
