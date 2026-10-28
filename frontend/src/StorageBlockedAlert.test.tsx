import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StorageBlockedAlert from './StorageBlockedAlert.tsx'

describe('StorageBlockedAlert', () => {
  it('sier at nettleseren ikke tillater lagring, som et varsel skjermleseren leser opp', () => {
    render(<StorageBlockedAlert onClose={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nettleseren tillater ikke lagring. Gjøremål kan ikke lagres før du tillater nettstedsdata for denne siden.',
    )
  })

  it('«Lukk» lukker varselet', () => {
    const onClose = vi.fn()
    render(<StorageBlockedAlert onClose={onClose} />)
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Lukk' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
