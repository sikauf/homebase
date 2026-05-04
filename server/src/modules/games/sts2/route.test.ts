import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../../../app'

const MOCK_SAVE = {
  character_stats: [
    { id: 'CHARACTER.IRONCLAD',         max_ascension: 10, preferred_ascension: 10, total_wins: 11, total_losses: 15 },
    { id: 'CHARACTER.SILENT',           max_ascension: 4,  preferred_ascension: 4,  total_wins: 4,  total_losses: 9  },
    { id: 'CHARACTER.DEFECT',           max_ascension: 8,  preferred_ascension: 8,  total_wins: 8,  total_losses: 3  },
    { id: 'CHARACTER.REGENT',           max_ascension: 11, preferred_ascension: 11, total_wins: 14, total_losses: 3  },
    { id: 'CHARACTER.NECROBINDER',      max_ascension: 1,  preferred_ascension: 1,  total_wins: 1,  total_losses: 7  },
    { id: 'CHARACTER.RANDOM_CHARACTER', max_ascension: 0,  preferred_ascension: 0,  total_wins: 0,  total_losses: 0  },
  ],
}

let savePath: string
let server: http.Server
let base: string

before(() => new Promise<void>((resolve) => {
  savePath = path.join(os.tmpdir(), `sts2-test-${Date.now()}.save`)
  fs.writeFileSync(savePath, JSON.stringify(MOCK_SAVE))
  process.env.STS2_SAVE_PATH = savePath

  server = createApp().listen(0, () => {
    base = `http://localhost:${(server.address() as { port: number }).port}`
    resolve()
  })
}))

after(() => {
  fs.unlinkSync(savePath)
  delete process.env.STS2_SAVE_PATH
  return new Promise<void>((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve())
  })
})

describe('GET /api/games/sts2/ascensions', () => {
  it('returns the 5 known characters', async () => {
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    assert.equal(res.status, 200)
    const body = await res.json() as unknown[]
    assert.equal(body.length, 5)
  })

  it('excludes RANDOM_CHARACTER', async () => {
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    const body = await res.json() as { id: string }[]
    assert.ok(!body.some((c) => c.id === 'CHARACTER.RANDOM_CHARACTER'))
  })

  it('returns correct ascension for Defect', async () => {
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    const body = await res.json() as { id: string; max_ascension: number; preferred_ascension: number }[]
    const defect = body.find((c) => c.id === 'CHARACTER.DEFECT')!
    assert.equal(defect.max_ascension, 8)
    assert.equal(defect.preferred_ascension, 8)
  })

  it('includes human-readable name', async () => {
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    const body = await res.json() as { id: string; name: string }[]
    assert.equal(body.find((c) => c.id === 'CHARACTER.IRONCLAD')!.name, 'Ironclad')
  })

  it('includes total_wins and total_losses', async () => {
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    const body = await res.json() as { id: string; total_wins: number; total_losses: number }[]
    const defect = body.find((c) => c.id === 'CHARACTER.DEFECT')!
    assert.equal(defect.total_wins, 8)
    assert.equal(defect.total_losses, 3)
  })

  it('defaults wins/losses to 0 when absent from save', async () => {
    const sparse = { character_stats: [{ id: 'CHARACTER.IRONCLAD', max_ascension: 2, preferred_ascension: 2 }] }
    const sparsePath = path.join(os.tmpdir(), `sts2-sparse-${Date.now()}.save`)
    fs.writeFileSync(sparsePath, JSON.stringify(sparse))
    const orig = process.env.STS2_SAVE_PATH
    process.env.STS2_SAVE_PATH = sparsePath
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    const body = await res.json() as { id: string; total_wins: number; total_losses: number }[]
    assert.equal(body[0].total_wins, 0)
    assert.equal(body[0].total_losses, 0)
    process.env.STS2_SAVE_PATH = orig
    fs.unlinkSync(sparsePath)
  })

  it('returns 503 when save file is missing', async () => {
    const orig = process.env.STS2_SAVE_PATH
    process.env.STS2_SAVE_PATH = '/nonexistent/path.save'
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    assert.equal(res.status, 503)
    process.env.STS2_SAVE_PATH = orig
  })

  it('a10_completed defaults to false for eligible characters with no row', async () => {
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    const body = await res.json() as { id: string; a10_completed: boolean }[]
    assert.equal(body.find((c) => c.id === 'CHARACTER.IRONCLAD')!.a10_completed, false)
  })

  it('a10_completed is auto-true when max_ascension >= 11', async () => {
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    const body = await res.json() as { id: string; a10_completed: boolean }[]
    assert.equal(body.find((c) => c.id === 'CHARACTER.REGENT')!.a10_completed, true)
  })

  it('a10_completed is false for characters below A10', async () => {
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    const body = await res.json() as { id: string; a10_completed: boolean }[]
    assert.equal(body.find((c) => c.id === 'CHARACTER.SILENT')!.a10_completed, false)
    assert.equal(body.find((c) => c.id === 'CHARACTER.DEFECT')!.a10_completed, false)
  })
})

describe('POST /api/games/sts2/a10/:character_id', () => {
  it('marks A10 for an eligible character', async () => {
    const res = await fetch(`${base}/api/games/sts2/a10/CHARACTER.IRONCLAD`, { method: 'POST' })
    assert.equal(res.status, 201)
    const body = await res.json() as { character_id: string; a10_completed: boolean }
    assert.equal(body.character_id, 'CHARACTER.IRONCLAD')
    assert.equal(body.a10_completed, true)

    const list = await (await fetch(`${base}/api/games/sts2/ascensions`)).json() as { id: string; a10_completed: boolean }[]
    assert.equal(list.find((c) => c.id === 'CHARACTER.IRONCLAD')!.a10_completed, true)
  })

  it('is idempotent', async () => {
    await fetch(`${base}/api/games/sts2/a10/CHARACTER.IRONCLAD`, { method: 'POST' })
    const res = await fetch(`${base}/api/games/sts2/a10/CHARACTER.IRONCLAD`, { method: 'POST' })
    assert.equal(res.status, 201)
  })

  it('returns 400 for a character below A10', async () => {
    const res = await fetch(`${base}/api/games/sts2/a10/CHARACTER.SILENT`, { method: 'POST' })
    assert.equal(res.status, 400)
  })

  it('returns 400 for an unknown character', async () => {
    const res = await fetch(`${base}/api/games/sts2/a10/CHARACTER.BOGUS`, { method: 'POST' })
    assert.equal(res.status, 400)
  })
})

describe('DELETE /api/games/sts2/a10/:character_id', () => {
  it('unmarks a previously marked character', async () => {
    await fetch(`${base}/api/games/sts2/a10/CHARACTER.IRONCLAD`, { method: 'POST' })
    const res = await fetch(`${base}/api/games/sts2/a10/CHARACTER.IRONCLAD`, { method: 'DELETE' })
    assert.equal(res.status, 204)

    const list = await (await fetch(`${base}/api/games/sts2/ascensions`)).json() as { id: string; a10_completed: boolean }[]
    assert.equal(list.find((c) => c.id === 'CHARACTER.IRONCLAD')!.a10_completed, false)
  })

  it('is a no-op for a character that was not marked', async () => {
    const res = await fetch(`${base}/api/games/sts2/a10/CHARACTER.DEFECT`, { method: 'DELETE' })
    assert.equal(res.status, 204)
  })

  it('returns 400 for an unknown character', async () => {
    const res = await fetch(`${base}/api/games/sts2/a10/CHARACTER.BOGUS`, { method: 'DELETE' })
    assert.equal(res.status, 400)
  })

  it('cannot unmark a character with max_ascension >= 11 (DB row removed but a10_completed still true)', async () => {
    const res = await fetch(`${base}/api/games/sts2/a10/CHARACTER.REGENT`, { method: 'DELETE' })
    assert.equal(res.status, 204)
    const list = await (await fetch(`${base}/api/games/sts2/ascensions`)).json() as { id: string; a10_completed: boolean }[]
    assert.equal(list.find((c) => c.id === 'CHARACTER.REGENT')!.a10_completed, true)
  })
})
