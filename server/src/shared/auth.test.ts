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

describe('auth enabled', () => {
  it('rejects API requests without credentials', async () => {
    assert.equal((await fetch(`${baseUrl()}/api/games/shovelknight/feats`)).status, 401)
    assert.equal((await fetch(`${baseUrl()}/api/auth/me`)).status, 401)
  })

  it('rejects a wrong password', async () => {
    assert.equal((await login('nope')).status, 401)
  })

  it('rejects a missing/non-string password', async () => {
    assert.equal((await login(undefined)).status, 401)
    assert.equal((await login(123)).status, 401)
  })

  it('login sets a session cookie that grants access', async () => {
    const res = await login(PASSWORD)
    assert.equal(res.status, 200)
    const setCookie = res.headers.get('set-cookie')
    assert.ok(setCookie?.startsWith('homebase_session='))
    assert.ok(setCookie?.includes('HttpOnly'))

    const cookie = setCookie!.split(';')[0]
    const authed = await fetch(`${baseUrl()}/api/games/shovelknight/feats`, {
      headers: { Cookie: cookie },
    })
    assert.equal(authed.status, 200)
    assert.equal((await fetch(`${baseUrl()}/api/auth/me`, { headers: { Cookie: cookie } })).status, 200)
  })

  it('rejects a tampered session cookie', async () => {
    const res = await login(PASSWORD)
    const cookie = res.headers.get('set-cookie')!.split(';')[0]
    const [name, value] = cookie.split('=')
    const [expiresAt] = value.split('.')
    const forged = `${name}=${Number(expiresAt) + 1000}.${value.split('.')[1]}`
    const denied = await fetch(`${baseUrl()}/api/auth/me`, { headers: { Cookie: forged } })
    assert.equal(denied.status, 401)
  })

  it('accepts Authorization: Bearer <password>', async () => {
    const res = await fetch(`${baseUrl()}/api/games/shovelknight/feats`, {
      headers: { Authorization: `Bearer ${PASSWORD}` },
    })
    assert.equal(res.status, 200)
  })

  it('rejects a wrong bearer token', async () => {
    const res = await fetch(`${baseUrl()}/api/games/shovelknight/feats`, {
      headers: { Authorization: 'Bearer wrong' },
    })
    assert.equal(res.status, 401)
  })
})
