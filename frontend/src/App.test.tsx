import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
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
