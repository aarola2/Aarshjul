import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CORRUPT_COPY_KEY, keepCorruptCopy, loadTodos, saveTodos, STORAGE_KEY, type Todo } from './storage.ts'

const validTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'a1',
  title: 'Dekkskift',
  description: 'Bytt til vinterdekk.',
  dates: [{ month: 4, day: 15 }, { month: 10, day: 15 }],
  createdAt: '2026-10-26T12:00:00.000Z',
  ...overrides,
})

const storeRaw = (value: string) => {
  localStorage.setItem(STORAGE_KEY, value)
}

const storeTodo = (todo: Record<string, unknown>) => {
  storeRaw(JSON.stringify([todo]))
}

const expectCorrupt = () => {
  const before = localStorage.getItem(STORAGE_KEY)
  expect(loadTodos()).toEqual({ status: 'corrupt', raw: before })
  expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
}

beforeEach(() => {
  localStorage.clear()
})

describe('saveTodos og loadTodos', () => {
  it('leser lagrede gjøremål tilbake likt', () => {
    const todos = [
      validTodo(),
      validTodo({ id: 'b2', title: 'Skuddårsdugnad på hytta – æøå', description: '', dates: [{ month: 2, day: 29 }] }),
    ]
    saveTodos(todos)
    expect(loadTodos()).toEqual({ status: 'ok', todos })
  })

  it('lagrer under nøkkelen aarhjul:v1:todos og ingen andre', () => {
    saveTodos([validTodo()])
    expect(STORAGE_KEY).toBe('aarhjul:v1:todos')
    expect(localStorage.length).toBe(1)
    expect(localStorage.key(0)).toBe('aarhjul:v1:todos')
  })

  it('overskriver forrige liste ved ny lagring', () => {
    saveTodos([validTodo(), validTodo({ id: 'b2' })])
    saveTodos([validTodo({ id: 'b2' })])
    expect(loadTodos()).toEqual({ status: 'ok', todos: [validTodo({ id: 'b2' })] })
  })

  it('gir tom liste når ingenting er lagret', () => {
    expect(loadTodos()).toEqual({ status: 'ok', todos: [] })
  })

  it('gir tom liste når en tom liste er lagret', () => {
    saveTodos([])
    expect(loadTodos()).toEqual({ status: 'ok', todos: [] })
  })
})

describe('loadTodos med ugyldige data', () => {
  it.each([
    ['ugyldig JSON', '[{"id":'],
    ['tom tekst', ''],
    ['objekt i stedet for liste', '{"id":"a1"}'],
    ['null', 'null'],
    ['tall', '42'],
    ['liste med tall', '[1]'],
    ['liste med null', '[null]'],
  ])('%s gir ødelagt', (_name, raw) => {
    storeRaw(raw)
    expectCorrupt()
  })

  it.each<[string, Record<string, unknown>]>([
    ['id er tall', { id: 1 }],
    ['tom id', { id: '' }],
    ['tittel er tall', { title: 5 }],
    ['beskrivelse er null', { description: null }],
    ['datoer er ikke liste', { dates: '15.04' }],
    ['dato er tekst', { dates: ['15.04'] }],
    ['måned er tekst', { dates: [{ month: '4', day: 15 }] }],
    ['dag mangler', { dates: [{ month: 4 }] }],
    ['dato har ekstra felt', { dates: [{ month: 4, day: 15, year: 2026 }] }],
    ['createdAt er tall', { createdAt: 1761480000000 }],
    ['ekstra felt', { color: 'red' }],
  ])('feil felttype: %s gir ødelagt', (_name, overrides) => {
    storeTodo({ ...validTodo(), ...overrides })
    expectCorrupt()
  })

  it.each(['id', 'title', 'description', 'dates', 'createdAt'])('manglende felt %s gir ødelagt', (field) => {
    storeTodo(Object.fromEntries(Object.entries(validTodo()).filter(([key]) => key !== field)))
    expectCorrupt()
  })

  it.each([
    ['31. april', 4, 31],
    ['30. februar', 2, 30],
    ['32. januar', 1, 32],
    ['31. juni', 6, 31],
    ['måned 0', 0, 1],
    ['måned 13', 13, 1],
    ['dag 0', 5, 0],
    ['dag 1,5', 5, 1.5],
    ['negativ dag', 5, -1],
  ])('ugyldig dato %s gir ødelagt', (_name, month, day) => {
    storeTodo({ ...validTodo(), dates: [{ month, day }] })
    expectCorrupt()
  })

  it.each<[string, Record<string, unknown>]>([
    ['tom tittel', { title: '' }],
    ['tittel med 61 tegn', { title: 'x'.repeat(61) }],
    ['beskrivelse med 501 tegn', { description: 'x'.repeat(501) }],
    ['ingen datoer', { dates: [] }],
    ['13 datoer', { dates: Array.from({ length: 13 }, (_, i) => ({ month: (i % 12) + 1, day: i < 12 ? 1 : 2 })) }],
    ['samme dato to ganger', { dates: [{ month: 5, day: 15 }, { month: 5, day: 15 }] }],
    ['ugyldig createdAt', { createdAt: 'i går' }],
    ['createdAt uten tidspunkt', { createdAt: '2026-10-26' }],
  ])('brudd på reglene: %s gir ødelagt', (_name, overrides) => {
    storeTodo({ ...validTodo(), ...overrides })
    expectCorrupt()
  })

  it('samme id på to gjøremål gir ødelagt', () => {
    storeRaw(JSON.stringify([validTodo(), validTodo({ title: 'Annen' })]))
    expectCorrupt()
  })

  it('ett ugyldig gjøremål gjør hele listen ødelagt', () => {
    storeRaw(JSON.stringify([validTodo(), { ...validTodo({ id: 'b2' }), dates: [{ month: 4, day: 31 }] }]))
    expectCorrupt()
  })
})

describe('loadTodos ved grenseverdiene', () => {
  it('godtar 60 tegn i tittel, 500 i beskrivelse og 12 datoer', () => {
    const todo = validTodo({
      title: 'x'.repeat(60),
      description: 'y'.repeat(500),
      dates: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, day: 28 })),
    })
    saveTodos([todo])
    expect(loadTodos()).toEqual({ status: 'ok', todos: [todo] })
  })

  it.each([
    ['29. februar', 2, 29],
    ['31. januar', 1, 31],
    ['30. april', 4, 30],
    ['31. desember', 12, 31],
  ])('godtar %s', (_name, month, day) => {
    const todo = validTodo({ dates: [{ month, day }] })
    saveTodos([todo])
    expect(loadTodos()).toEqual({ status: 'ok', todos: [todo] })
  })

  it('godtar samme dag i to ulike måneder', () => {
    const todo = validTodo({ dates: [{ month: 5, day: 15 }, { month: 6, day: 15 }] })
    saveTodos([todo])
    expect(loadTodos()).toEqual({ status: 'ok', todos: [todo] })
  })
})

describe('grenser for antall gjøremål og lengden på id', () => {
  const many = (count: number) => Array.from({ length: count }, (_, i) => validTodo({ id: `id-${String(i)}` }))

  it('godtar nøyaktig 500 gjøremål', () => {
    storeRaw(JSON.stringify(many(500)))
    expect(loadTodos()).toEqual({ status: 'ok', todos: many(500) })
  })

  it('501 gjøremål gir ødelagt', () => {
    storeRaw(JSON.stringify(many(501)))
    expectCorrupt()
  })

  it('godtar en id på nøyaktig 64 tegn', () => {
    const todo = validTodo({ id: 'a'.repeat(64) })
    storeRaw(JSON.stringify([todo]))
    expect(loadTodos()).toEqual({ status: 'ok', todos: [todo] })
  })

  it('en id på 65 tegn gir ødelagt', () => {
    storeRaw(JSON.stringify([validTodo({ id: 'a'.repeat(65) })]))
    expectCorrupt()
  })
})

describe('lagring som feiler', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saveTodos sier fra når lagringen gikk', () => {
    expect(saveTodos([validTodo()])).toBe(true)
  })

  it.each([
    ['full', 'QuotaExceededError'],
    ['blokkert', 'SecurityError'],
  ])('saveTodos krasjer ikke når lagringen er %s, men sier fra', (_name, error) => {
    saveTodos([validTodo()])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Nei', error)
    })
    expect(saveTodos([validTodo({ id: 'b2' })])).toBe(false)
    vi.restoreAllMocks()
    expect(loadTodos()).toEqual({ status: 'ok', todos: [validTodo()] })
  })

  it('loadTodos gir «blocked» når nettleseren sperrer lagringen', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Sperret', 'SecurityError')
    })
    expect(loadTodos()).toEqual({ status: 'blocked' })
  })
})

describe('keepCorruptCopy', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bruker en egen nøkkel med prosjektnavn og versjon', () => {
    expect(CORRUPT_COPY_KEY).toBe('aarhjul:v1:corrupt-copy')
    expect(CORRUPT_COPY_KEY).not.toBe(STORAGE_KEY)
  })

  it('tar vare på teksten nøyaktig som den var', () => {
    const raw = '[{"id": "a1", "tittel": <b>ødelagt</b>'
    expect(keepCorruptCopy(raw)).toBe(true)
    expect(localStorage.getItem(CORRUPT_COPY_KEY)).toBe(raw)
  })

  it('overskrives ikke når brukeren lagrer noe nytt', () => {
    storeRaw('[{"id":')
    const result = loadTodos()
    if (result.status !== 'corrupt') throw new Error('Forventet ødelagte data')
    keepCorruptCopy(result.raw)
    saveTodos([validTodo()])
    expect(localStorage.getItem(CORRUPT_COPY_KEY)).toBe('[{"id":')
    expect(loadTodos()).toEqual({ status: 'ok', todos: [validTodo()] })
  })

  it('krasjer ikke når lagringen er full, men sier fra', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    expect(keepCorruptCopy('[{"id":')).toBe(false)
  })
})
