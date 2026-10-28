import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDeleteDialog from './ConfirmDeleteDialog.tsx'

const renderConfirm = (title = 'Rense takrennene') => {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  render(<ConfirmDeleteDialog title={title} onConfirm={onConfirm} onClose={onClose} />)
  return { onConfirm, onClose }
}

const dialog = () => screen.getByRole('dialog', { name: 'Er du sikker?' })

describe('ConfirmDeleteDialog', () => {
  it('åpnes som modal dialog «Er du sikker?» med tittelen til gjøremålet', () => {
    renderConfirm()
    expect(dialog()).toHaveAttribute('open')
    expect(within(dialog()).getByRole('heading', { level: 2, name: 'Er du sikker?' })).toBeInTheDocument()
    expect(dialog()).toHaveAccessibleDescription('«Rense takrennene» slettes. Dette kan ikke angres.')
  })

  it('viser tittelen som tekst, også når den ser ut som HTML', () => {
    renderConfirm('<b>Fet</b>')
    expect(within(dialog()).getByText('«<b>Fet</b>» slettes. Dette kan ikke angres.')).toBeInTheDocument()
    expect(dialog().querySelector('b')).toBeNull()
  })

  it('gir «Avbryt» fokus, så et uhell ikke sletter', () => {
    renderConfirm()
    expect(within(dialog()).getByRole('button', { name: 'Avbryt' })).toHaveFocus()
  })

  it('«Ja, slett» bekrefter', () => {
    const { onConfirm, onClose } = renderConfirm()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Ja, slett' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
  })

  it.each([
    ['Avbryt', 'Avbryt'],
    ['lukkeknappen', 'Lukk'],
  ])('%s lukker uten å slette', (_name, button) => {
    const { onConfirm, onClose } = renderConfirm()
    fireEvent.click(within(dialog()).getByRole('button', { name: button }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('lukker med en gang ved Esc, i stedet for å vente på nettleseren', () => {
    const { onConfirm, onClose } = renderConfirm()
    const cancel = new Event('cancel', { cancelable: true })
    fireEvent(dialog(), cancel)
    expect(onClose).toHaveBeenCalledOnce()
    expect(cancel.defaultPrevented).toBe(true)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('melder fra når nettleseren lukker dialogen, for eksempel med Esc', () => {
    const { onConfirm, onClose } = renderConfirm()
    fireEvent(dialog(), new Event('close'))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('viser et varsel når slettingen ikke kunne lagres', () => {
    render(<ConfirmDeleteDialog title="Dekkskift" hasDeleteFailed onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(within(dialog()).getByRole('alert')).toHaveTextContent(
      'Kunne ikke slette. Lagringen i nettleseren er full eller blokkert.',
    )
  })

  it('har ikke noe varsel så lenge slettingen ikke har feilet', () => {
    renderConfirm()
    expect(within(dialog()).queryByRole('alert')).toBeNull()
  })
})
