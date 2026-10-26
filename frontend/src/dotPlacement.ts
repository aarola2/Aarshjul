import type { Todo, TodoDate } from './storage.ts'
import { dayAngle, dayOfYear, pointOnCircle } from './wheelGeometry.ts'

// Dots lie along the date line between these distances from the centre
export const R_DOT_MIN = 140
export const R_DOT_MAX = 326
export const DOT_SLOTS = 12
// Distance between dot centres that keeps them from overlapping; a dot is 14 wide
export const MIN_DOT_GAP = 18

export interface PlacedDot {
  todo: Todo
  date: TodoDate
  radius: number
}

interface Candidate extends PlacedDot {
  dayIndex: number
}

// FNV-1a: a small, stable hash, so the same id always gets the same starting slot
export function hashId(id: string): number {
  let hash = 0x811c9dc5
  for (const char of id) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

const slotRadius = (slot: number, slots: number) => R_DOT_MIN + ((slot + 0.5) * (R_DOT_MAX - R_DOT_MIN)) / slots

function distance(a: Candidate, b: Candidate, year: number): number {
  const [ax, ay] = pointOnCircle(a.radius, dayAngle(a.date.month, a.date.day, year))
  const [bx, by] = pointOnCircle(b.radius, dayAngle(b.date.month, b.date.day, year))
  return Math.hypot(ax - bx, ay - by)
}

// The slot starts from a hash of the id. Probing to the next free slot guarantees that two dots on
// the same date never share a slot, and a slot that keeps clear of dots on nearby dates is preferred.
// Todos are handled in id order, so the result does not depend on the order in storage.
export function placeDots(todos: readonly Todo[], year: number): PlacedDot[] {
  const dots: Candidate[] = todos.flatMap((todo) =>
    todo.dates.map((date) => ({ todo, date, radius: 0, dayIndex: dayOfYear(date.month, date.day, year) })),
  )
  const perDay = new Map<number, number>()
  for (const { dayIndex } of dots) perDay.set(dayIndex, (perDay.get(dayIndex) ?? 0) + 1)

  // The sort is stable, so the dates of one todo keep their order
  const inIdOrder = [...dots].sort((a, b) => (a.todo.id < b.todo.id ? -1 : a.todo.id > b.todo.id ? 1 : 0))
  const usedSlots = new Map<number, Set<number>>()
  const placed: Candidate[] = []
  for (const dot of inIdOrder) {
    const slots = Math.max(DOT_SLOTS, perDay.get(dot.dayIndex) ?? 0)
    const used = usedSlots.get(dot.dayIndex) ?? new Set<number>()
    usedSlots.set(dot.dayIndex, used)
    const start = hashId(dot.todo.id) % slots
    const free = Array.from({ length: slots }, (_, k) => (start + k) % slots).filter((slot) => !used.has(slot))
    const isClear = (slot: number) =>
      placed.every((other) => distance(other, { ...dot, radius: slotRadius(slot, slots) }, year) >= MIN_DOT_GAP)
    // There are at least as many slots as dots on the date, so a free slot always exists
    const slot = free.find(isClear) ?? free[0] ?? start
    used.add(slot)
    dot.radius = slotRadius(slot, slots)
    placed.push(dot)
  }

  return dots.map(({ todo, date, radius }) => ({ todo, date, radius }))
}
