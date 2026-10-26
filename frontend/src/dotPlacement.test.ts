import { describe, expect, it } from 'vitest'
import { DOT_SLOTS, hashId, MIN_DOT_GAP, placeDots, R_DOT_MAX, R_DOT_MIN } from './dotPlacement.ts'
import type { Todo } from './storage.ts'
import { dayAngle, dayOfYear, pointOnCircle } from './wheelGeometry.ts'

const todo = (id: string, ...dates: [number, number][]): Todo => ({
  id,
  title: `Gjøremål ${id}`,
  description: '',
  dates: dates.map(([month, day]) => ({ month, day })),
  createdAt: '2026-01-02T09:00:00.000Z',
})

// Ids whose hash gives the same starting slot, so they all compete for one place
function idsWithSameStart(count: number, slots = DOT_SLOTS): string[] {
  const ids: string[] = []
  const target = hashId('start') % slots
  for (let n = 0; ids.length < count; n++) {
    if (hashId(`id-${String(n)}`) % slots === target) ids.push(`id-${String(n)}`)
  }
  return ids
}

// Small seeded random generator, so the random test is the same every run
function random(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const position = (dot: { date: { month: number; day: number }; radius: number }, year = 2026) =>
  `${String(dayOfYear(dot.date.month, dot.date.day, year))}:${String(dot.radius)}`

const expectAllPositionsDifferent = (todos: readonly Todo[], year = 2026) => {
  const positions = placeDots(todos, year).map((dot) => position(dot, year))
  expect(new Set(positions).size).toBe(positions.length)
}

describe('hashId', () => {
  it('gir FNV-1a-verdiene for kjente tekster', () => {
    expect(hashId('')).toBe(0x811c9dc5)
    expect(hashId('a')).toBe(0xe40c292c)
    expect(hashId('foobar')).toBe(0xbf9cf968)
  })

  it('gir alltid samme verdi for samme id', () => {
    expect(hashId('b7x2')).toBe(hashId('b7x2'))
    expect(hashId('b7x2')).not.toBe(hashId('b7x3'))
  })
})

describe('placeDots', () => {
  it('gir én plassering per dato, i samme rekkefølge som gjøremålene og datoene', () => {
    const todos = [todo('b', [4, 15], [10, 15]), todo('a', [5, 15])]
    const placed = placeDots(todos, 2026)
    expect(placed.map(({ todo: { id }, date }) => `${id} ${String(date.month)}.${String(date.day)}`)).toEqual([
      'b 4.15',
      'b 10.15',
      'a 5.15',
    ])
  })

  it('legger flere gjøremål på samme dato på ulike steder langs linjen, innenfor hjulet', () => {
    const placed = placeDots([todo('a1', [10, 15]), todo('b2', [10, 15]), todo('c3', [10, 15])], 2026)
    expect(new Set(placed.map((dot) => dot.radius)).size).toBe(3)
    for (const dot of placed) {
      expect(dot.radius).toBeGreaterThanOrEqual(R_DOT_MIN)
      expect(dot.radius).toBeLessThanOrEqual(R_DOT_MAX)
    }
  })

  it('gir samme plassering per id uansett rekkefølge i listen', () => {
    const todos = [
      todo('q4m8', [10, 1]),
      todo('b7x2', [10, 15], [4, 15]),
      todo('h3k9', [10, 15]),
      todo('z1z1', [10, 16]),
      todo('a0a0', [10, 15], [10, 14]),
    ]
    const byId = (list: readonly Todo[]) =>
      Object.fromEntries(placeDots(list, 2026).map((dot) => [`${dot.todo.id} ${position(dot)}`, true]))
    const shuffled = [todos[2], todos[4], todos[0], todos[3], todos[1]].filter((t) => t !== undefined)
    expect(byId([...todos].reverse())).toEqual(byId(todos))
    expect(byId(shuffled)).toEqual(byId(todos))
  })

  it('sprer prikker på nabodatoer så de ikke overlapper når det er plass', () => {
    const [first = '', second = ''] = idsWithSameStart(2)
    const placed = placeDots([todo(first, [10, 15]), todo(second, [10, 16])], 2026)
    const [a, b] = placed.map((dot) => pointOnCircle(dot.radius, dayAngle(dot.date.month, dot.date.day, 2026)))
    if (!a || !b) throw new Error('Mangler prikker')
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThanOrEqual(MIN_DOT_GAP)
  })

  it('kvalitetskrav: 30 gjøremål med samme startplass på samme dato får 30 ulike plasser', () => {
    const ids = idsWithSameStart(30)
    expect(new Set(ids.map((id) => hashId(id) % DOT_SLOTS)).size).toBe(1)
    expectAllPositionsDifferent(ids.map((id) => todo(id, [5, 17])))
  })

  it('kvalitetskrav: 100 gjøremål på samme dato får 100 ulike plasser innenfor hjulet', () => {
    const todos = Array.from({ length: 100 }, (_, i) => todo(`t${String(i)}`, [12, 24]))
    expectAllPositionsDifferent(todos)
    for (const dot of placeDots(todos, 2026)) {
      expect(dot.radius).toBeGreaterThan(R_DOT_MIN)
      expect(dot.radius).toBeLessThan(R_DOT_MAX)
    }
  })

  it('kvalitetskrav: 200 tilfeldige lister gir aldri to prikker på samme plass', () => {
    const next = random(42)
    for (let run = 0; run < 200; run++) {
      const year = run % 2 === 0 ? 2026 : 2024
      const todos = Array.from({ length: 1 + Math.floor(next() * 40) }, (_, i) => {
        const dates = new Map<string, [number, number]>()
        const count = 1 + Math.floor(next() * 4)
        while (dates.size < count) {
          // A narrow window of dates, so many todos share dates
          const month = 3 + Math.floor(next() * 2)
          const day = 1 + Math.floor(next() * 5)
          dates.set(`${String(month)}.${String(day)}`, [month, day])
        }
        return todo(`r${String(run)}-${String(i)}`, ...dates.values())
      })
      expectAllPositionsDifferent(todos, year)
    }
  })
})
