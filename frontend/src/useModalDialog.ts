import { useEffect, useRef } from 'react'

// Opens the dialog as a modal when it is shown. The dialog is meant to be mounted when it opens
// and unmounted when it closes.
export function useModalDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    // StrictMode runs the effect twice in development, and showModal() on an open dialog throws
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return ref
}
