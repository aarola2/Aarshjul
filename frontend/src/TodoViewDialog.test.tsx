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

  it('har ikke Rediger og Slett ennå', () => {
    renderView()
    expect(within(dialog()).getAllByRole('button')).toHaveLength(1)
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

  it('melder fra når nettleseren lukker dialogen, for eksempel med Esc', () => {
    const { onClose } = renderView()
    fireEvent(dialog(), new Event('close'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
