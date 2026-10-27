import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TodoFormDialog from './TodoFormDialog.tsx'

const renderForm = () => {
  const onSave = vi.fn()
  const onClose = vi.fn()
  const { container } = render(<TodoFormDialog onSave={onSave} onClose={onClose} />)
  return { onSave, onClose, container }
}

const dialog = () => screen.getByRole('dialog', { name: 'Nytt gjøremål' })
const titleField = () => screen.getByLabelText('Tittel')
const descriptionField = () => screen.getByLabelText(/Beskrivelse/)
const dateField = () => screen.getByLabelText('Dato 1')
const type = (field: HTMLElement, value: string) => {
  fireEvent.change(field, { target: { value } })
}
const save = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Lagre' }))
}
// The native picker is hidden from assistive technology, so it is found through the DOM
const picker = (container: HTMLElement) => {
  const input = container.querySelector<HTMLInputElement>('input[type="date"]')
  if (!input) throw new Error('Fant ikke datovelgeren')
  return input
}

describe('TodoFormDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('åpnes som modal dialog med tittel, valgfri beskrivelse, én dato og kalenderknapp', () => {
    renderForm()
    expect(dialog()).toHaveAttribute('open')
    expect(titleField()).toHaveValue('')
    expect(descriptionField()).toHaveValue('')
    expect(screen.getByText('(valgfri)')).toBeInTheDocument()
    expect(dateField()).toHaveValue('')
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Velg dato 1 i kalender' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Legg til ekstra dato/ })).toBeNull()
  })

  it('lagrer et gyldig gjøremål og viser ingen feil', () => {
    const { onSave } = renderForm()
    type(titleField(), ' Dekkskift ')
    type(descriptionField(), 'Bytt til vinterdekk.')
    type(dateField(), '15/10')
    save()
    expect(onSave).toHaveBeenCalledExactlyOnceWith({
      title: 'Dekkskift',
      description: 'Bytt til vinterdekk.',
      dates: [{ month: 10, day: 15 }],
    })
    expect(screen.queryByText(/påkrevd/)).toBeNull()
  })

  it('viser «Tittel er påkrevd.» ved tittelfeltet og lagrer ikke', () => {
    const { onSave } = renderForm()
    type(dateField(), '15.10')
    save()
    expect(onSave).not.toHaveBeenCalled()
    expect(titleField()).toHaveAttribute('aria-invalid', 'true')
    expect(titleField()).toHaveAccessibleDescription('Tittel er påkrevd.')
    expect(dateField()).toHaveAttribute('aria-invalid', 'false')
    expect(titleField()).toHaveFocus()
  })

  it('viser «Minst én dato er påkrevd.» ved datofeltet og lagrer ikke', () => {
    const { onSave } = renderForm()
    type(titleField(), 'Dekkskift')
    save()
    expect(onSave).not.toHaveBeenCalled()
    expect(dateField()).toHaveAttribute('aria-invalid', 'true')
    expect(dateField()).toHaveAccessibleDescription('Minst én dato er påkrevd.')
    expect(dateField()).toHaveFocus()
  })

  it('viser begge feilene samtidig og flytter fokus til den første', () => {
    renderForm()
    save()
    expect(screen.getByText('Tittel er påkrevd.')).toBeInTheDocument()
    expect(screen.getByText('Minst én dato er påkrevd.')).toBeInTheDocument()
    expect(titleField()).toHaveFocus()
  })

  it('fjerner feilen ved neste lagring når feltet er rettet', () => {
    const { onSave } = renderForm()
    save()
    type(titleField(), 'Dekkskift')
    type(dateField(), '15.10')
    save()
    expect(screen.queryByText('Tittel er påkrevd.')).toBeNull()
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('avviser en dato som ikke finnes, og for lang tittel og beskrivelse', () => {
    const { onSave } = renderForm()
    type(titleField(), 'a'.repeat(61))
    type(descriptionField(), 'b'.repeat(501))
    type(dateField(), '31.04')
    save()
    expect(onSave).not.toHaveBeenCalled()
    expect(titleField()).toHaveAccessibleDescription('Tittelen kan ha maks 60 tegn.')
    expect(descriptionField()).toHaveAccessibleDescription('Beskrivelsen kan ha maks 500 tegn.')
    expect(dateField()).toHaveAccessibleDescription('Skriv datoen som dd.mm, for eksempel 15.05.')
  })

  it.each([
    ['Avbryt', 'Avbryt'],
    ['lukkeknappen', 'Lukk'],
  ])('%s lukker uten å lagre', (_name, button) => {
    const { onSave, onClose } = renderForm()
    type(titleField(), 'Dekkskift')
    type(dateField(), '15.10')
    fireEvent.click(within(dialog()).getByRole('button', { name: button }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('melder fra når nettleseren lukker dialogen, for eksempel med Esc', () => {
    const { onSave, onClose } = renderForm()
    fireEvent(dialog(), new Event('close'))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('åpner datovelgeren med datoen fra tekstfeltet', () => {
    const { container } = renderForm()
    const showPicker = vi.spyOn(HTMLInputElement.prototype, 'showPicker').mockImplementation(() => undefined)
    type(dateField(), '15.10')
    fireEvent.click(screen.getByRole('button', { name: 'Velg dato 1 i kalender' }))
    expect(showPicker).toHaveBeenCalledOnce()
    expect(picker(container).value).toBe(`${String(new Date().getFullYear())}-10-15`)
  })

  it('gir velgeren fokus før den åpnes, så Safari kan lukke den igjen', () => {
    const { container } = renderForm()
    let focusedWhenOpened: Element | null = null
    vi.spyOn(HTMLInputElement.prototype, 'showPicker').mockImplementation(() => {
      focusedWhenOpened = document.activeElement
    })
    fireEvent.click(screen.getByRole('button', { name: 'Velg dato 1 i kalender' }))
    expect(focusedWhenOpened).toBe(picker(container))
    // Choosing a date moves focus away from the picker, which is what closes it
    fireEvent.change(picker(container), { target: { value: '2026-10-05' } })
    expect(picker(container)).not.toHaveFocus()
  })

  it('flytter fokus til velgeren når nettleseren ikke kan vise den', () => {
    const { container } = renderForm()
    vi.spyOn(HTMLInputElement.prototype, 'showPicker').mockImplementation(() => {
      throw new DOMException('Ikke tillatt', 'NotAllowedError')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Velg dato 1 i kalender' }))
    expect(picker(container)).toHaveFocus()
  })

  it('fyller tekstfeltet med dd.mm når en dato velges i velgeren', () => {
    const { container, onSave } = renderForm()
    fireEvent.change(picker(container), { target: { value: '2026-10-05' } })
    expect(dateField()).toHaveValue('05.10')
    expect(dateField()).toHaveFocus()
    type(titleField(), 'Dekkskift')
    save()
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ title: 'Dekkskift', description: '', dates: [{ month: 10, day: 5 }] })
  })

  it('lar tekstfeltet være når velgeren tømmes', () => {
    const { container } = renderForm()
    type(dateField(), '15.10')
    fireEvent.change(picker(container), { target: { value: '' } })
    expect(dateField()).toHaveValue('15.10')
  })
})
