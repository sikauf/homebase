import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { setupTestServer } from '../../../shared/test-helpers'
import { parseProfile, inflate } from './parse'

const baseUrl = setupTestServer()

// Build one campaign block: <code> + padding + N completion flags + end marker.
function block(code: string, completed: number): Buffer {
  return Buffer.concat([
    Buffer.from(code, 'latin1'),
    Buffer.alloc(8), // padding
    Buffer.alloc(completed, 0x01), // flag run
    Buffer.alloc(3), // trailing zeros
    Buffer.from([0x40, 0xe2, 0x01]), // marker
    Buffer.alloc(2),
  ])
}

// A raw-DEFLATE profile (matches Player.nfp's framing) with cam1=3, cam2=1.
const fixture = path.join(os.tmpdir(), `aoe2-${Date.now()}.nfp`)

before(() => {
  const inflated = Buffer.concat([block('cam1', 3), block('cam2', 1), block('cam3', 0)])
  fs.writeFileSync(fixture, zlib.deflateRawSync(inflated))
})

after(() => {
  try { fs.unlinkSync(fixture) } catch { /* ignore */ }
  delete process.env.AOE2_SAVE_PATH
})

const get = () => fetch(`${baseUrl()}/api/games/aoe2/progress`)
const findCampaign = (campaigns: any[], code: string) => campaigns.find((c) => c.code === code)

describe('parseProfile', () => {
  it('counts completion flags per campaign', () => {
    const inflated = Buffer.concat([block('cam1', 3), block('cam2', 1)])
    assert.deepEqual(parseProfile(inflated), { cam1: 3, cam2: 1 })
  })

  it('inflate round-trips a raw-DEFLATE stream and rejects garbage', () => {
    const data = Buffer.from('cam1\x00\x00', 'latin1')
    assert.deepEqual(inflate(zlib.deflateRawSync(data)), data)
    assert.equal(inflate(Buffer.from([0, 1, 2, 3])), null)
  })
})

describe('GET /api/games/aoe2/progress', () => {
  it('lists every campaign and expansion even with no save', async () => {
    delete process.env.AOE2_SAVE_PATH
    const body = await (await get()).json() as any
    assert.equal(body.saveAvailable, false)
    assert.equal(body.campaigns.length, 36)
    assert.ok(body.expansions.some((e: any) => e.id === 'aok'))
    assert.equal(findCampaign(body.campaigns, 'cam1').completed, 0)
  })

  it('auto-detects completion from the save (linear → first N missions)', async () => {
    process.env.AOE2_SAVE_PATH = fixture
    const body = await (await get()).json() as any
    assert.equal(body.saveAvailable, true)
    const joan = findCampaign(body.campaigns, 'cam1')
    assert.equal(joan.completed, 3)
    assert.deepEqual(joan.missions.slice(0, 4).map((m: any) => m.completed), [true, true, true, false])
    assert.equal(joan.missions[0].detected, true)
  })

  it('clamps detection to the real mission count', async () => {
    process.env.AOE2_SAVE_PATH = fixture
    const big = path.join(os.tmpdir(), `aoe2-big-${Date.now()}.nfp`)
    fs.writeFileSync(big, zlib.deflateRawSync(block('cam4', 20))) // cam4 has 5 missions
    process.env.AOE2_SAVE_PATH = big
    const body = await (await get()).json() as any
    assert.equal(findCampaign(body.campaigns, 'cam4').completed, 5)
    fs.unlinkSync(big)
    process.env.AOE2_SAVE_PATH = fixture
  })
})

describe('mission overrides', () => {
  const set = (campaign: string, index: number, completed: boolean) =>
    fetch(`${baseUrl()}/api/games/aoe2/missions/${campaign}/${index}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    })

  it('marks a mission complete over a quiet save', async () => {
    delete process.env.AOE2_SAVE_PATH
    assert.equal((await set('cam5', 0, true)).status, 201)
    const body = await (await get()).json() as any
    const m = findCampaign(body.campaigns, 'cam5').missions[0]
    assert.equal(m.completed, true)
    assert.equal(m.overridden, true)
  })

  it('overrides a detected mission back to incomplete', async () => {
    process.env.AOE2_SAVE_PATH = fixture
    await set('cam1', 0, false)
    const body = await (await get()).json() as any
    const joan = findCampaign(body.campaigns, 'cam1')
    assert.equal(joan.missions[0].completed, false)
    assert.equal(joan.missions[0].detected, true) // still detected, just overridden
    assert.equal(joan.completed, 2)
  })

  it('DELETE reverts to auto-detection', async () => {
    process.env.AOE2_SAVE_PATH = fixture
    await set('cam1', 0, false)
    const res = await fetch(`${baseUrl()}/api/games/aoe2/missions/cam1/0`, { method: 'DELETE' })
    assert.equal(res.status, 204)
    const body = await (await get()).json() as any
    assert.equal(findCampaign(body.campaigns, 'cam1').missions[0].completed, true)
  })

  it('rejects unknown campaign and out-of-range index', async () => {
    assert.equal((await set('nope', 0, true)).status, 400)
    assert.equal((await set('cam1', 99, true)).status, 400)
  })

  it('requires a boolean completed', async () => {
    const res = await fetch(`${baseUrl()}/api/games/aoe2/missions/cam1/0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
  })
})
