import { FormEvent, ReactNode, useEffect, useState } from 'react'

// Blocks the app behind a password prompt when the server has AUTH_PASSWORD
// set (remote hosting). Local dev servers respond 200 to /me, so the gate
// is invisible there.
export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'authed' | 'login'>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => setStatus(res.ok ? 'authed' : 'login'))
      .catch(() => setStatus('login'))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setStatus('authed')
      } else {
        const body = await res.json().catch(() => null) as { error?: string } | null
        setError(body?.error ?? 'Login failed')
      }
    } catch {
      setError('Could not reach the server')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'authed') return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c0c0c' }}>
      {status === 'login' && (
        <form
          onSubmit={submit}
          className="w-full max-w-xs mx-4 rounded-xl p-6 flex flex-col gap-4"
          style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>
              Home Base
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Enter the password to continue
            </p>
          </div>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: '#0c0c0c',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.92)',
            }}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !password}
            className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}
    </div>
  )
}
