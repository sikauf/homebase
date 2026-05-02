import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from '../../shared/test-helpers'

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

describe('GET /api/golf/tee-times', () => {
  it('returns an empty array when no tee times exist', async () => {
    const res = await get('/api/golf/tee-times')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), [])
  })
})

describe('POST /api/golf/tee-times', () => {
  it('creates a tee time and returns it with an id', async () => {
    const res = await post('/api/golf/tee-times', { course: 'Bergen Point', date: '2026-06-15' })
    assert.equal(res.status, 201)
    const body = await res.json() as { id: number; course: string; date: string }
    assert.ok(body.id)
    assert.equal(body.course, 'Bergen Point')
    assert.equal(body.date, '2026-06-15')
  })

  it('trims whitespace from course', async () => {
    const res = await post('/api/golf/tee-times', { course: '  Lido Beach  ', date: '2026-07-01' })
    assert.equal(res.status, 201)
    const body = await res.json() as { course: string }
    assert.equal(body.course, 'Lido Beach')
  })

  it('returns 400 when course is missing', async () => {
    const res = await post('/api/golf/tee-times', { date: '2026-06-15' })
    assert.equal(res.status, 400)
  })

  it('returns 400 when course is empty', async () => {
    const res = await post('/api/golf/tee-times', { course: '   ', date: '2026-06-15' })
    assert.equal(res.status, 400)
  })

  it('returns 400 when date is missing', async () => {
    const res = await post('/api/golf/tee-times', { course: 'Lido Beach' })
    assert.equal(res.status, 400)
  })

  it('returns 400 when date format is invalid', async () => {
    const res = await post('/api/golf/tee-times', { course: 'Lido Beach', date: '06/15/2026' })
    assert.equal(res.status, 400)
  })
})

describe('GET /api/golf/tee-times after mutations', () => {
  it('returns tee times sorted by date ascending', async () => {
    await post('/api/golf/tee-times', { course: 'A', date: '2026-08-01' })
    await post('/api/golf/tee-times', { course: 'B', date: '2026-05-01' })
    const body = await (await get('/api/golf/tee-times')).json() as { date: string }[]
    for (let i = 1; i < body.length; i++) {
      assert.ok(body[i].date >= body[i - 1].date)
    }
  })
})

describe('DELETE /api/golf/tee-times/:id', () => {
  it('deletes an existing tee time', async () => {
    const created = await (await post('/api/golf/tee-times', { course: 'Crab Meadow', date: '2026-09-01' })).json() as { id: number }
    const res = await del(`/api/golf/tee-times/${created.id}`)
    assert.equal(res.status, 204)
  })

  it('returns 404 for a non-existent id', async () => {
    const res = await del('/api/golf/tee-times/999999')
    assert.equal(res.status, 404)
  })
})
