import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from '../../shared/test-helpers'

const baseUrl = setupTestServer()

interface Item {
  id: number
  text: string
  section: string | null
  tab: string | null
  status: string
  created_at: string
  completed_at: string | null
}

describe('GET /api/backlog/items', () => {
  it('returns an empty array when no items exist', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), [])
  })
})

describe('POST /api/backlog/items', () => {
  it('creates an item and returns the row', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Add dark mode toggle' }),
    })
    assert.equal(res.status, 201)
    const item = await res.json() as Item
    assert.equal(item.text, 'Add dark mode toggle')
    assert.equal(item.section, null)
    assert.equal(item.tab, null)
    assert.equal(item.status, 'open')
    assert.equal(item.completed_at, null)
    assert.ok(typeof item.id === 'number')
  })

  it('persists optional section and tab', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Improve scorecard layout', section: 'golf', tab: 'rounds' }),
    })
    assert.equal(res.status, 201)
    const item = await res.json() as Item
    assert.equal(item.section, 'golf')
    assert.equal(item.tab, 'rounds')
  })

  it('trims whitespace from text', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '   spaces around   ' }),
    })
    const item = await res.json() as Item
    assert.equal(item.text, 'spaces around')
  })

  it('returns 400 when text is missing', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
  })

  it('returns 400 when text is empty', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '   ' }),
    })
    assert.equal(res.status, 400)
  })
})

describe('PATCH /api/backlog/items/:id', () => {
  async function createItem(text = 'task'): Promise<Item> {
    const res = await fetch(`${baseUrl()}/api/backlog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    return res.json() as Promise<Item>
  }

  it('marks an item done and stamps completed_at', async () => {
    const item = await createItem('finish refactor')
    const res = await fetch(`${baseUrl()}/api/backlog/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    assert.equal(res.status, 200)
    const updated = await res.json() as Item
    assert.equal(updated.status, 'done')
    assert.ok(updated.completed_at)
  })

  it('reopening clears completed_at', async () => {
    const item = await createItem('reopen me')
    await fetch(`${baseUrl()}/api/backlog/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    const res = await fetch(`${baseUrl()}/api/backlog/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open' }),
    })
    const updated = await res.json() as Item
    assert.equal(updated.status, 'open')
    assert.equal(updated.completed_at, null)
  })

  it('returns 400 for an unknown status', async () => {
    const item = await createItem()
    const res = await fetch(`${baseUrl()}/api/backlog/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'wontfix' }),
    })
    assert.equal(res.status, 400)
  })

  it('returns 404 for a non-existent id', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items/9999999`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    assert.equal(res.status, 404)
  })
})

describe('DELETE /api/backlog/items/:id', () => {
  it('deletes an existing item', async () => {
    const created = await fetch(`${baseUrl()}/api/backlog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'to be deleted' }),
    })
    const item = await created.json() as Item
    const res = await fetch(`${baseUrl()}/api/backlog/items/${item.id}`, { method: 'DELETE' })
    assert.equal(res.status, 204)
  })

  it('returns 404 for a non-existent id', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items/9999999`, { method: 'DELETE' })
    assert.equal(res.status, 404)
  })
})

describe('GET /api/backlog/items after mutations', () => {
  it('orders by created_at DESC', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items`)
    const items = await res.json() as Item[]
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i - 1].created_at >= items[i].created_at)
    }
  })
})
