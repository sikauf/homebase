import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from '../../shared/test-helpers'

const baseUrl = setupTestServer()

describe('GET /api/clean/days', () => {
  it('returns an empty array when no days are marked', async () => {
    const res = await fetch(`${baseUrl()}/api/clean/days`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.deepEqual(body, [])
  })
})

describe('POST /api/clean/days', () => {
  it('marks a day with default state "clean"', async () => {
    const res = await fetch(`${baseUrl()}/api/clean/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-01-15' }),
    })
    assert.equal(res.status, 201)
    const body = await res.json() as Record<string, unknown>
    assert.equal(body.date, '2026-01-15')
    assert.equal(body.state, 'clean')
  })

  it('marks a day with state "gold"', async () => {
    const res = await fetch(`${baseUrl()}/api/clean/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-01-16', state: 'gold' }),
    })
    assert.equal(res.status, 201)
    const body = await res.json() as Record<string, unknown>
    assert.equal(body.state, 'gold')
  })

  it('upserts state when called twice on the same date', async () => {
    const opts = (state: string) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-01-17', state }),
    })
    await fetch(`${baseUrl()}/api/clean/days`, opts('clean'))
    await fetch(`${baseUrl()}/api/clean/days`, opts('gold'))
    const res = await fetch(`${baseUrl()}/api/clean/days`)
    const body = await res.json() as { date: string; state: string }[]
    const row = body.find((r) => r.date === '2026-01-17')
    assert.equal(row?.state, 'gold')
  })

  it('returns 400 when date is missing', async () => {
    const res = await fetch(`${baseUrl()}/api/clean/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
  })

  it('returns 400 when date format is invalid', async () => {
    const res = await fetch(`${baseUrl()}/api/clean/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: 'not-a-date' }),
    })
    assert.equal(res.status, 400)
  })

  it('returns 400 when state is invalid', async () => {
    const res = await fetch(`${baseUrl()}/api/clean/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-02-01', state: 'platinum' }),
    })
    assert.equal(res.status, 400)
  })
})

describe('DELETE /api/clean/days/:date', () => {
  it('unmarks a previously marked day', async () => {
    await fetch(`${baseUrl()}/api/clean/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-03-10' }),
    })
    const res = await fetch(`${baseUrl()}/api/clean/days/2026-03-10`, { method: 'DELETE' })
    assert.equal(res.status, 204)
  })

  it('returns 404 when deleting a date that was never marked', async () => {
    const res = await fetch(`${baseUrl()}/api/clean/days/2026-12-31`, { method: 'DELETE' })
    assert.equal(res.status, 404)
  })
})

describe('GET /api/clean/days after mutations', () => {
  it('returns all marked dates with their states, sorted ascending', async () => {
    const res = await fetch(`${baseUrl()}/api/clean/days`)
    assert.equal(res.status, 200)
    const body = await res.json() as { date: string; state: string }[]
    const dates = body.map((r) => r.date)
    assert.ok(dates.includes('2026-01-15'))
    assert.ok(dates.includes('2026-01-16'))
    assert.ok(dates.includes('2026-01-17'))
    assert.ok(!dates.includes('2026-03-10'))
    for (let i = 1; i < dates.length; i++) {
      assert.ok(dates[i] >= dates[i - 1])
    }
    for (const row of body) {
      assert.ok(row.state === 'clean' || row.state === 'gold')
    }
  })
})
