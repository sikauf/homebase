import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../app'

const MOCK_SAVE = {
  character_stats: [
    { id: 'CHARACTER.IRONCLAD',         max_ascension: 5, preferred_ascension: 5 },
    { id: 'CHARACTER.SILENT',           max_ascension: 4, preferred_ascension: 4 },
    { id: 'CHARACTER.DEFECT',           max_ascension: 8, preferred_ascension: 8 },
    { id: 'CHARACTER.REGENT',           max_ascension: 3, preferred_ascension: 3 },
    { id: 'CHARACTER.NECROBINDER',      max_ascension: 1, preferred_ascension: 1 },
    { id: 'CHARACTER.RANDOM_CHARACTER', max_ascension: 0, preferred_ascension: 0 },
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

  it('returns 503 when save file is missing', async () => {
    const orig = process.env.STS2_SAVE_PATH
    process.env.STS2_SAVE_PATH = '/nonexistent/path.save'
    const res = await fetch(`${base}/api/games/sts2/ascensions`)
    assert.equal(res.status, 503)
    process.env.STS2_SAVE_PATH = orig
  })
})
