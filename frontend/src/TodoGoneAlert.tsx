interface TodoGoneAlertProps {
  title: string
  onClose: () => void
}

// Shown when the todo in an open dialog was deleted in another tab, so the dialog closed
export default function TodoGoneAlert({ title, onClose }: TodoGoneAlertProps) {
  return (
    <div className="alert" role="alert">
      <p>Gjøremålet «{title}» ble slettet i en annen fane.</p>
      <div className="alert-actions">
        <button type="button" className="btn link" onClick={onClose}>
          Lukk
        </button>
      </div>
    </div>
  )
}
