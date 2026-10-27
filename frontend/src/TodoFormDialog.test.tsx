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

describe('TodoFormDialog, flere datoer', () => {
  const dateFields = () => screen.getAllByLabelText(/^Dato \d+$/)
  const nthDate = (n: number) => screen.getByLabelText(`Dato ${String(n)}`)
  const addButton = () => screen.queryByRole('button', { name: '+ Legg til ekstra dato' })
  const addDate = () => {
    const button = addButton()
    if (!button) throw new Error('Knappen «+ Legg til ekstra dato» mangler')
    fireEvent.click(button)
  }
  const removeDate = (n: number) => {
    fireEvent.click(screen.getByRole('button', { name: `Fjern dato ${String(n)}` }))
  }
  const datePickers = (container: HTMLElement) => [...container.querySelectorAll<HTMLInputElement>('input[type="date"]')]

  it('har ingen «Fjern» når det bare er én dato', () => {
    renderForm()
    expect(screen.queryByRole('button', { name: /Fjern/ })).toBeNull()
  })

  it('«+ Legg til ekstra dato» legger til et tomt felt som får fokus, med egen kalender og «Fjern»', () => {
    renderForm()
    type(nthDate(1), '15.10')
    addDate()
    expect(dateFields()).toHaveLength(2)
    expect(nthDate(1)).toHaveValue('15.10')
    expect(nthDate(2)).toHaveValue('')
    expect(nthDate(2)).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Velg dato 2 i kalender' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fjern dato 1' })).toHaveTextContent('Fjern')
    expect(screen.getByRole('button', { name: 'Fjern dato 2' })).toBeInTheDocument()
  })

  it('«Fjern» tar bort riktig felt, nummererer på nytt og gir fokus til feltet før', () => {
    renderForm()
    addDate()
    addDate()
    type(nthDate(1), '1.1')
    type(nthDate(2), '2.2')
    type(nthDate(3), '3.3')
    removeDate(2)
    expect(dateFields().map((field) => (field as HTMLInputElement).value)).toEqual(['1.1', '3.3'])
    expect(nthDate(1)).toHaveFocus()
    removeDate(1)
    expect(dateFields().map((field) => (field as HTMLInputElement).value)).toEqual(['3.3'])
    expect(nthDate(1)).toHaveFocus()
    expect(screen.queryByRole('button', { name: /Fjern/ })).toBeNull()
  })

  it('lagrer alle datoene og hopper over tomme felt', () => {
    const { onSave } = renderForm()
    type(titleField(), 'Rense takrennene')
    type(nthDate(1), '20.10')
    addDate()
    addDate()
    type(nthDate(3), '3/10')
    save()
    expect(onSave).toHaveBeenCalledExactlyOnceWith({
      title: 'Rense takrennene',
      description: '',
      dates: [{ month: 10, day: 20 }, { month: 10, day: 3 }],
    })
  })

  it('går ikke over 12 datoer: knappen forsvinner og grensen vises', () => {
    renderForm()
    for (let i = 0; i < 11; i++) addDate()
    expect(dateFields()).toHaveLength(12)
    expect(addButton()).toBeNull()
    expect(screen.getByText('Maks 12 datoer per gjøremål.')).toBeInTheDocument()
  })

  it('viser knappen igjen når et felt fjernes fra 12', () => {
    renderForm()
    for (let i = 0; i < 11; i++) addDate()
    removeDate(12)
    expect(dateFields()).toHaveLength(11)
    expect(addButton()).toBeInTheDocument()
    expect(screen.queryByText('Maks 12 datoer per gjøremål.')).toBeNull()
  })

  it('viser ikke grensen før den er nådd', () => {
    renderForm()
    for (let i = 0; i < 10; i++) addDate()
    expect(dateFields()).toHaveLength(11)
    expect(addButton()).toBeInTheDocument()
    expect(screen.queryByText('Maks 12 datoer per gjøremål.')).toBeNull()
  })

  it('viser duplikatet ved det andre feltet, og lagrer ikke', () => {
    const { onSave } = renderForm()
    type(titleField(), 'Vårvask')
    type(nthDate(1), '15.05')
    addDate()
    type(nthDate(2), '15/5')
    save()
    expect(onSave).not.toHaveBeenCalled()
    expect(nthDate(1)).toHaveAttribute('aria-invalid', 'false')
    expect(nthDate(2)).toHaveAttribute('aria-invalid', 'true')
    expect(nthDate(2)).toHaveAccessibleDescription('15. mai er allerede lagt inn på dette gjøremålet.')
    expect(nthDate(2)).toHaveFocus()
  })

  it('kobler «Minst én dato er påkrevd.» til alle de tomme datofeltene', () => {
    renderForm()
    type(titleField(), 'Vårvask')
    addDate()
    save()
    for (const field of dateFields()) {
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field).toHaveAccessibleDescription('Minst én dato er påkrevd.')
    }
    expect(screen.getAllByText('Minst én dato er påkrevd.')).toHaveLength(1)
    expect(nthDate(1)).toHaveFocus()
  })

  it('fyller raden som hører til kalenderen som ble brukt', () => {
    const { container } = renderForm()
    addDate()
    const second = datePickers(container)[1]
    if (!second) throw new Error('Fant ikke den andre datovelgeren')
    fireEvent.change(second, { target: { value: '2026-12-24' } })
    expect(nthDate(1)).toHaveValue('')
    expect(nthDate(2)).toHaveValue('24.12')
    expect(nthDate(2)).toHaveFocus()
  })
})
