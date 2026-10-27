import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Todo } from './storage.ts'
import TodoViewDialog from './TodoViewDialog.tsx'

const TODO: Todo = {
  id: 'c3',
  title: 'Rense takrennene',
  description: 'Begge sider av huset.\nHusk stigen.',
  dates: [{ month: 10, day: 28 }, { month: 3, day: 20 }, { month: 10, day: 3 }, { month: 6, day: 1 }],
  createdAt: '2026-01-02T09:00:00.000Z',
}

const renderView = (todo: Todo = TODO, today = new Date(2026, 9, 27)) => {
  const onClose = vi.fn()
  render(<TodoViewDialog todo={todo} today={today} onClose={onClose} />)
  return { onClose }
}

const dialog = () => screen.getByRole('dialog', { name: 'Rense takrennene' })
const badges = () => [...dialog().querySelectorAll('.badges > *')]

describe('TodoViewDialog', () => {
  it('åpnes som modal dialog med tittelen som overskrift og navn', () => {
    renderView()
    expect(dialog()).toHaveAttribute('open')
    expect(within(dialog()).getByRole('heading', { level: 2, name: 'Rense takrennene' })).toBeInTheDocument()
  })

  it('viser alle datoene i kalenderrekkefølge, uansett måned', () => {
    renderView()
    expect(badges().map((badge) => badge.textContent)).toEqual(['20. mar', '1. jun', '3. okt', '28. okt'])
  })

  it('gir hvert datomerke årstiden til sin egen måned', () => {
    renderView()
    expect(badges().map((badge) => badge.className)).toEqual([
      'badge spring',
      'badge summer',
      'badge autumn',
      'badge autumn',
    ])
  })

  it('setter «I dag ·» foran dagens dato', () => {
    renderView(TODO, new Date(2026, 9, 3))
    expect(within(dialog()).getByText('I dag · 3. okt')).toHaveClass('today')
    expect(within(dialog()).getAllByText(/I dag/)).toHaveLength(1)
  })

  it('merker ikke samme dag i en annen måned som i dag', () => {
    renderView(TODO, new Date(2026, 2, 3))
    expect(within(dialog()).queryByText(/I dag/)).toBeNull()
  })

  it('viser beskrivelsen når den er fylt ut', () => {
    renderView()
    expect(within(dialog()).getByText(/Begge sider av huset\./)).toHaveTextContent('Begge sider av huset. Husk stigen.', {
      normalizeWhitespace: true,
    })
  })

  it('har ingen beskrivelse når den er tom', () => {
    renderView({ ...TODO, description: '' })
    expect(within(dialog()).queryByText(/Begge sider/)).toBeNull()
    expect(dialog().querySelectorAll('p')).toHaveLength(1)
  })

  it('viser «Gjentas automatisk hvert år»', () => {
    renderView()
    expect(within(dialog()).getByText('↻ Gjentas automatisk hvert år')).toBeInTheDocument()
  })

  it('har Slett og Rediger', () => {
    renderView()
    expect(within(dialog()).getAllByRole('button').map((button) => button.textContent)).toEqual(['×', 'Slett', 'Rediger'])
  })

  it('«Slett» ber om å slette gjøremålet', () => {
    const onDelete = vi.fn()
    render(<TodoViewDialog todo={TODO} today={new Date(2026, 9, 27)} onClose={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Slett' }))
    expect(onDelete).toHaveBeenCalledExactlyOnceWith('c3')
  })

  it('«Rediger» ber om å redigere gjøremålet', () => {
    const onEdit = vi.fn()
    const onClose = vi.fn()
    render(<TodoViewDialog todo={TODO} today={new Date(2026, 9, 27)} onClose={onClose} onEdit={onEdit} />)
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Rediger' }))
    expect(onEdit).toHaveBeenCalledExactlyOnceWith('c3')
  })

  it('lukkes med lukkeknappen', () => {
    const { onClose } = renderView()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Lukk' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('lukkes ved klikk utenfor, det vil si på bakgrunnen rundt dialogen', () => {
    const { onClose } = renderView()
    // A click on the backdrop is reported with the dialog element itself as target
    fireEvent.click(dialog())
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('lukkes ikke ved klikk inne i dialogen', () => {
    const { onClose } = renderView()
    fireEvent.click(within(dialog()).getByRole('heading', { level: 2 }))
    fireEvent.click(within(dialog()).getByText('↻ Gjentas automatisk hvert år'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('lukker med en gang ved Esc, i stedet for å vente på nettleseren', () => {
    const { onClose } = renderView()
    const cancel = new Event('cancel', { cancelable: true })
    fireEvent(dialog(), cancel)
    expect(onClose).toHaveBeenCalledOnce()
    expect(cancel.defaultPrevented).toBe(true)
  })

  it('melder fra når nettleseren lukker dialogen, for eksempel med Esc', () => {
    const { onClose } = renderView()
    fireEvent(dialog(), new Event('close'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('TodoViewDialog, 29. februar', () => {
  const LEAP: Todo = { ...TODO, title: 'Skuddårsdugnad', dates: [{ month: 2, day: 29 }, { month: 5, day: 1 }] }
  const HINT = '29. februar vises som 28. februar i år uten skuddår.'
  const leapDialog = () => screen.getByRole('dialog', { name: 'Skuddårsdugnad' })

  it('viser 29. februar som 28. februar og forklarer det i år uten skuddår', () => {
    render(<TodoViewDialog todo={LEAP} today={new Date(2026, 9, 27)} onClose={vi.fn()} />)
    expect(within(leapDialog()).getByText('28. feb')).toBeInTheDocument()
    expect(within(leapDialog()).getByText(HINT)).toBeInTheDocument()
  })

  it('viser 29. februar uten forklaring i skuddår', () => {
    render(<TodoViewDialog todo={LEAP} today={new Date(2028, 9, 27)} onClose={vi.fn()} />)
    expect(within(leapDialog()).getByText('29. feb')).toBeInTheDocument()
    expect(within(leapDialog()).queryByText(HINT)).toBeNull()
  })

  it('har ingen forklaring når gjøremålet ikke har 29. februar', () => {
    render(<TodoViewDialog todo={TODO} today={new Date(2026, 9, 27)} onClose={vi.fn()} />)
    expect(within(dialog()).queryByText(HINT)).toBeNull()
  })

  it('har ingen forklaring for andre datoer i februar, eller den 29. i andre måneder', () => {
    const february: Todo = { ...LEAP, dates: [{ month: 2, day: 28 }, { month: 2, day: 1 }, { month: 3, day: 29 }] }
    render(<TodoViewDialog todo={february} today={new Date(2026, 9, 27)} onClose={vi.fn()} />)
    expect(within(leapDialog()).queryByText(HINT)).toBeNull()
  })
})
