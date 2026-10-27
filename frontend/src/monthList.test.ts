import { describe, expect, it } from 'vitest'
import { shortDate, todosInMonth } from './monthList.ts'
import type { Todo } from './storage.ts'

const todo = (id: string, ...dates: [number, number][]): Todo => ({
  id,
  title: `Gjøremål ${id}`,
  description: '',
  dates: dates.map(([month, day]) => ({ month, day })),
  createdAt: '2026-01-02T09:00:00.000Z',
})

const ids = (todos: readonly Todo[], month: number) => todosInMonth(todos, month).map((item) => item.todo.id)

describe('todosInMonth', () => {
  it('tar bare med gjøremål som har minst én dato i måneden', () => {
    const todos = [todo('mars', [3, 5]), todo('okt', [10, 1]), todo('nov', [11, 1]), todo('begge', [3, 9], [10, 9])]
    expect(ids(todos, 10)).toEqual(['okt', 'begge'])
  })

  it('gir tom liste når ingen gjøremål har dato i måneden, også uten gjøremål', () => {
    expect(todosInMonth([todo('mars', [3, 5])], 10)).toEqual([])
    expect(todosInMonth([], 10)).toEqual([])
  })

  it('gir ett element per gjøremål med bare datoene i måneden, sortert', () => {
    const takrenner = todo('t', [10, 28], [4, 2], [10, 3])
    expect(todosInMonth([takrenner], 10)).toEqual([
      { todo: takrenner, dates: [{ month: 10, day: 3 }, { month: 10, day: 28 }] },
    ])
  })

  it('sorterer etter første dato i måneden, tidligst øverst', () => {
    const todos = [todo('tjuende', [10, 20]), todo('tredje', [10, 3]), todo('femtende', [10, 15])]
    expect(ids(todos, 10)).toEqual(['tredje', 'femtende', 'tjuende'])
  })

  it('bruker den tidligste datoen i måneden, ikke den første i listen', () => {
    const todos = [todo('tiende', [10, 10]), todo('sen-forst', [10, 25], [10, 2])]
    expect(ids(todos, 10)).toEqual(['sen-forst', 'tiende'])
  })

  it('ser bort fra datoer i andre måneder ved sorteringen', () => {
    const todos = [todo('femte', [10, 5]), todo('januar-forst', [1, 1], [10, 6])]
    expect(ids(todos, 10)).toEqual(['femte', 'januar-forst'])
  })

  it('beholder rekkefølgen fra lagringen når første dato er lik', () => {
    const todos = [todo('b', [10, 7]), todo('a', [10, 7])]
    expect(ids(todos, 10)).toEqual(['b', 'a'])
  })
})

describe('shortDate', () => {
  it.each([
    [1, 1, '1. jan'],
    [5, 15, '15. mai'],
    [10, 27, '27. okt'],
    [12, 31, '31. des'],
  ])('viser %i/%i som «%s»', (month, day, expected) => {
    expect(shortDate({ month, day })).toBe(expected)
  })
})
