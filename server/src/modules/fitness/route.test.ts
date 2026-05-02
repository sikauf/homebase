import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from '../../shared/test-helpers'

const baseUrl = setupTestServer()

describe('GET /api/fitness/workouts', () => {
  it('returns an empty array when no workouts are logged', async () => {
    const res = await fetch(`${baseUrl()}/api/fitness/workouts`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), [])
  })
})

describe('POST /api/fitness/workouts', () => {
  it('logs a workout and returns it', async () => {
    const res = await fetch(`${baseUrl()}/api/fitness/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-01-15', type: 'core' }),
    })
    assert.equal(res.status, 201)
    const body = await res.json() as Record<string, unknown>
    assert.equal(body.date, '2026-01-15')
    assert.equal(body.type, 'core')
  })

  it('can log multiple types on the same day', async () => {
    for (const type of ['cardio', 'legs']) {
      const res = await fetch(`${baseUrl()}/api/fitness/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: '2026-01-15', type }),
      })
      assert.equal(res.status, 201)
    }
  })

  it('returns 400 when date is missing', async () => {
    const res = await fetch(`${baseUrl()}/api/fitness/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'core' }),
    })
    assert.equal(res.status, 400)
  })

  it('returns 400 when date format is invalid', async () => {
    const res = await fetch(`${baseUrl()}/api/fitness/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: 'not-a-date', type: 'core' }),
    })
    assert.equal(res.status, 400)
  })

  it('returns 400 when type is invalid', async () => {
    const res = await fetch(`${baseUrl()}/api/fitness/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-01-15', type: 'badtype' }),
    })
    assert.equal(res.status, 400)
  })

  it('is idempotent — logging the same workout twice does not error', async () => {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-02-01', type: 'biceps' }),
    }
    await fetch(`${baseUrl()}/api/fitness/workouts`, opts)
    const res = await fetch(`${baseUrl()}/api/fitness/workouts`, opts)
    assert.equal(res.status, 201)
  })
})

describe('DELETE /api/fitness/workouts/:date/:type', () => {
  it('removes a logged workout', async () => {
    await fetch(`${baseUrl()}/api/fitness/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-03-10', type: 'back' }),
    })
    const res = await fetch(`${baseUrl()}/api/fitness/workouts/2026-03-10/back`, { method: 'DELETE' })
    assert.equal(res.status, 204)
  })

  it('returns 404 when workout was never logged', async () => {
    const res = await fetch(`${baseUrl()}/api/fitness/workouts/2026-12-31/chest`, { method: 'DELETE' })
    assert.equal(res.status, 404)
  })
})

describe('GET /api/fitness/workouts after mutations', () => {
  it('returns all logged workouts sorted by date', async () => {
    const res = await fetch(`${baseUrl()}/api/fitness/workouts`)
    assert.equal(res.status, 200)
    const body = await res.json() as { date: string; type: string }[]
    const types2026_01_15 = body.filter(r => r.date === '2026-01-15').map(r => r.type)
    assert.ok(types2026_01_15.includes('core'))
    assert.ok(types2026_01_15.includes('cardio'))
    assert.ok(types2026_01_15.includes('legs'))
    assert.ok(!body.some(r => r.date === '2026-03-10' && r.type === 'back'))
    for (let i = 1; i < body.length; i++) {
      assert.ok(body[i].date >= body[i - 1].date)
    }
  })
})
