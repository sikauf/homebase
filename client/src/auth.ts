import { useSyncExternalStore } from 'react'

// Shared client-side auth state. One /api/auth/me check per page load, shared
// by the "Are you Sam?" / "Are you Callie?" prompts, Sam-only sections
// (clean), the couple-only Callie section, and the calendar's auth-gated
// sources. In local dev (no AUTH_PASSWORD) /me returns 200 as sam, so
// everything behaves as Sam.

export type AuthState = 'checking' | 'anon' | 'sam' | 'callie'

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
    .then(async (res) => {
      if (!res.ok) {
        setAuthState('anon')
        return
      }
      const body = await res.json().catch(() => ({}))
      setAuthState(body.role === 'callie' ? 'callie' : 'sam')
    })
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

export function useIsCallie(): boolean {
  return useAuthState() === 'callie'
}

/** Sam or Callie — the gate for the couple-only Callie section. */
export function useIsCouple(): boolean {
  const s = useAuthState()
  return s === 'sam' || s === 'callie'
}
