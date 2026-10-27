import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MonthColumn from './MonthColumn.tsx'
import type { Todo } from './storage.ts'

const todo = (id: string, title: string, description: string, ...dates: [number, number][]): Todo => ({
  id,
  title,
  description,
  dates: dates.map(([month, day]) => ({ month, day })),
  createdAt: '2026-01-02T09:00:00.000Z',
})

const TODOS = [
  todo('a1', 'Dekkskift', 'Bytt til vinterdekk.', [4, 15], [10, 15]),
  todo('b2', 'Vårvask av garasjen', '', [5, 15]),
  todo('c3', 'Rense takrennene', '', [10, 28], [10, 3]),
  todo('d4', 'Bestille feiing', 'Ring kommunen.', [10, 26]),
]

const TODAY = new Date(2026, 9, 26)

const renderColumn = (today = TODAY, todos: readonly Todo[] = TODOS) => render(<MonthColumn today={today} todos={todos} />)
const cards = () => screen.queryAllByRole('article')
const cardTitled = (title: string) => {
  const card = cards().find((element) => within(element).queryByRole('heading', { name: title }) !== null)
  if (!card) throw new Error(`Fant ikke kortet «${title}»`)
  return card
}
const badges = (card: HTMLElement) => [...card.querySelectorAll('.badges > *')].map((badge) => badge.textContent)

describe('MonthColumn', () => {
  it('viser «Denne måneden» og månedsnavnet med stor forbokstav som overskrift', () => {
    renderColumn()
    expect(screen.getByText('Denne måneden')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Oktober' })).toBeInTheDocument()
  })

  it('viser månedsnavnet for datoen den får', () => {
    renderColumn(new Date(2026, 4, 1))
    expect(screen.getByRole('heading', { level: 2, name: 'Mai' })).toBeInTheDocument()
  })

  it('viser bare kort for gjøremål med dato i måneden, sortert etter første dato', () => {
    renderColumn()
    const titles = cards().map((card) => within(card).getByRole('heading', { level: 3 }).textContent)
    expect(titles).toEqual(['Rense takrennene', 'Dekkskift', 'Bestille feiing'])
  })

  it('viser alle datoene i måneden som merker, og ingen fra andre måneder', () => {
    renderColumn()
    expect(badges(cardTitled('Rense takrennene'))).toEqual(['3. okt', '28. okt'])
    expect(badges(cardTitled('Dekkskift'))).toEqual(['15. okt'])
  })

  it('viser beskrivelsen når den er fylt ut', () => {
    renderColumn()
    expect(within(cardTitled('Dekkskift')).getByText('Bytt til vinterdekk.')).toBeInTheDocument()
  })

  it('har ingen beskrivelse når den er tom', () => {
    renderColumn()
    expect(cardTitled('Rense takrennene').querySelector('p')).toBeNull()
  })

  it('setter «I dag ·» foran dagens dato og bare der', () => {
    renderColumn()
    expect(badges(cardTitled('Bestille feiing'))).toEqual(['I dag · 26. okt'])
    expect(screen.getAllByText(/I dag/)).toHaveLength(1)
  })

  it('har ingen «I dag» når ingen gjøremål har dagens dato', () => {
    renderColumn(new Date(2026, 9, 27))
    expect(cards()).toHaveLength(3)
    expect(screen.queryByText(/I dag/)).toBeNull()
  })

  it('gir dagens merke rød kant', () => {
    renderColumn()
    expect(within(cardTitled('Bestille feiing')).getByText('I dag · 26. okt')).toHaveClass('badge', 'autumn', 'today')
  })

  it('gir merkene årstiden til måneden', () => {
    renderColumn(new Date(2026, 4, 1))
    const badge = within(cardTitled('Vårvask av garasjen')).getByText('15. mai')
    expect(badge).toHaveClass('badge', 'spring')
    expect(badge).not.toHaveClass('today')
  })

  it('viser ingen kort når ingen gjøremål har dato i måneden', () => {
    renderColumn(new Date(2026, 0, 10))
    expect(cards()).toHaveLength(0)
  })
})

describe('MonthColumn, klikk på kort', () => {
  it('sender id-en til gjøremålet når kortet klikkes, uansett hvor på kortet', () => {
    const onOpenTodo = vi.fn()
    render(<MonthColumn today={TODAY} todos={TODOS} onOpenTodo={onOpenTodo} />)
    fireEvent.click(cardTitled('Dekkskift'))
    expect(onOpenTodo).toHaveBeenLastCalledWith('a1')
    fireEvent.click(within(cardTitled('Rense takrennene')).getByRole('heading', { level: 3 }))
    expect(onOpenTodo).toHaveBeenLastCalledWith('c3')
    fireEvent.click(within(cardTitled('Bestille feiing')).getByText('I dag · 26. okt'))
    expect(onOpenTodo).toHaveBeenLastCalledWith('d4')
    expect(onOpenTodo).toHaveBeenCalledTimes(3)
  })

  it('kan klikkes uten at noen lytter', () => {
    renderColumn()
    expect(() => {
      fireEvent.click(cardTitled('Dekkskift'))
    }).not.toThrow()
  })
})
