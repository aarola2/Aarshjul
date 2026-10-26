import { useEffect, useState } from 'react'

export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

// Today's date from the browser. It moves on at midnight, and is checked again when the tab
// becomes visible, since timers stand still while the computer sleeps.
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    // A new Date each time, so the effect runs again and waits for the next midnight
    const timer = setTimeout(() => {
      setToday(new Date())
    }, msUntilNextMidnight(new Date()))
    const onVisible = () => {
      const now = new Date()
      if (!isSameDay(now, today)) setToday(now)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [today])

  return today
}
