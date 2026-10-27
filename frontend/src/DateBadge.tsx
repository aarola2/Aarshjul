import { shortDate } from './monthList.ts'
import type { TodoDate } from './storage.ts'
import { MONTHS } from './wheelGeometry.ts'

interface DateBadgeProps {
  date: TodoDate
  today: Date
}

// A date in the colour of its season. Today's date gets «I dag ·» and a red border.
export default function DateBadge({ date, today }: DateBadgeProps) {
  const season = MONTHS[date.month - 1]?.season ?? ''
  const isToday = date.month === today.getMonth() + 1 && date.day === today.getDate()
  return (
    <span className={`badge ${season}${isToday ? ' today' : ''}`}>
      {isToday ? `I dag · ${shortDate(date)}` : shortDate(date)}
    </span>
  )
}
