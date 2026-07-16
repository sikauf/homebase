import { FormEvent, useEffect, useState } from 'react'

// Reads are public; this small prompt (in the sidebar / mobile drawer)
// unlocks write access with the shared password.
export default function AreYouSam() {
  const [status, setStatus] = useState<'checking' | 'anon' | 'sam'>('checking')
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => setStatus(res.ok ? 'sam' : 'anon'))
      .catch(() => setStatus('anon'))
  }, [])

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
        setStatus('sam')
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

  if (status === 'checking') return null

  if (status === 'sam') {
    return (
      <div className="px-6 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        ✓ Sam — write access
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
              border: `1px solid ${error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: 'rgba(255,255,255,0.92)',
            }}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || !password}
              className="flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
            >
              {submitting ? '…' : 'Unlock'}
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
          {error && <p className="text-xs text-red-400">That's not Sam.</p>}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
        >
          Are you Sam?
        </button>
      )}
    </div>
  )
}
