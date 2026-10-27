import type { Todo, TodoDate } from './storage.ts'
import { angleOf, dayOfYear, daysInYear, pointOnCircle, shownDay } from './wheelGeometry.ts'

// Dots lie along the date line between these distances from the centre
export const R_DOT_MIN = 140
export const R_DOT_MAX = 326
export const DOT_SLOTS = 12
// Distance between dot centres that keeps them from overlapping; a dot is 14 wide
export const MIN_DOT_GAP = 18
// Dots more than this many days apart are always at least MIN_DOT_GAP apart
// (8 days at R_DOT_MIN is about 19 units), so only these neighbours need checking
export const NEIGHBOUR_DAYS = 8

export interface PlacedDot {
  todo: Todo
  date: TodoDate
  radius: number
}

interface Candidate extends PlacedDot {
  dayIndex: number
  angle: number
  x: number
  y: number
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

// By id, then by date, so the result depends neither on the order in storage nor on the order of the dates
const byIdThenDay = (a: Candidate, b: Candidate) =>
  a.todo.id < b.todo.id ? -1 : a.todo.id > b.todo.id ? 1 : a.dayIndex - b.dayIndex

function neighbours(placedByDay: Map<number, Candidate[]>, dayIndex: number, days: number): Candidate[] {
  const found: Candidate[] = []
  for (let offset = -NEIGHBOUR_DAYS; offset <= NEIGHBOUR_DAYS; offset++) {
    // The year wraps around: 31 December lies next to 1 January
    found.push(...(placedByDay.get((dayIndex + offset + days) % days) ?? []))
  }
  return found
}

// The slot starts from a hash of the id. Probing to the next free slot guarantees that two dots on
// the same date never share a slot, and a slot that keeps clear of dots on nearby dates is preferred.
export function placeDots(todos: readonly Todo[], year: number): PlacedDot[] {
  const days = daysInYear(year)
  const dots: Candidate[] = todos.flatMap((todo) =>
    todo.dates.map((date) => {
      const dayIndex = dayOfYear(date.month, shownDay(date, year), year)
      return { todo, date, radius: 0, dayIndex, angle: angleOf(dayIndex + 0.5, year), x: 0, y: 0 }
    }),
  )
  const perDay = new Map<number, number>()
  for (const { dayIndex } of dots) perDay.set(dayIndex, (perDay.get(dayIndex) ?? 0) + 1)

  const usedSlots = new Map<number, Set<number>>()
  const placedByDay = new Map<number, Candidate[]>()
  for (const dot of [...dots].sort(byIdThenDay)) {
    const slots = Math.max(DOT_SLOTS, perDay.get(dot.dayIndex) ?? 0)
    const used = usedSlots.get(dot.dayIndex) ?? new Set<number>()
    usedSlots.set(dot.dayIndex, used)
    const nearby = neighbours(placedByDay, dot.dayIndex, days)
    const start = hashId(dot.todo.id) % slots
    const free = Array.from({ length: slots }, (_, k) => (start + k) % slots).filter((slot) => !used.has(slot))
    const isClear = (slot: number) => {
      const [x, y] = pointOnCircle(slotRadius(slot, slots), dot.angle)
      return nearby.every((other) => Math.hypot(other.x - x, other.y - y) >= MIN_DOT_GAP)
    }
    // There are at least as many slots as dots on the date, so a free slot always exists
    const slot = free.find(isClear) ?? free[0] ?? start
    used.add(slot)
    dot.radius = slotRadius(slot, slots)
    const [x, y] = pointOnCircle(dot.radius, dot.angle)
    dot.x = x
    dot.y = y
    placedByDay.set(dot.dayIndex, [...(placedByDay.get(dot.dayIndex) ?? []), dot])
  }

  return dots.map(({ todo, date, radius }) => ({ todo, date, radius }))
}
