import { describe, expect, it } from 'vitest'
import {
  angleOf,
  dayAngle,
  dayOfYear,
  daysInMonth,
  daysInYear,
  daysOfYear,
  hasDayNumber,
  isLeapYear,
  monthEndAngle,
  monthStartAngle,
  MONTHS,
  pointOnCircle,
  shownDay,
  tickLength,
} from './wheelGeometry.ts'

const degrees = (radians: number) => (radians * 180) / Math.PI

describe('kalender', () => {
  it.each([
    [2024, true],
    [2026, false],
    [1900, false],
    [2000, true],
  ])('%i er skuddår: %s', (year, leap) => {
    expect(isLeapYear(year)).toBe(leap)
    expect(daysInYear(year)).toBe(leap ? 366 : 365)
  })

  it.each([
    [1, 2026, 31],
    [2, 2026, 28],
    [2, 2024, 29],
    [4, 2026, 30],
    [12, 2026, 31],
  ])('måned %i i %i har %i dager', (month, year, days) => {
    expect(daysInMonth(month, year)).toBe(days)
  })

  it.each([
    [1, 1, 2026, 0],
    [2, 1, 2026, 31],
    [3, 1, 2026, 59],
    [3, 1, 2024, 60],
    [12, 31, 2026, 364],
    [12, 31, 2024, 365],
  ])('%i/%i i %i er dag nummer %i (fra 0)', (month, day, year, index) => {
    expect(dayOfYear(month, day, year)).toBe(index)
  })
})

describe('vinkler', () => {
  it('1. januar står kl. 12', () => {
    expect(angleOf(0, 2026)).toBe(0)
    expect(monthStartAngle(1, 2026)).toBe(0)
  })

  it.each([2026, 2024])('begynnelsen av juli står nederst i %i', (year) => {
    expect(Math.abs(degrees(monthStartAngle(7, year)) - 180)).toBeLessThan(2)
  })

  it.each([2026, 2024])('månedene går med klokken rundt hele sirkelen i %i', (year) => {
    for (let month = 1; month <= 12; month++) {
      expect(monthEndAngle(month, year)).toBeGreaterThan(monthStartAngle(month, year))
      if (month < 12) expect(monthStartAngle(month + 1, year)).toBe(monthEndAngle(month, year))
    }
    expect(monthEndAngle(12, year)).toBeCloseTo(2 * Math.PI)
  })

  it('februar er større i skuddår', () => {
    const width = (year: number) => monthEndAngle(2, year) - monthStartAngle(2, year)
    expect(width(2024)).toBeGreaterThan(width(2026))
  })

  it('punkt på sirkelen går med klokken fra kl. 12', () => {
    const [topX, topY] = pointOnCircle(100, 0)
    const [rightX, rightY] = pointOnCircle(100, Math.PI / 2)
    const [bottomX, bottomY] = pointOnCircle(100, Math.PI)
    const [leftX, leftY] = pointOnCircle(100, (3 * Math.PI) / 2)
    expect([topX, topY]).toEqual([500, 400])
    expect(rightX).toBeCloseTo(600)
    expect(rightY).toBeCloseTo(500)
    expect(bottomX).toBeCloseTo(500)
    expect(bottomY).toBeCloseTo(600)
    expect(leftX).toBeCloseTo(400)
    expect(leftY).toBeCloseTo(500)
  })
})

describe('måneder', () => {
  it('har 12 måneder i rekkefølge fra januar', () => {
    expect(MONTHS.map((month) => month.name)).toEqual([
      'januar', 'februar', 'mars', 'april', 'mai', 'juni',
      'juli', 'august', 'september', 'oktober', 'november', 'desember',
    ])
  })

  it('har årstid per måned: vinter des–feb, vår mar–mai, sommer jun–aug, høst sep–nov', () => {
    expect(MONTHS.map((month) => month.season)).toEqual([
      'winter', 'winter', 'spring', 'spring', 'spring', 'summer',
      'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter',
    ])
  })
})

describe('dager', () => {
  it.each([
    [2026, 365, false],
    [2024, 366, true],
  ])('%i har %i dager, 29. februar: %s', (year, count, hasLeapDay) => {
    const days = daysOfYear(year)
    expect(days).toHaveLength(count)
    expect(days[0]).toEqual({ month: 1, day: 1 })
    expect(days.at(-1)).toEqual({ month: 12, day: 31 })
    expect(days.some(({ month, day }) => month === 2 && day === 29)).toBe(hasLeapDay)
  })

  it('gir hver dag bare én gang', () => {
    const keys = daysOfYear(2024).map(({ month, day }) => `${String(month)}.${String(day)}`)
    expect(new Set(keys).size).toBe(366)
  })

  it.each([2026, 2024])('vinkelen midt i dagen øker gjennom hele %i', (year) => {
    const angles = daysOfYear(year).map(({ month, day }) => dayAngle(month, day, year))
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1] ?? Infinity)
    expect(angles[0]).toBeGreaterThan(0)
    expect(angles.at(-1)).toBeLessThan(2 * Math.PI)
  })

  it.each([2026, 2024])('1. januar står kl. 12 og 1. juli nederst i %i', (year) => {
    expect(degrees(dayAngle(1, 1, year))).toBeLessThan(1)
    expect(Math.abs(degrees(dayAngle(7, 1, year)) - 180)).toBeLessThan(2)
  })

  it('bare den 1., 10. og 20. har datotall', () => {
    const numbered = Array.from({ length: 31 }, (_, i) => i + 1).filter(hasDayNumber)
    expect(numbered).toEqual([1, 10, 20])
  })

  it('den 1. har lengst strek, så den 10. og 20., så resten', () => {
    expect(tickLength(1)).toBeGreaterThan(tickLength(10))
    expect(tickLength(10)).toBe(tickLength(20))
    expect(tickLength(20)).toBeGreaterThan(tickLength(2))
    expect(tickLength(2)).toBe(tickLength(31))
  })
})

describe('shownDay', () => {
  it.each([
    [2, 29, 2026, 28],
    [2, 29, 2100, 28],
    [2, 29, 2024, 29],
    [2, 29, 2000, 29],
    [2, 28, 2026, 28],
    [3, 29, 2026, 29],
    [1, 31, 2026, 31],
  ])('%i/%i vises som dag %i i %i', (month, day, year, shown) => {
    expect(shownDay({ month, day }, year)).toBe(shown)
  })
})
