interface StorageBlockedAlertProps {
  onClose: () => void
}

export default function StorageBlockedAlert({ onClose }: StorageBlockedAlertProps) {
  return (
    <div className="alert" role="alert">
      <p>
        <strong>Nettleseren tillater ikke lagring.</strong> Gjøremål kan ikke lagres før du tillater nettstedsdata for
        denne siden.
      </p>
      <div className="alert-actions">
        <button type="button" className="btn link" onClick={onClose}>
          Lukk
        </button>
      </div>
    </div>
  )
}
