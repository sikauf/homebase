import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'

// Two-password auth for remote hosting: reads are public, writes need a
// password. AUTH_PASSWORD is Sam (full access); CALLIE_PASSWORD is Callie,
// whose session only grants read/write on /api/callie. When AUTH_PASSWORD is
// unset (local dev, tests) every request passes through as Sam. Browser
// sessions use a signed HttpOnly cookie carrying the role; scripts
// (push-saves, assistant book-rec sessions) send `Authorization: Bearer`.

export type Role = 'sam' | 'callie'

const COOKIE_NAME = 'homebase_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function secretFor(role: Role): string | undefined {
  return role === 'sam' ? process.env.AUTH_PASSWORD : process.env.CALLIE_PASSWORD
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
}

function sessionCookie(req: Request): string | null {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === COOKIE_NAME) return part.slice(eq + 1).trim()
  }
  return null
}

export function getRole(req: Request): Role | null {
  if (!process.env.AUTH_PASSWORD) return 'sam'

  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    for (const role of ['sam', 'callie'] as const) {
      const secret = secretFor(role)
      if (secret && safeEqual(token, secret)) return role
    }
    return null
  }

  const session = sessionCookie(req)
  if (!session) return null
  const parts = session.split('.')
  let role: Role
  let expiresAt: string
  let mac: string
  if (parts.length === 3 && (parts[0] === 'sam' || parts[0] === 'callie')) {
    ;[, expiresAt, mac] = parts
    role = parts[0]
  } else if (parts.length === 2) {
    // Legacy pre-role cookie: `expiresAt.mac`, always Sam.
    ;[expiresAt, mac] = parts
    role = 'sam'
  } else {
    return null
  }
  const secret = secretFor(role)
  if (!secret || !expiresAt || !mac) return null
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return null
  const payload = parts.length === 3 ? `${role}.${expiresAt}` : expiresAt
  return safeEqual(mac, sign(payload, secret)) ? role : null
}

export function isAuthenticated(req: Request): boolean {
  return getRole(req) !== null
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Anyone with the URL can read; mutations require a password. Callie's
// session only unlocks mutations under /callie — everything else needs Sam.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (READ_METHODS.has(req.method)) {
    next()
    return
  }
  const role = getRole(req)
  if (role === 'sam' || (role === 'callie' && req.path.startsWith('/callie'))) {
    next()
    return
  }
  res.status(401).json({ error: 'Unauthorized' })
}

// Private modules (e.g. clean) opt out of public reads: every method needs
// Sam. Callie's session does NOT pass this gate.
export function requireSam(req: Request, res: Response, next: NextFunction) {
  if (getRole(req) === 'sam') {
    next()
    return
  }
  res.status(401).json({ error: 'Unauthorized' })
}

// The Callie section: private to the two of them — Sam or Callie, any method.
export function requireCouple(req: Request, res: Response, next: NextFunction) {
  if (getRole(req) !== null) {
    next()
    return
  }
  res.status(401).json({ error: 'Unauthorized' })
}

export const authRouter = Router()

authRouter.post('/login', (req: Request, res: Response) => {
  const samSecret = process.env.AUTH_PASSWORD
  if (!samSecret) {
    res.status(503).json({ error: 'AUTH_PASSWORD not configured' })
    return
  }
  const password = (req.body ?? {}).password
  if (typeof password !== 'string') {
    res.status(401).json({ error: 'Wrong password' })
    return
  }
  const callieSecret = process.env.CALLIE_PASSWORD
  let role: Role
  if (safeEqual(password, samSecret)) role = 'sam'
  else if (callieSecret && safeEqual(password, callieSecret)) role = 'callie'
  else {
    res.status(401).json({ error: 'Wrong password' })
    return
  }
  const secret = secretFor(role)!
  const expiresAt = Date.now() + SESSION_TTL_MS
  const https = req.secure || req.headers['x-forwarded-proto'] === 'https'
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${role}.${expiresAt}.${sign(`${role}.${expiresAt}`, secret)}; Path=/; HttpOnly; SameSite=Lax; ` +
      `Max-Age=${SESSION_TTL_MS / 1000}${https ? '; Secure' : ''}`
  )
  res.json({ ok: true, role })
})

authRouter.get('/me', (req: Request, res: Response) => {
  const role = getRole(req)
  if (role) res.json({ ok: true, role })
  else res.status(401).json({ error: 'Unauthorized' })
})
