import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from '../../shared/test-helpers'

const baseUrl = setupTestServer()

type ExportPayload = {
  version: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

describe('GET /api/export', () => {
  it('returns a versioned JSON snapshot of all user tables', async () => {
    const res = await fetch(`${baseUrl()}/api/export`)
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /^application\/json/)
    const disposition = res.headers.get('content-disposition') ?? ''
    assert.match(disposition, /attachment; filename="homebase-export-.+\.json"/)

    const body = (await res.json()) as ExportPayload
    assert.equal(body.version, 1)
    assert.ok(typeof body.exportedAt === 'string')
    assert.ok(!Number.isNaN(Date.parse(body.exportedAt)))
    assert.ok(body.tables && typeof body.tables === 'object')
    // Sanity-check known tables from the schema.
    assert.ok('clean_days' in body.tables)
    assert.ok('golf_rounds' in body.tables)
    assert.ok('meta' in body.tables)
  })

  it('excludes internal sqlite_* tables', async () => {
    const res = await fetch(`${baseUrl()}/api/export`)
    const body = (await res.json()) as ExportPayload
    for (const name of Object.keys(body.tables)) {
      assert.ok(!name.startsWith('sqlite_'), `unexpected internal table: ${name}`)
    }
  })

  it('includes rows that were just inserted via the API', async () => {
    await fetch(`${baseUrl()}/api/clean/days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-07-04', state: 'gold' }),
    })
    const res = await fetch(`${baseUrl()}/api/export`)
    const body = (await res.json()) as ExportPayload
    const rows = body.tables.clean_days as { date: string; state: string }[]
    const match = rows.find((r) => r.date === '2026-07-04')
    assert.ok(match, 'expected exported clean_days to contain the seeded row')
    assert.equal(match!.state, 'gold')
  })
})

describe('GET /api/export/last', () => {
  it('reflects the most recent export timestamp after an export', async () => {
    const before = await fetch(`${baseUrl()}/api/export`)
    const beforeBody = (await before.json()) as ExportPayload
    const lastRes = await fetch(`${baseUrl()}/api/export/last`)
    assert.equal(lastRes.status, 200)
    const last = (await lastRes.json()) as { lastExportedAt: string | null }
    assert.equal(last.lastExportedAt, beforeBody.exportedAt)
  })

  it('updates the timestamp each time /api/export is hit', async () => {
    const first = await fetch(`${baseUrl()}/api/export`)
    const firstBody = (await first.json()) as ExportPayload
    await new Promise((r) => setTimeout(r, 5))
    const second = await fetch(`${baseUrl()}/api/export`)
    const secondBody = (await second.json()) as ExportPayload
    assert.notEqual(firstBody.exportedAt, secondBody.exportedAt)
    const lastRes = await fetch(`${baseUrl()}/api/export/last`)
    const last = (await lastRes.json()) as { lastExportedAt: string | null }
    assert.equal(last.lastExportedAt, secondBody.exportedAt)
  })
})
