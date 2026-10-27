import { useEffect, useId, useRef } from 'react'
import { useModalDialog } from './useModalDialog.ts'

interface ConfirmDeleteDialogProps {
  title: string
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDeleteDialog({ title, onConfirm, onClose }: ConfirmDeleteDialogProps) {
  const dialogRef = useModalDialog()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const id = useId()

  // «Avbryt» gets focus, so that pressing Enter by accident does not delete
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <dialog ref={dialogRef} aria-labelledby={`${id}-title`} aria-describedby={`${id}-text`} onClose={onClose}>
      <div className="dlg">
        <button type="button" className="btn close" aria-label="Lukk" onClick={onClose}>
          ×
        </button>
        <h2 id={`${id}-title`}>Er du sikker?</h2>
        <p id={`${id}-text`}>«{title}» slettes. Dette kan ikke angres.</p>
        <div className="dlg-actions">
          <button ref={cancelRef} type="button" className="btn secondary" onClick={onClose}>
            Avbryt
          </button>
          <button type="button" className="btn danger-fill" onClick={onConfirm}>
            Ja, slett
          </button>
        </div>
      </div>
    </dialog>
  )
}
