import type { Todo, TodoDate } from './storage.ts'

export interface MonthItem {
  todo: Todo
  dates: TodoDate[]
}

const SHORT_MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des']

export const shortDate = (date: TodoDate) => `${String(date.day)}. ${SHORT_MONTHS[date.month - 1] ?? ''}`

const firstDay = (item: MonthItem) => item.dates[0]?.day ?? 0

// One item per todo with a date in the month, holding only those dates. Sorted by the first
// date in the month; the sort is stable, so equal first dates keep the order from storage.
export function todosInMonth(todos: readonly Todo[], month: number): MonthItem[] {
  return todos
    .map((todo) => ({
      todo,
      dates: todo.dates.filter((date) => date.month === month).sort((a, b) => a.day - b.day),
    }))
    .filter((item) => item.dates.length > 0)
    .sort((a, b) => firstDay(a) - firstDay(b))
}
