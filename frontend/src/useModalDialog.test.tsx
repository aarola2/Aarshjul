import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useModalDialog } from './useModalDialog.ts'

function Modal() {
  const ref = useModalDialog()
  return (
    <dialog ref={ref} aria-label="Test">
      Innhold
    </dialog>
  )
}

describe('useModalDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('åpner dialogen som modal når den vises', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
    render(<Modal />)
    expect(showModal).toHaveBeenCalledOnce()
    expect(screen.getByRole('dialog', { name: 'Test' })).toHaveAttribute('open')
  })

  it('åpner bare én gang når StrictMode kjører effekten to ganger', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
    render(
      <StrictMode>
        <Modal />
      </StrictMode>,
    )
    expect(showModal).toHaveBeenCalledOnce()
  })
})
