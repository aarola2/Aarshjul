import { type SyntheticEvent, useEffect, useRef } from 'react'

// Opens the dialog as a modal when it is shown, and gives focus back to the element that opened it when
// it closes. The dialog is meant to be mounted when it opens and unmounted when it closes.
export function useModalDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)
  useEffect(() => {
    const dialog = ref.current
    // Taken once: StrictMode runs the effect again, when focus is already inside the dialog
    opener.current ??= document.activeElement
    // showModal() on an open dialog throws
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      // StrictMode runs this while the dialog is still on the page; only a real close moves focus
      if (dialog?.isConnected) return
      restoreFocus(opener.current)
    }
  }, [])
  return ref
}

// When the opener is gone, for example a card that was just deleted, focus goes to the fallback instead
function restoreFocus(opener: Element | null) {
  if ((opener instanceof HTMLElement || opener instanceof SVGElement) && opener.isConnected) {
    opener.focus()
    return
  }
  document.querySelector<HTMLElement>('[data-focus-fallback]')?.focus()
}

// Esc closes the dialog through React at once. Left to itself the browser closes it first and tells React
// a moment later, and a key pressed in between could open a dialog that is then closed straight away.
export const closeOnEscape = (onClose: () => void) => (event: SyntheticEvent<HTMLDialogElement>) => {
  event.preventDefault()
  onClose()
}
