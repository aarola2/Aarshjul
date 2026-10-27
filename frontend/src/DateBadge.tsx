import { shortDate } from './monthList.ts'
import type { TodoDate } from './storage.ts'
import { MONTHS, shownDay } from './wheelGeometry.ts'

interface DateBadgeProps {
  date: TodoDate
  today: Date
}

// A date in the colour of its season. Today's date gets «I dag ·» and a red border.
// 29 February is shown, and counts as today, on 28 February in years without a leap day.
export default function DateBadge({ date, today }: DateBadgeProps) {
  const season = MONTHS[date.month - 1]?.season ?? ''
  const shown = { month: date.month, day: shownDay(date, today.getFullYear()) }
  const isToday = shown.month === today.getMonth() + 1 && shown.day === today.getDate()
  return (
    <span className={`badge ${season}${isToday ? ' today' : ''}`}>
      {isToday ? `I dag · ${shortDate(shown)}` : shortDate(shown)}
    </span>
  )
}
