import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setupTestServer } from '../../../shared/test-helpers'

const baseUrl = setupTestServer()

const saveWith = (flags: number[]) =>
  `YCFS=1\nuSaveID=1\nuAchievementUnlocked=${flags.join(' ')}\nuSaveVersion=8\n`
const fx = {
  zero: path.join(os.tmpdir(), `sk-zero-${Date.now()}.bin`),
  one: path.join(os.tmpdir(), `sk-one-${Date.now()}.bin`),
  single: path.join(os.tmpdir(), `sk-single-${Date.now()}.bin`),
  noAch: path.join(os.tmpdir(), `sk-noach-${Date.now()}.bin`),
}

before(() => {
  fs.writeFileSync(fx.zero, saveWith(Array(138).fill(0)))
  fs.writeFileSync(fx.one, saveWith(Array(138).fill(1)))
  fs.writeFileSync(fx.single, saveWith([1, ...Array(137).fill(0)]))
  fs.writeFileSync(fx.noAch, 'YCFS=1\nuSaveID=1\n')
})

after(() => {
  for (const p of Object.values(fx)) { try { fs.unlinkSync(p) } catch { /* ignore */ } }
  delete process.env.SHOVEL_KNIGHT_SAVE_PATH
})

const post = (body: unknown) =>
  fetch(`${baseUrl()}/api/games/shovelknight/feats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('GET /api/games/shovelknight/feats', () => {
  it('returns an empty array initially', async () => {
    const res = await fetch(`${baseUrl()}/api/games/shovelknight/feats`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), [])
  })
})

describe('POST /api/games/shovelknight/feats', () => {
  it('marks a feat complete', async () => {
    const res = await post({ character_id: 'shovel', feat_id: 'victory' })
    assert.equal(res.status, 201)
    const body = await res.json() as Record<string, unknown>
    assert.equal(body.character_id, 'shovel')
    assert.equal(body.feat_id, 'victory')
  })

  it('rejects unknown character_id', async () => {
    const res = await post({ character_id: 'made_up', feat_id: 'victory' })
    assert.equal(res.status, 400)
  })

  it('rejects missing feat_id', async () => {
    const res = await post({ character_id: 'plague' })
    assert.equal(res.status, 400)
  })

  it('is idempotent — marking the same feat twice returns 201 both times', async () => {
    await post({ character_id: 'specter', feat_id: 'checkpointless' })
    const res = await post({ character_id: 'specter', feat_id: 'checkpointless' })
    assert.equal(res.status, 201)
  })

  it('keeps character progress independent — same feat id for two characters is two rows', async () => {
    await post({ character_id: 'plague', feat_id: 'again' })
    await post({ character_id: 'king', feat_id: 'again' })
    const rows = await (await fetch(`${baseUrl()}/api/games/shovelknight/feats`)).json() as
      { character_id: string; feat_id: string }[]
    assert.ok(rows.some((r) => r.character_id === 'plague' && r.feat_id === 'again'))
    assert.ok(rows.some((r) => r.character_id === 'king' && r.feat_id === 'again'))
  })
})

describe('GET /api/games/shovelknight/accomplished', () => {
  const get = () => fetch(`${baseUrl()}/api/games/shovelknight/accomplished`)

  it('returns empty arrays when nothing is unlocked', async () => {
    process.env.SHOVEL_KNIGHT_SAVE_PATH = fx.zero
    const res = await get()
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { shovel: [], plague: [], specter: [], king: [] })
  })

  it('maps a fully-unlocked save to 45/20/20/20 feats', async () => {
    process.env.SHOVEL_KNIGHT_SAVE_PATH = fx.one
    const body = await (await get()).json() as Record<string, string[]>
    assert.equal(body.shovel.length, 45)
    assert.equal(body.plague.length, 20)
    assert.equal(body.specter.length, 20)
    assert.equal(body.king.length, 20)
  })

  it('maps the first achievement bit to shovel/victory', async () => {
    process.env.SHOVEL_KNIGHT_SAVE_PATH = fx.single
    const body = await (await get()).json() as Record<string, string[]>
    assert.deepEqual(body.shovel, ['victory'])
    assert.deepEqual(body.plague, [])
  })

  it('returns 503 when the save path is not configured', async () => {
    delete process.env.SHOVEL_KNIGHT_SAVE_PATH
    assert.equal((await get()).status, 503)
  })

  it('returns 503 when the save file is missing', async () => {
    process.env.SHOVEL_KNIGHT_SAVE_PATH = '/nonexistent/sk-save.bin'
    assert.equal((await get()).status, 503)
  })

  it('returns 500 when the save has no achievement data', async () => {
    process.env.SHOVEL_KNIGHT_SAVE_PATH = fx.noAch
    assert.equal((await get()).status, 500)
  })
})

describe('save snapshots (POST /api/games/shovelknight/save)', () => {
  const pushSave = (data: unknown) =>
    fetch(`${baseUrl()}/api/games/shovelknight/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
  const getAccomplished = () => fetch(`${baseUrl()}/api/games/shovelknight/accomplished`)

  it('returns 503 when the path is unset and no snapshot has been pushed', async () => {
    delete process.env.SHOVEL_KNIGHT_SAVE_PATH
    assert.equal((await getAccomplished()).status, 503)
  })

  it('rejects a missing payload', async () => {
    assert.equal((await pushSave(undefined)).status, 400)
  })

  it('rejects a payload without achievement data', async () => {
    const res = await pushSave(Buffer.from('YCFS=1\nuSaveID=1\n').toString('base64'))
    assert.equal(res.status, 400)
  })

  it('stores a snapshot that /accomplished serves when the path is unset', async () => {
    delete process.env.SHOVEL_KNIGHT_SAVE_PATH
    const push = await pushSave(Buffer.from(saveWith([1, ...Array(137).fill(0)])).toString('base64'))
    assert.equal(push.status, 201)

    const res = await getAccomplished()
    assert.equal(res.status, 200)
    assert.ok(res.headers.get('x-save-synced-at'))
    const body = await res.json() as Record<string, string[]>
    assert.deepEqual(body.shovel, ['victory'])
  })

  it('prefers the live file (no synced header) when the path is set', async () => {
    process.env.SHOVEL_KNIGHT_SAVE_PATH = fx.zero
    const res = await getAccomplished()
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('x-save-synced-at'), null)
    assert.deepEqual(await res.json(), { shovel: [], plague: [], specter: [], king: [] })
    delete process.env.SHOVEL_KNIGHT_SAVE_PATH
  })
})
