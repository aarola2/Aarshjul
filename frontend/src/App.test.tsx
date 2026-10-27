import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { STORAGE_KEY } from './storage.ts'

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
