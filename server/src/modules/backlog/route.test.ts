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
  position: number
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
  it('orders by position ASC (newest items first by default)', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items`)
    const items = await res.json() as Item[]
    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i - 1].position <= items[i].position)
    }
  })
})

describe('POST /api/backlog/items position behavior', () => {
  async function postItem(text: string): Promise<Item> {
    const res = await fetch(`${baseUrl()}/api/backlog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    return res.json() as Promise<Item>
  }

  it('places newly created items at the top of the list', async () => {
    const a = await postItem('older')
    const b = await postItem('newer')
    assert.ok(b.position < a.position)

    const list = await (await fetch(`${baseUrl()}/api/backlog/items`)).json() as Item[]
    const idxA = list.findIndex((i) => i.id === a.id)
    const idxB = list.findIndex((i) => i.id === b.id)
    assert.ok(idxB < idxA, 'newer item should appear before older')
  })
})

describe('POST /api/backlog/items/reorder', () => {
  async function postItem(text: string): Promise<Item> {
    const res = await fetch(`${baseUrl()}/api/backlog/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    return res.json() as Promise<Item>
  }
  async function listIds(): Promise<number[]> {
    const list = await (await fetch(`${baseUrl()}/api/backlog/items`)).json() as Item[]
    return list.map((i) => i.id)
  }

  it('reorders the supplied ids in the given order', async () => {
    const a = await postItem('a')
    const b = await postItem('b')
    const c = await postItem('c')
    // default order: c, b, a (newest first)
    const before = await listIds()
    assert.deepEqual(before.slice(0, 3), [c.id, b.id, a.id])

    const res = await fetch(`${baseUrl()}/api/backlog/items/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [a.id, b.id, c.id] }),
    })
    assert.equal(res.status, 204)

    const after = await listIds()
    assert.deepEqual(after.slice(0, 3), [a.id, b.id, c.id])
  })

  it('persists the new order across subsequent reads', async () => {
    const x = await postItem('x')
    const y = await postItem('y')
    await fetch(`${baseUrl()}/api/backlog/items/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [x.id, y.id] }),
    })
    const first = await listIds()
    const second = await listIds()
    assert.deepEqual(first, second)
    const ix = first.indexOf(x.id)
    const iy = first.indexOf(y.id)
    assert.ok(ix < iy)
  })

  it('only changes positions of the supplied ids', async () => {
    const p = await postItem('p')
    const q = await postItem('q')
    const r = await postItem('r')
    // reorder only p and r — q's position must not move relative to others
    const before = await listIds()
    const qIdxBefore = before.indexOf(q.id)

    await fetch(`${baseUrl()}/api/backlog/items/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [p.id, r.id] }),
    })

    const after = await listIds()
    assert.equal(after.indexOf(q.id), qIdxBefore, 'q should not have moved')
    assert.ok(after.indexOf(p.id) < after.indexOf(r.id))
  })

  it('returns 400 when ids is not an array', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: 'nope' }),
    })
    assert.equal(res.status, 400)
  })

  it('returns 400 when ids is empty', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [] }),
    })
    assert.equal(res.status, 400)
  })

  it('returns 400 when ids contains non-integers', async () => {
    const res = await fetch(`${baseUrl()}/api/backlog/items/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [1, 'two'] }),
    })
    assert.equal(res.status, 400)
  })

  it('returns 400 when an id is not found', async () => {
    const item = await postItem('alone')
    const res = await fetch(`${baseUrl()}/api/backlog/items/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [item.id, 9999999] }),
    })
    assert.equal(res.status, 400)
  })
})
