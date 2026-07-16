import { useSyncExternalStore } from 'react'

// Shared client-side auth state. One /api/auth/me check per page load, shared
// by the "Are you Sam?" prompt, Sam-only sections (clean), and the calendar's
// auth-gated sources. In local dev (no AUTH_PASSWORD) /me returns 200, so
// everything behaves as Sam.

export type AuthState = 'checking' | 'anon' | 'sam'

let state: AuthState = 'checking'
let started = false
const listeners = new Set<() => void>()

export function setAuthState(next: AuthState) {
  state = next
  listeners.forEach((l) => l())
}

function ensureCheck() {
  if (started) return
  started = true
  fetch('/api/auth/me')
    .then((res) => setAuthState(res.ok ? 'sam' : 'anon'))
    .catch(() => setAuthState('anon'))
}

function subscribe(cb: () => void) {
  ensureCheck()
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => 'checking')
}

export function useIsSam(): boolean {
  return useAuthState() === 'sam'
}
