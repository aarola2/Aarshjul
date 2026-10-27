import { describe, expect, it } from 'vitest'
import { loadTodos, saveTodos, type Todo } from './storage.ts'
import {
  createTodo,
  formatDate,
  fromPickerValue,
  parseDate,
  removeTodo,
  toPickerValue,
  updateTodo,
  validateForm,
} from './todoForm.ts'

const FORMAT_ERROR = 'Skriv datoen som dd.mm, for eksempel 15.05.'

const values = (title: string, date: string, description = '') => ({ title, description, dates: [date] })
const withDates = (...dates: string[]) => ({ title: 'Dekkskift', description: '', dates })
const noErrors = { title: undefined, description: undefined, dates: [undefined], group: undefined }

const existing = (id: string): Todo => ({
  id,
  title: 'Finnes fra før',
  description: '',
  dates: [{ month: 1, day: 1 }],
  createdAt: '2026-01-02T09:00:00.000Z',
})

describe('parseDate', () => {
  it.each([
    ['15.10', 10, 15],
    ['15/10', 10, 15],
    ['15-10', 10, 15],
    ['05.03', 3, 5],
    ['5.3', 3, 5],
    [' 15 . 10 ', 10, 15],
    ['15.10.', 10, 15],
    ['31.12', 12, 31],
    ['29.02', 2, 29],
  ])('tolker «%s» som %i/%i', (text, month, day) => {
    expect(parseDate(text)).toEqual({ month, day })
  })

  it.each(['', 'abc', 'neste uke', '1510', '15.10.2026', '15,10', '0.10', '15.0', '15.13', '31.04', '30.02', '32.01', '-1.05'])(
    'avviser «%s»',
    (text) => {
      expect(parseDate(text)).toBeNull()
    },
  )
})

describe('validateForm', () => {
  it('gir utkast med trimmet tittel og beskrivelse og én dato', () => {
    expect(validateForm(values('  Dekkskift ', ' 15.10 ', '  Bytt dekk.  '))).toEqual({
      ok: true,
      draft: { title: 'Dekkskift', description: 'Bytt dekk.', dates: [{ month: 10, day: 15 }] },
    })
  })

  it.each(['', '   '])('krever tittel («%s»)', (title) => {
    expect(validateForm(values(title, '15.10'))).toEqual({ ok: false, errors: { ...noErrors, title: 'Tittel er påkrevd.' } })
  })

  it.each(['', '   '])('krever dato («%s»)', (date) => {
    expect(validateForm(values('Dekkskift', date))).toEqual({
      ok: false,
      errors: { ...noErrors, group: 'Minst én dato er påkrevd.' },
    })
  })

  it('viser begge feilene når både tittel og dato mangler', () => {
    expect(validateForm(values('', ''))).toEqual({
      ok: false,
      errors: { ...noErrors, title: 'Tittel er påkrevd.', group: 'Minst én dato er påkrevd.' },
    })
  })

  it.each(['abc', 'neste uke', '1510', '15.13', '0.10', '15,10'])('avviser datoen «%s» med formatmeldingen', (date) => {
    expect(validateForm(values('Dekkskift', date))).toEqual({ ok: false, errors: { ...noErrors, dates: [FORMAT_ERROR] } })
  })

  it('godtar tittel på 60 tegn og avviser 61, målt etter trimming', () => {
    expect(validateForm(values(` ${'a'.repeat(60)} `, '15.10')).ok).toBe(true)
    expect(validateForm(values('a'.repeat(61), '15.10'))).toEqual({
      ok: false,
      errors: { ...noErrors, title: 'Tittelen kan ha maks 60 tegn.' },
    })
  })

  it('godtar beskrivelse på 500 tegn og avviser 501', () => {
    expect(validateForm(values('Dekkskift', '15.10', 'b'.repeat(500))).ok).toBe(true)
    expect(validateForm(values('Dekkskift', '15.10', 'b'.repeat(501)))).toEqual({
      ok: false,
      errors: { ...noErrors, description: 'Beskrivelsen kan ha maks 500 tegn.' },
    })
  })
})

describe('validateForm, datoer som ikke finnes', () => {
  it.each([
    ['31.04', '31. april finnes ikke i kalenderen.'],
    ['30.02', '30. februar finnes ikke i kalenderen.'],
    ['31/06', '31. juni finnes ikke i kalenderen.'],
    ['32-01', '32. januar finnes ikke i kalenderen.'],
  ])('avviser %s med «%s»', (date, message) => {
    expect(validateForm(values('Dekkskift', date))).toEqual({ ok: false, errors: { ...noErrors, dates: [message] } })
  })

  it.each(['29.02', '29/2', '31.01', '30.04'])('godtar %s', (date) => {
    expect(validateForm(values('Dekkskift', date)).ok).toBe(true)
  })

  it('lagrer 29. februar som 29. februar, uansett år', () => {
    expect(validateForm(values('Skuddårsdugnad', '29.02'))).toMatchObject({ ok: true, draft: { dates: [{ month: 2, day: 29 }] } })
  })
})

describe('validateForm, flere datoer', () => {
  it('gir alle datoene i rekkefølgen de er skrevet inn', () => {
    expect(validateForm(withDates('20.10', '3/10', '1-5'))).toMatchObject({
      ok: true,
      draft: { dates: [{ month: 10, day: 20 }, { month: 10, day: 3 }, { month: 5, day: 1 }] },
    })
  })

  it('ser bort fra tomme datofelt', () => {
    expect(validateForm(withDates('', '15.10', '  '))).toMatchObject({ ok: true, draft: { dates: [{ month: 10, day: 15 }] } })
  })

  it('krever minst én dato også når det er flere tomme felt', () => {
    expect(validateForm(withDates('', ' ', ''))).toEqual({
      ok: false,
      errors: { ...noErrors, dates: [undefined, undefined, undefined], group: 'Minst én dato er påkrevd.' },
    })
  })

  it.each([
    ['15.05', '15.05', '15. mai'],
    ['15.05', '15/5', '15. mai'],
    ['1.1', '01-01', '1. januar'],
  ])('avviser %s og %s som samme dato ved det siste feltet', (first, second, name) => {
    expect(validateForm(withDates(first, second))).toEqual({
      ok: false,
      errors: { ...noErrors, dates: [undefined, `${name} er allerede lagt inn på dette gjøremålet.`] },
    })
  })

  it('melder hvert duplikat og hver ugyldige dato ved sitt eget felt', () => {
    expect(validateForm(withDates('15.05', 'abc', '15.05', '1.6', '15.5'))).toMatchObject({
      ok: false,
      errors: {
        dates: [
          undefined,
          FORMAT_ERROR,
          '15. mai er allerede lagt inn på dette gjøremålet.',
          undefined,
          '15. mai er allerede lagt inn på dette gjøremålet.',
        ],
        group: undefined,
      },
    })
  })

  it('godtar like dag i ulike måneder', () => {
    expect(validateForm(withDates('15.05', '15.06')).ok).toBe(true)
  })

  it('godtar 12 datoer og avviser 13', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `1.${String(i + 1)}`)
    expect(validateForm(withDates(...twelve)).ok).toBe(true)
    expect(validateForm(withDates(...twelve, '2.1'))).toMatchObject({
      ok: false,
      errors: { group: 'Maks 12 datoer per gjøremål.' },
    })
  })

  it('teller ikke tomme felt mot grensen på 12', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `1.${String(i + 1)}`)
    expect(validateForm(withDates(...twelve, '')).ok).toBe(true)
  })
})

describe('createTodo', () => {
  const draft = { title: 'Dekkskift', description: '', dates: [{ month: 10, day: 15 }] }
  const now = new Date('2026-10-27T08:30:00.000Z')

  it('lager gjøremålet med ny id og tidspunktet det ble opprettet', () => {
    expect(createTodo(draft, [], now, () => 'ny-id')).toEqual({ id: 'ny-id', ...draft, createdAt: '2026-10-27T08:30:00.000Z' })
  })

  it('lager ny id hvis den første kolliderer med et gjøremål som finnes', () => {
    const ids = ['b2', 'a1', 'c3']
    const todo = createTodo(draft, [existing('a1'), existing('b2')], now, () => ids.shift() ?? '')
    expect(todo.id).toBe('c3')
  })

  it('kan bruke id-en til et slettet gjøremål på nytt uten kollisjon', () => {
    // a1 was deleted, so only b2 is left
    expect(createTodo(draft, [existing('b2')], now, () => 'a1').id).toBe('a1')
  })

  it('gir unike id-er med nettleserens generator, også mot eksisterende', () => {
    const todos: Todo[] = [existing('a1')]
    for (let i = 0; i < 50; i++) todos.push(createTodo(draft, todos, now))
    expect(new Set(todos.map((todo) => todo.id)).size).toBe(51)
  })

  it('gir et gjøremål som lagringen godtar ved neste innlasting', () => {
    const todo = createTodo({ title: 'Skuddårsdugnad', description: 'Hvert år', dates: [{ month: 2, day: 29 }] }, [], now)
    saveTodos([todo])
    expect(loadTodos()).toEqual({ status: 'ok', todos: [todo] })
    localStorage.clear()
  })
})

describe('datovelgeren', () => {
  it('gjør teksten om til verdien velgeren bruker, i året den får', () => {
    expect(toPickerValue('5.3', 2026)).toBe('2026-03-05')
    expect(toPickerValue('15/10', 2027)).toBe('2027-10-15')
  })

  it('gir tom verdi når teksten ikke er en dato', () => {
    expect(toPickerValue('', 2026)).toBe('')
    expect(toPickerValue('31.04', 2026)).toBe('')
  })

  it('gjør verdien fra velgeren om til dd.mm', () => {
    expect(fromPickerValue('2026-10-05')).toBe('05.10')
    expect(fromPickerValue('')).toBe('')
  })
})

describe('formatDate', () => {
  it.each([
    [5, 1, '01.05'],
    [10, 15, '15.10'],
    [2, 29, '29.02'],
  ])('viser %i/%i som «%s», som kan leses inn igjen', (month, day, text) => {
    expect(formatDate({ month, day })).toBe(text)
    expect(parseDate(text)).toEqual({ month, day })
  })
})

describe('updateTodo', () => {
  const todos: Todo[] = [existing('a1'), { ...existing('b2'), title: 'Dekkskift' }, existing('c3')]
  const draft = { title: 'Dekkskift, vinter', description: 'Piggfritt.', dates: [{ month: 11, day: 1 }] }

  it('bytter tittel, beskrivelse og datoer, og beholder id, tidspunkt og plass', () => {
    const next = updateTodo(todos, 'b2', draft)
    expect(next).toEqual([todos[0], { id: 'b2', ...draft, createdAt: '2026-01-02T09:00:00.000Z' }, todos[2]])
  })

  it('lar de andre gjøremålene være de samme objektene', () => {
    const next = updateTodo(todos, 'b2', draft)
    expect(next[0]).toBe(todos[0])
    expect(next[2]).toBe(todos[2])
  })

  it('endrer ikke listen den får', () => {
    const before = structuredClone(todos)
    updateTodo(todos, 'b2', draft)
    expect(todos).toEqual(before)
  })

  it('gir samme innhold når id-en ikke finnes', () => {
    expect(updateTodo(todos, 'finnes-ikke', draft)).toEqual(todos)
  })

  it('gir et gjøremål som lagringen godtar ved neste innlasting', () => {
    saveTodos(updateTodo(todos, 'b2', draft))
    expect(loadTodos()).toMatchObject({ status: 'ok', todos: [{ id: 'a1' }, { id: 'b2', title: 'Dekkskift, vinter' }, { id: 'c3' }] })
    localStorage.clear()
  })
})

describe('removeTodo', () => {
  const todos: Todo[] = [existing('a1'), existing('b2'), existing('c3')]

  it('fjerner bare gjøremålet med id-en, og de andre beholder rekkefølgen', () => {
    expect(removeTodo(todos, 'b2')).toEqual([todos[0], todos[2]])
  })

  it('endrer ikke listen den får', () => {
    removeTodo(todos, 'b2')
    expect(todos.map((todo) => todo.id)).toEqual(['a1', 'b2', 'c3'])
  })

  it('gir samme innhold når id-en ikke finnes', () => {
    expect(removeTodo(todos, 'finnes-ikke')).toEqual(todos)
  })

  it('gir tom liste når det siste gjøremålet slettes, og lagringen godtar den', () => {
    const next = removeTodo([existing('a1')], 'a1')
    expect(next).toEqual([])
    saveTodos(next)
    expect(loadTodos()).toEqual({ status: 'ok', todos: [] })
    localStorage.clear()
  })

  it('lar et nytt gjøremål få en id som ikke kolliderer med de som er igjen', () => {
    const left = removeTodo(todos, 'b2')
    const ids = ['a1', 'c3', 'b2']
    const created = createTodo({ title: 'Ny', description: '', dates: [{ month: 1, day: 1 }] }, left, new Date(), () => ids.shift() ?? '')
    expect(created.id).toBe('b2')
  })
})
