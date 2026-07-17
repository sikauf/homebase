import { FormEvent, useState } from 'react'
import { setAuthState, useAuthState } from '../../auth'

// Callie's own door into the app: her password unlocks read/write on the
// Callie section only. Mirrors AreYouSam, with her colors.
export default function AreYouCallie() {
  const status = useAuthState()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    setError(false)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const body = await res.json().catch(() => ({}))
        setAuthState(body.role === 'callie' ? 'callie' : 'sam')
        setOpen(false)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'checking' || status === 'sam') return null

  if (status === 'callie') {
    return (
      <div className="px-6 py-2 text-xs" style={{ color: 'rgba(244,143,187,0.75)' }}>
        ✓ Callie 🎀 — your pages
      </div>
    )
  }

  return (
    <div className="px-3 pb-1">
      {open ? (
        <form onSubmit={submit} className="flex flex-col gap-2 px-3 py-2">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="Password"
            className="w-full rounded-lg px-2.5 py-1.5 text-sm outline-none"
            style={{
              background: '#0c0c0c',
              border: `1px solid ${error ? 'rgba(248,113,113,0.5)' : 'rgba(244,143,187,0.35)'}`,
              color: 'rgba(255,255,255,0.92)',
            }}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || !password}
              className="flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
              style={{ background: 'rgba(244,143,187,0.2)', color: 'rgba(255,214,231,0.95)' }}
            >
              {submitting ? '…' : 'Unlock 🎀'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setPassword(''); setError(false) }}
              className="rounded-lg px-2.5 py-1.5 text-xs"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-400">That's not Callie.</p>}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors hover:bg-gray-800"
          style={{ color: 'rgba(244,143,187,0.6)' }}
        >
          Are you Callie?
        </button>
      )}
    </div>
  )
}
