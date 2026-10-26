export type Season = 'winter' | 'spring' | 'summer' | 'autumn'

export interface Month {
  number: number
  name: string
  season: Season
}

export const MONTHS: readonly Month[] = [
  { number: 1, name: 'januar', season: 'winter' },
  { number: 2, name: 'februar', season: 'winter' },
  { number: 3, name: 'mars', season: 'spring' },
  { number: 4, name: 'april', season: 'spring' },
  { number: 5, name: 'mai', season: 'spring' },
  { number: 6, name: 'juni', season: 'summer' },
  { number: 7, name: 'juli', season: 'summer' },
  { number: 8, name: 'august', season: 'summer' },
  { number: 9, name: 'september', season: 'autumn' },
  { number: 10, name: 'oktober', season: 'autumn' },
  { number: 11, name: 'november', season: 'autumn' },
  { number: 12, name: 'desember', season: 'winter' },
]

// Wheel geometry in a 1000 × 1000 viewBox
export const CENTRE = 500
export const R_OUTER = 480
export const R_BAND = 425
export const R_CENTRE = 105
const R_LABEL = 445
// Labels on the lower half sit a little further out, since they are drawn upside down along the arc
const R_LABEL_FLIPPED = 462

export const R_NUMBER = 388
// The ring for today sits a little inside the other numbers, so it never covers the 1st, 10th or 20th
export const R_TODAY = 356

type Point = [x: number, y: number]

export interface CalendarDay {
  month: number
  day: number
}

export const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

export const daysInYear = (year: number) => (isLeapYear(year) ? 366 : 365)

export const daysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate()

export function dayOfYear(month: number, day: number, year: number): number {
  let index = day - 1
  for (let m = 1; m < month; m++) index += daysInMonth(m, year)
  return index
}

// 0 at 12 o'clock, growing clockwise
export const angleOf = (dayIndex: number, year: number) => (dayIndex / daysInYear(year)) * 2 * Math.PI

// The middle of the day, so the tick stands between the day before and the day after
export const dayAngle = (month: number, day: number, year: number) =>
  angleOf(dayOfYear(month, day, year) + 0.5, year)

export function daysOfYear(year: number): CalendarDay[] {
  return MONTHS.flatMap(({ number: month }) =>
    Array.from({ length: daysInMonth(month, year) }, (_, i) => ({ month, day: i + 1 })),
  )
}

export const hasDayNumber = (day: number) => day === 1 || day === 10 || day === 20

export function tickLength(day: number): number {
  if (day === 1) return 26
  return hasDayNumber(day) ? 18 : 9
}

export const monthStartAngle = (month: number, year: number) => angleOf(dayOfYear(month, 1, year), year)

export const monthEndAngle = (month: number, year: number) =>
  angleOf(dayOfYear(month, 1, year) + daysInMonth(month, year), year)

export function pointOnCircle(radius: number, angle: number): Point {
  return [CENTRE + radius * Math.sin(angle), CENTRE - radius * Math.cos(angle)]
}

export function bandPath(month: number, year: number): string {
  const start = monthStartAngle(month, year)
  const end = monthEndAngle(month, year)
  const [ox0, oy0] = pointOnCircle(R_OUTER, start)
  const [ox1, oy1] = pointOnCircle(R_OUTER, end)
  const [ix1, iy1] = pointOnCircle(R_BAND, end)
  const [ix0, iy0] = pointOnCircle(R_BAND, start)
  return [
    `M ${String(ox0)} ${String(oy0)}`,
    `A ${String(R_OUTER)} ${String(R_OUTER)} 0 0 1 ${String(ox1)} ${String(oy1)}`,
    `L ${String(ix1)} ${String(iy1)}`,
    `A ${String(R_BAND)} ${String(R_BAND)} 0 0 0 ${String(ix0)} ${String(iy0)}`,
    'Z',
  ].join(' ')
}

// Arc for the month name. On the lower half it runs counter-clockwise so the text stays upright.
export function labelArcPath(month: number, year: number): string {
  const start = monthStartAngle(month, year)
  const end = monthEndAngle(month, year)
  const middle = (start + end) / 2
  const flipped = middle > Math.PI / 2 && middle < (3 * Math.PI) / 2
  const radius = flipped ? R_LABEL_FLIPPED : R_LABEL
  const [x0, y0] = pointOnCircle(radius, flipped ? end : start)
  const [x1, y1] = pointOnCircle(radius, flipped ? start : end)
  const sweep = flipped ? 0 : 1
  return `M ${String(x0)} ${String(y0)} A ${String(radius)} ${String(radius)} 0 0 ${String(sweep)} ${String(x1)} ${String(y1)}`
}
