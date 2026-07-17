import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { setupTestServer } from './test-helpers'

const baseUrl = setupTestServer()
const PASSWORD = 'test-secret'

before(() => { process.env.AUTH_PASSWORD = PASSWORD })
after(() => { delete process.env.AUTH_PASSWORD })

const login = (password: unknown) =>
  fetch(`${baseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })

describe('auth disabled (AUTH_PASSWORD unset)', () => {
  it('lets API requests through and reports authenticated', async () => {
    delete process.env.AUTH_PASSWORD
    try {
      assert.equal((await fetch(`${baseUrl()}/api/games/shovelknight/feats`)).status, 200)
      assert.equal((await fetch(`${baseUrl()}/api/auth/me`)).status, 200)
    } finally {
      process.env.AUTH_PASSWORD = PASSWORD
    }
  })

  it('login returns 503 when not configured', async () => {
    delete process.env.AUTH_PASSWORD
    try {
      assert.equal((await login('anything')).status, 503)
    } finally {
      process.env.AUTH_PASSWORD = PASSWORD
    }
  })
})

const writeFeat = (init: RequestInit = {}) =>
  fetch(`${baseUrl()}/api/games/shovelknight/feats`, {
    method: 'POST',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: JSON.stringify({ character_id: 'shovel', feat_id: 'victory' }),
  })

describe('auth enabled', () => {
  it('allows reads without credentials', async () => {
    assert.equal((await fetch(`${baseUrl()}/api/games/shovelknight/feats`)).status, 200)
  })

  it('reports unauthenticated on /me without credentials', async () => {
    assert.equal((await fetch(`${baseUrl()}/api/auth/me`)).status, 401)
  })

  it('rejects writes without credentials', async () => {
    assert.equal((await writeFeat()).status, 401)
  })

  it('rejects a wrong password', async () => {
    assert.equal((await login('nope')).status, 401)
  })

  it('rejects a missing/non-string password', async () => {
    assert.equal((await login(undefined)).status, 401)
    assert.equal((await login(123)).status, 401)
  })

  it('login sets a session cookie that grants write access', async () => {
    const res = await login(PASSWORD)
    assert.equal(res.status, 200)
    const setCookie = res.headers.get('set-cookie')
    assert.ok(setCookie?.startsWith('homebase_session='))
    assert.ok(setCookie?.includes('HttpOnly'))

    const cookie = setCookie!.split(';')[0]
    assert.equal((await writeFeat({ headers: { Cookie: cookie } })).status, 201)
    assert.equal((await fetch(`${baseUrl()}/api/auth/me`, { headers: { Cookie: cookie } })).status, 200)
  })

  it('rejects a tampered session cookie', async () => {
    const res = await login(PASSWORD)
    const cookie = res.headers.get('set-cookie')!.split(';')[0]
    const [name, value] = cookie.split('=')
    const [role, expiresAt, mac] = value.split('.')
    const forged = `${name}=${role}.${Number(expiresAt) + 1000}.${mac}`
    const denied = await fetch(`${baseUrl()}/api/auth/me`, { headers: { Cookie: forged } })
    assert.equal(denied.status, 401)
  })

  it('reports the sam role on login and /me', async () => {
    const res = await login(PASSWORD)
    assert.equal(((await res.json()) as { role: string }).role, 'sam')
    const cookie = res.headers.get('set-cookie')!.split(';')[0]
    const me = await fetch(`${baseUrl()}/api/auth/me`, { headers: { Cookie: cookie } })
    assert.equal(((await me.json()) as { role: string }).role, 'sam')
  })

  it('rejects the Callie password when CALLIE_PASSWORD is unset', async () => {
    assert.equal((await login('callie-secret')).status, 401)
  })

  it('accepts Authorization: Bearer <password> for writes', async () => {
    const res = await writeFeat({ headers: { Authorization: `Bearer ${PASSWORD}` } })
    assert.equal(res.status, 201)
  })

  it('rejects a wrong bearer token on writes', async () => {
    const res = await writeFeat({ headers: { Authorization: 'Bearer wrong' } })
    assert.equal(res.status, 401)
  })
})
