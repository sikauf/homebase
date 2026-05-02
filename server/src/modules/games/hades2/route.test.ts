import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from '../../../shared/test-helpers'

const baseUrl = setupTestServer()

describe('GET /api/games/hades2/testaments', () => {
  it('returns an empty array initially', async () => {
    const res = await fetch(`${baseUrl()}/api/games/hades2/testaments`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.deepEqual(body, [])
  })
})

describe('POST /api/games/hades2/testaments', () => {
  it('marks a testament complete', async () => {
    const res = await fetch(`${baseUrl()}/api/games/hades2/testaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weapon_id: 'witch_staff', boss_id: 'hecate' }),
    })
    assert.equal(res.status, 201)
    const body = await res.json() as Record<string, unknown>
    assert.equal(body.weapon_id, 'witch_staff')
    assert.equal(body.boss_id, 'hecate')
  })

  it('rejects unknown weapon_id', async () => {
    const res = await fetch(`${baseUrl()}/api/games/hades2/testaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weapon_id: 'made_up', boss_id: 'hecate' }),
    })
    assert.equal(res.status, 400)
  })

  it('rejects unknown boss_id', async () => {
    const res = await fetch(`${baseUrl()}/api/games/hades2/testaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weapon_id: 'witch_staff', boss_id: 'made_up' }),
    })
    assert.equal(res.status, 400)
  })

  it('is idempotent — marking the same pair twice returns 201 both times', async () => {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weapon_id: 'sister_blades', boss_id: 'chronos' }),
    }
    await fetch(`${baseUrl()}/api/games/hades2/testaments`, opts)
    const res = await fetch(`${baseUrl()}/api/games/hades2/testaments`, opts)
    assert.equal(res.status, 201)
  })

  it('keeps weapon progress independent — same boss for two weapons is two rows', async () => {
    await fetch(`${baseUrl()}/api/games/hades2/testaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weapon_id: 'umbral_flames', boss_id: 'eris' }),
    })
    await fetch(`${baseUrl()}/api/games/hades2/testaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weapon_id: 'moonstone_axe', boss_id: 'eris' }),
    })
    const res = await fetch(`${baseUrl()}/api/games/hades2/testaments`)
    const rows = await res.json() as { weapon_id: string; boss_id: string }[]
    assert.ok(rows.some((r) => r.weapon_id === 'umbral_flames' && r.boss_id === 'eris'))
    assert.ok(rows.some((r) => r.weapon_id === 'moonstone_axe' && r.boss_id === 'eris'))
  })
})
