import { useEffect, useRef } from 'react'
import { STORAGE_KEY } from './storage.ts'

// Calls onChange when another tab has changed the todos. The browser sends the storage event only to the
// other tabs, never to the one that wrote. The key is null when another tab cleared all of storage.
// The same event comes for sessionStorage, which the app never reads, so only localStorage counts.
export function useOtherTabChanges(onChange: () => void) {
  const latest = useRef(onChange)
  useEffect(() => {
    latest.current = onChange
  })
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (isLocalStorage(event.storageArea) && (event.key === STORAGE_KEY || event.key === null)) latest.current()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])
}

// Reaching localStorage throws when the browser blocks storage; then nothing can have changed for the app
function isLocalStorage(area: Storage | null): boolean {
  try {
    return area === localStorage
  } catch {
    return false
  }
}
