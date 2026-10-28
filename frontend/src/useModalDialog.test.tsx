import { render, screen } from '@testing-library/react'
import { StrictMode, useEffect, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { closeOnEscape, useModalDialog } from './useModalDialog.ts'

function Modal({ name = 'Test' }: { name?: string }) {
  const ref = useModalDialog()
  const innerRef = useRef<HTMLButtonElement>(null)
  // Like the real dialogs, which move focus inside after the dialog has opened
  useEffect(() => {
    innerRef.current?.focus()
  }, [])
  return (
    <dialog ref={ref} aria-label={name}>
      <button ref={innerRef} type="button">
        Inni {name}
      </button>
    </dialog>
  )
}

type Open = 'a' | 'b' | null

function Page({ open, withOpener = true, withFallback = true }: { open: Open; withOpener?: boolean; withFallback?: boolean }) {
  return (
    <>
      {withFallback && (
        <button type="button" data-focus-fallback>
          Reserve
        </button>
      )}
      {withOpener && <button type="button">Åpner</button>}
      {open === 'a' && <Modal name="A" />}
      {open === 'b' && <Modal name="B" />}
    </>
  )
}

const opener = () => screen.getByRole('button', { name: 'Åpner' })

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

describe('useModalDialog, fokus tilbake', () => {
  it('gir fokus tilbake til elementet som åpnet dialogen', () => {
    const { rerender } = render(<Page open={null} />)
    opener().focus()
    rerender(<Page open="a" />)
    expect(screen.getByRole('button', { name: 'Inni A' })).toHaveFocus()
    rerender(<Page open={null} />)
    expect(opener()).toHaveFocus()
  })

  it('lar fokus bli i dialogen under StrictMode, og gir det tilbake etterpå', () => {
    const { rerender } = render(
      <StrictMode>
        <Page open={null} />
      </StrictMode>,
    )
    opener().focus()
    rerender(
      <StrictMode>
        <Page open="a" />
      </StrictMode>,
    )
    expect(screen.getByRole('button', { name: 'Inni A' })).toHaveFocus()
    rerender(
      <StrictMode>
        <Page open={null} />
      </StrictMode>,
    )
    expect(opener()).toHaveFocus()
  })

  it('gir fokus tilbake til den første åpneren når én dialog går over i en annen', () => {
    const { rerender } = render(<Page open={null} />)
    opener().focus()
    rerender(<Page open="a" />)
    rerender(<Page open="b" />)
    expect(screen.getByRole('button', { name: 'Inni B' })).toHaveFocus()
    rerender(<Page open={null} />)
    expect(opener()).toHaveFocus()
  })

  it('gir fokus til reserven når åpneren ikke finnes lenger', () => {
    const { rerender } = render(<Page open={null} />)
    opener().focus()
    rerender(<Page open="a" />)
    rerender(<Page open={null} withOpener={false} />)
    expect(screen.getByRole('button', { name: 'Reserve' })).toHaveFocus()
  })

  it('tåler at verken åpneren eller reserven finnes', () => {
    const { rerender } = render(<Page open={null} withFallback={false} />)
    opener().focus()
    rerender(<Page open="a" withFallback={false} />)
    expect(() => {
      rerender(<Page open={null} withOpener={false} withFallback={false} />)
    }).not.toThrow()
  })
})

describe('closeOnEscape', () => {
  it('stopper nettleserens egen lukking og lukker med en gang', () => {
    const onClose = vi.fn()
    const preventDefault = vi.fn()
    closeOnEscape(onClose)({ preventDefault } as unknown as Parameters<ReturnType<typeof closeOnEscape>>[0])
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
