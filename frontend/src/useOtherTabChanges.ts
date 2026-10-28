import { useEffect, useRef } from 'react'
import { STORAGE_KEY } from './storage.ts'

// Calls onChange when another tab has changed the todos. The browser sends the storage event only to the
// other tabs, never to the one that wrote. The key is null when another tab cleared all of storage.
export function useOtherTabChanges(onChange: () => void) {
  const latest = useRef(onChange)
  useEffect(() => {
    latest.current = onChange
  })
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) latest.current()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])
}
