import { useSyncExternalStore } from 'react'

const KEY = 'homebase.cleanTabVisible'
const EVENT = 'homebase:cleanVisibleChange'

function read(): boolean {
  const stored = localStorage.getItem(KEY)
  return stored === null ? true : stored === 'true'
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

export function useCleanVisible(): [boolean, (next: boolean) => void] {
  const visible = useSyncExternalStore(subscribe, read, () => true)
  const set = (next: boolean) => {
    localStorage.setItem(KEY, String(next))
    window.dispatchEvent(new Event(EVENT))
  }
  return [visible, set]
}
