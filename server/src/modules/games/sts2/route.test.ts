import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../../../app'

const MOCK_SAVE = {
  character_stats: [
    { id: 'CHARACTER.IRONCLAD',         max_ascension: 5, preferred_ascension: 5, total_wins: 6,  total_losses: 15 },
    { id: 'CHARACTER.SILENT',           max_ascension: 4, preferred_ascension: 4, total_wins: 4,  total_losses: 9  },
    { id: 'CHARACTER.DEFECT',           max_ascension: 8, preferred_ascension: 8, total_wins: 8,  total_losses: 3  },
    { id: 'CHARACTER.REGENT',           max_ascension: 3, preferred_ascension: 3, total_wins: 3,  total_losses: 3  },
    { id: 'CHARACTER.NECROBINDER',      max_ascension: 1, preferred_ascension: 1, total_wins: 1,  total_losses: 7  },
    { id: 'CHARACTER.RANDOM_CHARACTER', max_ascension: 0, preferred_ascension: 0, total_wins: 0,  total_losses: 0  },
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
})
