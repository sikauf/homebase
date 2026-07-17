import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from '../../shared/test-helpers'

const baseUrl = setupTestServer()
const SAM_PASSWORD = 'sam-secret'
const CALLIE_PASSWORD = 'callie-secret'

before(() => {
  process.env.AUTH_PASSWORD = SAM_PASSWORD
  process.env.CALLIE_PASSWORD = CALLIE_PASSWORD
})
after(() => {
  delete process.env.AUTH_PASSWORD
  delete process.env.CALLIE_PASSWORD
})

async function loginCookie(password: string): Promise<string> {
  const res = await fetch(`${baseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  assert.equal(res.status, 200)
  return res.headers.get('set-cookie')!.split(';')[0]
}

type Row = Record<string, any>
const json = (res: Response) => res.json() as Promise<Row>

const api = (path: string, init: RequestInit = {}) =>
  fetch(`${baseUrl()}/api/callie${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })

describe('callie auth boundary', () => {
  it('rejects anonymous reads everywhere in the section', async () => {
    assert.equal((await api('/moods')).status, 401)
    assert.equal((await api('/events')).status, 401)
    assert.equal((await api('/photos')).status, 401)
  })

  it('login with the Callie password reports the callie role', async () => {
    const res = await fetch(`${baseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: CALLIE_PASSWORD }),
    })
    assert.equal(res.status, 200)
    assert.equal(((await json(res)).role), 'callie')
  })

  it('/me reports the callie role for a Callie session', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const res = await fetch(`${baseUrl()}/api/auth/me`, { headers: { Cookie: cookie } })
    assert.equal(res.status, 200)
    assert.equal(((await json(res)).role), 'callie')
  })

  it('grants Callie read/write inside the section', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    assert.equal((await api('/moods', { headers: { Cookie: cookie } })).status, 200)
    const created = await api('/moods', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: JSON.stringify({ mood: 'happy' }),
    })
    assert.equal(created.status, 201)
  })

  it('grants Sam read/write inside the section', async () => {
    const cookie = await loginCookie(SAM_PASSWORD)
    assert.equal((await api('/moods', { headers: { Cookie: cookie } })).status, 200)
    const created = await api('/moods', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: JSON.stringify({ mood: 'happy' }),
    })
    assert.equal(created.status, 201)
  })

  it('denies Callie reads on clean (priority: no clean access)', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    assert.equal((await fetch(`${baseUrl()}/api/clean/days`, { headers: { Cookie: cookie } })).status, 401)
  })

  it('denies the Callie bearer token on clean too', async () => {
    const res = await fetch(`${baseUrl()}/api/clean/days`, {
      headers: { Authorization: `Bearer ${CALLIE_PASSWORD}` },
    })
    assert.equal(res.status, 401)
  })

  it('denies Callie writes outside her section', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const res = await fetch(`${baseUrl()}/api/games/shovelknight/feats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ character_id: 'shovel', feat_id: 'victory' }),
    })
    assert.equal(res.status, 401)
  })

  it('rejects a Callie cookie whose role was swapped to sam', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const forged = cookie.replace('=callie.', '=sam.')
    assert.equal((await fetch(`${baseUrl()}/api/clean/days`, { headers: { Cookie: forged } })).status, 401)
    assert.equal((await fetch(`${baseUrl()}/api/auth/me`, { headers: { Cookie: forged } })).status, 401)
  })
})

describe('moods', () => {
  it('stamps added_by from the session role', async () => {
    const callieCookie = await loginCookie(CALLIE_PASSWORD)
    const samCookie = await loginCookie(SAM_PASSWORD)

    const fromCallie = await json(await api('/moods', {
        method: 'POST',
        headers: { Cookie: callieCookie },
        body: JSON.stringify({ mood: 'loved', note: 'best day' }),
      }))
    assert.equal(fromCallie.added_by, 'callie')
    assert.equal(fromCallie.note, 'best day')

    const fromSam = await json(await api('/moods', {
        method: 'POST',
        headers: { Cookie: samCookie },
        body: JSON.stringify({ mood: 'silly' }),
      }))
    assert.equal(fromSam.added_by, 'sam')
    assert.equal(fromSam.note, null)
  })

  it('rejects a missing or blank mood', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const post = (body: unknown) =>
      api('/moods', { method: 'POST', headers: { Cookie: cookie }, body: JSON.stringify(body) })
    assert.equal((await post({})).status, 400)
    assert.equal((await post({ mood: '  ' })).status, 400)
    assert.equal((await post({ mood: 42 })).status, 400)
  })

  it('lists newest first and deletes', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const created = await json(await api('/moods', { method: 'POST', headers: { Cookie: cookie }, body: JSON.stringify({ mood: 'sleepy' }) }))
    const list = (await json(await api('/moods', { headers: { Cookie: cookie } }))) as unknown as Row[]
    assert.equal(list[0].id, created.id)

    assert.equal((await api(`/moods/${created.id}`, { method: 'DELETE', headers: { Cookie: cookie } })).status, 204)
    assert.equal((await api(`/moods/${created.id}`, { method: 'DELETE', headers: { Cookie: cookie } })).status, 404)
  })
})

describe('events', () => {
  it('creates a one-off event with added_by attribution', async () => {
    const cookie = await loginCookie(SAM_PASSWORD)
    const res = await api('/events', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: JSON.stringify({ title: 'Dinner date', date: '2026-08-01', time: '19:00', notes: 'that thai place' }),
    })
    assert.equal(res.status, 201)
    const event = await json(res)
    assert.equal(event.added_by, 'sam')
    assert.equal(event.recurrence, 'none')
    assert.equal(event.time, '19:00')
  })

  it('creates a recurring event with an until date', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const res = await api('/events', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: JSON.stringify({ title: 'Pilates', date: '2026-07-20', recurrence: 'weekly', until: '2026-12-31' }),
    })
    assert.equal(res.status, 201)
    const event = await json(res)
    assert.equal(event.added_by, 'callie')
    assert.equal(event.recurrence, 'weekly')
    assert.equal(event.until, '2026-12-31')
  })

  it('validates fields', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const post = (body: unknown) =>
      api('/events', { method: 'POST', headers: { Cookie: cookie }, body: JSON.stringify(body) })
    assert.equal((await post({ date: '2026-08-01' })).status, 400)
    assert.equal((await post({ title: 'x', date: 'nope' })).status, 400)
    assert.equal((await post({ title: 'x', date: '2026-08-01', time: '7pm' })).status, 400)
    assert.equal((await post({ title: 'x', date: '2026-08-01', recurrence: 'fortnightly' })).status, 400)
    assert.equal((await post({ title: 'x', date: '2026-08-01', until: 'later' })).status, 400)
  })

  it('patches fields and keeps the rest', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const event = await json(await api('/events', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: JSON.stringify({ title: 'Movie night', date: '2026-08-07', recurrence: 'monthly' }),
      }))
    const patched = await json(await api(`/events/${event.id}`, {
        method: 'PATCH',
        headers: { Cookie: cookie },
        body: JSON.stringify({ time: '20:30', notes: 'bring snacks' }),
      }))
    assert.equal(patched.title, 'Movie night')
    assert.equal(patched.recurrence, 'monthly')
    assert.equal(patched.time, '20:30')
    assert.equal(patched.notes, 'bring snacks')

    const badPatch = await api(`/events/${event.id}`, {
      method: 'PATCH',
      headers: { Cookie: cookie },
      body: JSON.stringify({ date: 'not-a-date' }),
    })
    assert.equal(badPatch.status, 400)
  })

  it('deletes and 404s on unknown ids', async () => {
    const cookie = await loginCookie(SAM_PASSWORD)
    const event = await json(await api('/events', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: JSON.stringify({ title: 'One-off', date: '2026-09-01' }),
      }))
    assert.equal((await api(`/events/${event.id}`, { method: 'DELETE', headers: { Cookie: cookie } })).status, 204)
    assert.equal((await api(`/events/${event.id}`, { method: 'DELETE', headers: { Cookie: cookie } })).status, 404)
    assert.equal((await api('/events/999999', { method: 'PATCH', headers: { Cookie: cookie }, body: JSON.stringify({ title: 'x' }) })).status, 404)
  })
})

describe('photos', () => {
  it('lists photos for a Callie session', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const res = await api('/photos', { headers: { Cookie: cookie } })
    assert.equal(res.status, 200)
    const photos = await res.json()
    assert.ok(Array.isArray(photos))
    for (const p of photos) {
      assert.match(p.url, /^\/api\/callie\/photos\//)
    }
  })

  it('stores an uploaded photo and serves it back', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const pixel = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9])
    const created = await json(
      await api('/photos', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: JSON.stringify({ mime: 'image/jpeg', data: pixel.toString('base64') }),
      })
    )
    assert.match(created.name, /^upload-\d+\.jpeg$/)
    assert.equal(created.added_by, 'callie')

    const list = (await json(await api('/photos', { headers: { Cookie: cookie } }))) as unknown as Row[]
    assert.ok(list.some((p) => p.name === created.name))

    const served = await api(`/photos/${created.name}`, { headers: { Cookie: cookie } })
    assert.equal(served.status, 200)
    assert.equal(served.headers.get('content-type'), 'image/jpeg')
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), pixel)
  })

  it('stamps Sam uploads as sam', async () => {
    const cookie = await loginCookie(SAM_PASSWORD)
    const created = await json(
      await api('/photos', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: JSON.stringify({ mime: 'image/png', data: Buffer.from('png-ish').toString('base64') }),
      })
    )
    assert.equal(created.added_by, 'sam')
    assert.match(created.name, /\.png$/)
  })

  it('rejects anonymous uploads', async () => {
    const res = await api('/photos', {
      method: 'POST',
      body: JSON.stringify({ mime: 'image/jpeg', data: Buffer.from('x').toString('base64') }),
    })
    assert.equal(res.status, 401)
  })

  it('validates upload mime and data', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    const post = (body: unknown) =>
      api('/photos', { method: 'POST', headers: { Cookie: cookie }, body: JSON.stringify(body) })
    assert.equal((await post({ mime: 'image/gif', data: 'aGk=' })).status, 400)
    assert.equal((await post({ mime: 'image/jpeg' })).status, 400)
    assert.equal((await post({ mime: 'image/jpeg', data: '' })).status, 400)
    assert.equal((await post({ mime: 'image/jpeg', data: '!!!' })).status, 400)
  })

  it('404s on a missing upload id', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    assert.equal((await api('/photos/upload-999999.jpeg', { headers: { Cookie: cookie } })).status, 404)
  })

  it('rejects path traversal in photo names', async () => {
    const cookie = await loginCookie(CALLIE_PASSWORD)
    assert.equal((await api('/photos/..%2F..%2Fsecrets.jpeg', { headers: { Cookie: cookie } })).status, 400)
    assert.equal((await api('/photos/notes.txt', { headers: { Cookie: cookie } })).status, 400)
  })
})
