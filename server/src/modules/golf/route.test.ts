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
    const body = await res.json() as { course: string; score: number; id: number; holes: number; par: number }
    assert.equal(body.course, 'Augusta National')
    assert.equal(body.score, 72)
    assert.ok(body.id)
    assert.equal(body.holes, 18)
    assert.equal(body.par, 72)
  })

  it('returns 400 when course is missing', async () => {
    const res = await post('/api/golf/rounds', { score: 80 })
    assert.equal(res.status, 400)
    assert.ok((await res.json() as { error: string }).error)
  })

  it('creates a 9-hole round with default par 36', async () => {
    const res = await post('/api/golf/rounds', { course: 'Local Par 3', holes: 9, score: 40 })
    assert.equal(res.status, 201)
    const body = await res.json() as { holes: number; par: number; score: number }
    assert.equal(body.holes, 9)
    assert.equal(body.par, 36)
    assert.equal(body.score, 40)
  })

  it('honors explicit par for 9-hole rounds', async () => {
    const res = await post('/api/golf/rounds', { course: 'Par 3 Course', holes: 9, par: 27, score: 32 })
    assert.equal(res.status, 201)
    const body = await res.json() as { holes: number; par: number }
    assert.equal(body.holes, 9)
    assert.equal(body.par, 27)
  })

  it('accepts arbitrary hole counts under 18 with par scaling', async () => {
    const res = await post('/api/golf/rounds', { course: 'Quick 7', holes: 7, score: 32 })
    assert.equal(res.status, 201)
    const body = await res.json() as { holes: number; par: number }
    assert.equal(body.holes, 7)
    assert.equal(body.par, 28)
  })

  it('persists birdies on a created round', async () => {
    const res = await post('/api/golf/rounds', { course: 'Birdie Hunt', score: 70, birdies: 4 })
    assert.equal(res.status, 201)
    const body = await res.json() as { birdies: number }
    assert.equal(body.birdies, 4)
  })

  it('persists and returns birdies on 9-hole rounds', async () => {
    const created = await post('/api/golf/rounds', { course: 'Quick Nine', holes: 9, score: 38, birdies: 2 })
    assert.equal(created.status, 201)
    const body = await created.json() as { id: number; holes: number; birdies: number }
    assert.equal(body.holes, 9)
    assert.equal(body.birdies, 2)
    const listed = await (await get('/api/golf/rounds')).json() as { id: number; birdies: number }[]
    const found = listed.find((r) => r.id === body.id)
    assert.ok(found)
    assert.equal(found!.birdies, 2)
  })

  it('rejects holes outside 1-18', async () => {
    assert.equal((await post('/api/golf/rounds', { course: 'X', holes: 0 })).status, 400)
    assert.equal((await post('/api/golf/rounds', { course: 'X', holes: 19 })).status, 400)
    assert.equal((await post('/api/golf/rounds', { course: 'X', holes: 1.5 })).status, 400)
  })
})

describe('GET /api/golf/stats', () => {
  it('returns stats for 18-hole rounds', async () => {
    const res = await get('/api/golf/stats')
    assert.equal(res.status, 200)
    const body = await res.json() as Record<string, unknown>
    assert.ok('total_rounds' in body)
    assert.ok('best_score' in body)
    assert.ok('avg_score' in body)
  })

  it('counts only 18-hole rounds', async () => {
    const before = await (await get('/api/golf/stats')).json() as { total_rounds: number }
    await post('/api/golf/rounds', { course: 'X18', holes: 18, score: 90 })
    await post('/api/golf/rounds', { course: 'X9', holes: 9, score: 45 })
    await post('/api/golf/rounds', { course: 'Twilight 7', holes: 7, score: 30 })
    const after = await (await get('/api/golf/stats')).json() as { total_rounds: number }
    assert.equal(after.total_rounds, before.total_rounds + 1)
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

  it('updates birdies and holes on an existing round', async () => {
    const { id } = await (await post('/api/golf/rounds', { course: 'Patch Birdies', score: 40, holes: 9 })).json() as { id: number }
    const res = await patch(`/api/golf/rounds/${id}`, { birdies: 3, holes: 18, score: 78 })
    assert.equal(res.status, 200)
    const body = await res.json() as { birdies: number; holes: number; score: number }
    assert.equal(body.birdies, 3)
    assert.equal(body.holes, 18)
    assert.equal(body.score, 78)
  })

  it('clears an optional field when patched to null', async () => {
    const { id } = await (await post('/api/golf/rounds', { course: 'Clear Putts', score: 90, putts: 32 })).json() as { id: number }
    const res = await patch(`/api/golf/rounds/${id}`, { putts: null })
    assert.equal(res.status, 200)
    const body = await res.json() as { putts: number | null }
    assert.equal(body.putts, null)
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
  it('marks a range day with a type and returns it', async () => {
    const res = await post('/api/golf/range-days', { date: '2026-04-10', type: 'ball_striking' })
    assert.equal(res.status, 201)
    const body = await res.json() as { date: string; type: string }
    assert.equal(body.date, '2026-04-10')
    assert.equal(body.type, 'ball_striking')
  })

  it('returns 400 when date is missing', async () => {
    assert.equal((await post('/api/golf/range-days', { type: 'putting' })).status, 400)
  })

  it('returns 400 when date format is invalid', async () => {
    assert.equal((await post('/api/golf/range-days', { date: 'not-a-date', type: 'putting' })).status, 400)
  })

  it('returns 400 when type is missing', async () => {
    assert.equal((await post('/api/golf/range-days', { date: '2026-04-10' })).status, 400)
  })

  it('returns 400 when type is invalid', async () => {
    assert.equal((await post('/api/golf/range-days', { date: '2026-04-10', type: 'driving' })).status, 400)
  })

  it('is idempotent — marking the same (date, type) twice does not error', async () => {
    await post('/api/golf/range-days', { date: '2026-04-11', type: 'putting' })
    assert.equal((await post('/api/golf/range-days', { date: '2026-04-11', type: 'putting' })).status, 201)
  })

  it('allows multiple types on the same day', async () => {
    await post('/api/golf/range-days', { date: '2026-04-13', type: 'ball_striking' })
    await post('/api/golf/range-days', { date: '2026-04-13', type: 'putting' })
    const res = await post('/api/golf/range-days', { date: '2026-04-13', type: 'chipping' })
    assert.equal(res.status, 201)
  })
})

describe('DELETE /api/golf/range-days/:date/:type', () => {
  it('unmarks a previously marked (date, type)', async () => {
    await post('/api/golf/range-days', { date: '2026-04-12', type: 'chipping' })
    assert.equal((await del('/api/golf/range-days/2026-04-12/chipping')).status, 204)
  })

  it('only removes the specified type, leaving other types for that date', async () => {
    await post('/api/golf/range-days', { date: '2026-04-14', type: 'ball_striking' })
    await post('/api/golf/range-days', { date: '2026-04-14', type: 'putting' })
    assert.equal((await del('/api/golf/range-days/2026-04-14/ball_striking')).status, 204)
    const body = await (await get('/api/golf/range-days')).json() as { date: string; types: string[] }[]
    const entry = body.find((d) => d.date === '2026-04-14')
    assert.ok(entry)
    assert.deepEqual(entry!.types, ['putting'])
  })

  it('returns 404 for a (date, type) that was never marked', async () => {
    assert.equal((await del('/api/golf/range-days/2030-12-31/putting')).status, 404)
  })

  it('returns 400 for an invalid type', async () => {
    assert.equal((await del('/api/golf/range-days/2026-04-12/driving')).status, 400)
  })
})

describe('GET /api/golf/range-days after mutations', () => {
  it('returns grouped entries with date and types, sorted by date ascending', async () => {
    const body = await (await get('/api/golf/range-days')).json() as { date: string; types: string[] }[]
    const dates = body.map((e) => e.date)
    assert.ok(dates.includes('2026-04-10'))
    assert.ok(dates.includes('2026-04-11'))
    assert.ok(!dates.includes('2026-04-12'))
    const apr13 = body.find((e) => e.date === '2026-04-13')
    assert.ok(apr13)
    assert.deepEqual([...apr13!.types].sort(), ['ball_striking', 'chipping', 'putting'])
    for (let i = 1; i < dates.length; i++) {
      assert.ok(dates[i] >= dates[i - 1])
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

function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function pastDate(daysAgo: number): string {
  return futureDate(-daysAgo)
}

describe('POST /api/golf/tee-times', () => {
  it('creates a tee time and returns it with an id', async () => {
    const date = futureDate(30)
    const res = await post('/api/golf/tee-times', { course: 'Bergen Point', date })
    assert.equal(res.status, 201)
    const body = await res.json() as { id: number; course: string; date: string }
    assert.ok(body.id)
    assert.equal(body.course, 'Bergen Point')
    assert.equal(body.date, date)
  })

  it('trims whitespace from course', async () => {
    const res = await post('/api/golf/tee-times', { course: '  Lido Beach  ', date: futureDate(45) })
    assert.equal(res.status, 201)
    const body = await res.json() as { course: string }
    assert.equal(body.course, 'Lido Beach')
  })

  it('returns 400 when course is missing', async () => {
    const res = await post('/api/golf/tee-times', { date: futureDate(30) })
    assert.equal(res.status, 400)
  })

  it('returns 400 when course is empty', async () => {
    const res = await post('/api/golf/tee-times', { course: '   ', date: futureDate(30) })
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

  it('rejects dates in the past', async () => {
    const res = await post('/api/golf/tee-times', { course: 'Past Course', date: pastDate(1) })
    assert.equal(res.status, 400)
  })

  it('accepts today as the date', async () => {
    const res = await post('/api/golf/tee-times', { course: 'Today Course', date: futureDate(0) })
    assert.equal(res.status, 201)
  })
})

describe('GET /api/golf/tee-times after mutations', () => {
  it('returns tee times sorted by date ascending', async () => {
    await post('/api/golf/tee-times', { course: 'A', date: futureDate(120) })
    await post('/api/golf/tee-times', { course: 'B', date: futureDate(60) })
    const body = await (await get('/api/golf/tee-times')).json() as { date: string }[]
    for (let i = 1; i < body.length; i++) {
      assert.ok(body[i].date >= body[i - 1].date)
    }
  })
})

describe('DELETE /api/golf/tee-times/:id', () => {
  it('deletes an existing tee time', async () => {
    const created = await (await post('/api/golf/tee-times', { course: 'Crab Meadow', date: futureDate(90) })).json() as { id: number }
    const res = await del(`/api/golf/tee-times/${created.id}`)
    assert.equal(res.status, 204)
  })

  it('returns 404 for a non-existent id', async () => {
    const res = await del('/api/golf/tee-times/999999')
    assert.equal(res.status, 404)
  })
})
