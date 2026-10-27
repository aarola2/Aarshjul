import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { loadTodos, STORAGE_KEY } from './storage.ts'

describe('App', () => {
  it('viser overskriften Årshjul', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Årshjul' })).toBeInTheDocument()
  })

  it('viser underteksten i toppfeltet', () => {
    render(<App />)
    expect(screen.getByRole('banner')).toHaveTextContent('Faste gjøremål som kommer igjen hvert år')
  })

  it('viser hjulet og sidekolonnen «Denne måneden»', () => {
    render(<App />)
    expect(screen.getByRole('group', { name: 'Årshjul med gjøremål' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Denne måneden' })).toBeInTheDocument()
  })
})

describe('App, gjøremål fra lagringen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('viser en prikk per dato for lagrede gjøremål', () => {
    const todos = [
      { id: 'a1', title: 'Dekkskift', description: '', dates: [{ month: 4, day: 15 }, { month: 10, day: 15 }], createdAt: '2026-01-02T09:00:00.000Z' },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
    render(<App />)
    expect(screen.getAllByTestId('prikk')).toHaveLength(2)
  })

  it.each([
    ['tom lagring', null],
    ['ødelagte data', '[{"id":'],
  ])('viser hjulet uten prikker ved %s', (_name, raw) => {
    if (raw !== null) localStorage.setItem(STORAGE_KEY, raw)
    render(<App />)
    expect(screen.getByRole('group', { name: 'Årshjul med gjøremål' })).toBeInTheDocument()
    expect(screen.queryAllByTestId('prikk')).toHaveLength(0)
  })
})

describe('App, sidekolonnen for inneværende måned', () => {
  const todo = (id: string, title: string, ...dates: [number, number][]) => ({
    id,
    title,
    description: '',
    dates: dates.map(([month, day]) => ({ month, day })),
    createdAt: '2026-01-02T09:00:00.000Z',
  })

  beforeEach(() => {
    localStorage.clear()
    // Only Date is faked, so React keeps its own timers
    vi.useFakeTimers({ toFake: ['Date'] })
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        todo('m1', 'Vårvask', [3, 1]),
        todo('o2', 'Rense takrennene', [10, 20], [3, 2]),
        todo('o3', 'Dekkskift', [4, 15], [10, 5]),
        todo('n4', 'Julekort', [11, 1]),
      ]),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const cardTitles = () =>
    within(screen.getByRole('complementary', { name: 'Denne måneden' }))
      .queryAllByRole('article')
      .map((card) => within(card).getByRole('heading', { level: 3 }).textContent)

  it.each([
    ['oktober', new Date(2026, 9, 31, 23, 59), 'Oktober', ['Dekkskift', 'Rense takrennene']],
    ['november', new Date(2026, 10, 1, 0, 0), 'November', ['Julekort']],
    ['mars', new Date(2026, 2, 15), 'Mars', ['Vårvask', 'Rense takrennene']],
  ])('viser gjøremålene for %s ut fra nettleserens dato', (_name, now, heading, titles) => {
    vi.setSystemTime(now)
    render(<App />)
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
    expect(cardTitles()).toEqual(titles)
  })
})

describe('App, nytt gjøremål', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27, 12, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const openForm = () => {
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til nytt gjøremål' }))
    return screen.getByRole('dialog', { name: 'Nytt gjøremål' })
  }
  const fill = (title: string, date: string) => {
    fireEvent.change(screen.getByLabelText('Tittel'), { target: { value: title } })
    fireEvent.change(screen.getByLabelText('Dato 1'), { target: { value: date } })
  }
  const save = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Lagre' }))
  }
  const column = () => screen.getByRole('complementary', { name: 'Denne måneden' })

  it('har knappen «+ Legg til nytt gjøremål» i toppfeltet, og skjemaet er lukket fra start', () => {
    render(<App />)
    expect(within(screen.getByRole('banner')).getByRole('button', { name: '+ Legg til nytt gjøremål' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lagrer et gyldig gjøremål og viser det med en gang på hjulet og i sidekolonnen', () => {
    render(<App />)
    openForm()
    fill('Dekkskift', '15.10')
    save()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getAllByTestId('prikk')).toHaveLength(1)
    expect(within(column()).getByRole('heading', { level: 3, name: 'Dekkskift' })).toBeInTheDocument()
    const stored = loadTodos()
    expect(stored).toMatchObject({
      status: 'ok',
      todos: [{ title: 'Dekkskift', description: '', dates: [{ month: 10, day: 15 }], createdAt: new Date(2026, 9, 27, 12, 0).toISOString() }],
    })
  })

  it('legger det nye gjøremålet til de som er lagret fra før', () => {
    const before = [
      { id: 'a1', title: 'Vårvask', description: '', dates: [{ month: 5, day: 1 }], createdAt: '2026-01-02T09:00:00.000Z' },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(before))
    render(<App />)
    openForm()
    fill('Dekkskift', '15.10')
    save()
    const stored = loadTodos()
    expect(stored.status === 'ok' && stored.todos.map((todo) => todo.title)).toEqual(['Vårvask', 'Dekkskift'])
    expect(screen.getAllByTestId('prikk')).toHaveLength(2)
  })

  it.each([
    ['uten tittel', '', '15.10', 'Tittel er påkrevd.'],
    ['uten dato', 'Dekkskift', '', 'Minst én dato er påkrevd.'],
    ['med ugyldig dato', 'Dekkskift', '31.04', 'Skriv datoen som dd.mm, for eksempel 15.05.'],
  ])('lagrer ingenting %s', (_name, title, date, message) => {
    render(<App />)
    openForm()
    fill(title, date)
    save()
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nytt gjøremål' })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.queryAllByTestId('prikk')).toHaveLength(0)
  })

  it('lagrer et gjøremål med to datoer som to prikker og ett kort', () => {
    render(<App />)
    openForm()
    fill('Rense takrennene', '3.10')
    fireEvent.click(screen.getByRole('button', { name: '+ Legg til ekstra dato' }))
    fireEvent.change(screen.getByLabelText('Dato 2'), { target: { value: '20.10' } })
    save()
    expect(screen.getAllByTestId('prikk')).toHaveLength(2)
    const cards = within(column()).getAllByRole('article')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveTextContent('3. okt20. okt')
    const stored = loadTodos()
    expect(stored.status === 'ok' && stored.todos[0]?.dates).toEqual([{ month: 10, day: 3 }, { month: 10, day: 20 }])
  })

  it('«Avbryt» lukker uten å lagre, og skjemaet er tomt neste gang', () => {
    render(<App />)
    openForm()
    fill('Dekkskift', '15.10')
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.queryAllByTestId('prikk')).toHaveLength(0)
    openForm()
    expect(screen.getByLabelText('Tittel')).toHaveValue('')
    expect(screen.getByLabelText('Dato 1')).toHaveValue('')
  })
})
