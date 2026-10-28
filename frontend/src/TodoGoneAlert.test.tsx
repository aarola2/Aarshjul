import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TodoGoneAlert from './TodoGoneAlert.tsx'

describe('TodoGoneAlert', () => {
  it('sier hvilket gjøremål som ble slettet i en annen fane, som et varsel skjermleseren leser opp', () => {
    render(<TodoGoneAlert title="Dekkskift" onClose={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Gjøremålet «Dekkskift» ble slettet i en annen fane.')
  })

  it('viser tittelen som tekst, også når den ser ut som HTML', () => {
    render(<TodoGoneAlert title="<b>Fet</b>" onClose={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Gjøremålet «<b>Fet</b>» ble slettet i en annen fane.')
    expect(screen.getByRole('alert').querySelector('b')).toBeNull()
  })

  it('«Lukk» lukker varselet', () => {
    const onClose = vi.fn()
    render(<TodoGoneAlert title="Dekkskift" onClose={onClose} />)
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Lukk' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
