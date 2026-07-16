import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'

// Single-password auth for remote hosting. When AUTH_PASSWORD is unset
// (local dev, tests) every request passes through untouched.
// Browser sessions use a signed HttpOnly cookie; scripts (push-saves,
// assistant book-rec sessions) send `Authorization: Bearer <AUTH_PASSWORD>`.

const COOKIE_NAME = 'homebase_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function sign(expiresAt: number, secret: string): string {
  return crypto.createHmac('sha256', secret).update(String(expiresAt)).digest('hex')
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

export function isAuthenticated(req: Request): boolean {
  const secret = process.env.AUTH_PASSWORD
  if (!secret) return true

  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ') && safeEqual(auth.slice(7), secret)) return true

  const session = sessionCookie(req)
  if (!session) return false
  const [expiresAt, mac] = session.split('.')
  if (!expiresAt || !mac) return false
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return false
  return safeEqual(mac, sign(Number(expiresAt), secret))
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (isAuthenticated(req)) {
    next()
    return
  }
  res.status(401).json({ error: 'Unauthorized' })
}

export const authRouter = Router()

authRouter.post('/login', (req: Request, res: Response) => {
  const secret = process.env.AUTH_PASSWORD
  if (!secret) {
    res.status(503).json({ error: 'AUTH_PASSWORD not configured' })
    return
  }
  const password = (req.body ?? {}).password
  if (typeof password !== 'string' || !safeEqual(password, secret)) {
    res.status(401).json({ error: 'Wrong password' })
    return
  }
  const expiresAt = Date.now() + SESSION_TTL_MS
  const https = req.secure || req.headers['x-forwarded-proto'] === 'https'
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${expiresAt}.${sign(expiresAt, secret)}; Path=/; HttpOnly; SameSite=Lax; ` +
      `Max-Age=${SESSION_TTL_MS / 1000}${https ? '; Secure' : ''}`
  )
  res.json({ ok: true })
})

authRouter.get('/me', (req: Request, res: Response) => {
  if (isAuthenticated(req)) res.json({ ok: true })
  else res.status(401).json({ error: 'Unauthorized' })
})
