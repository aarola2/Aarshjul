interface CorruptDataAlertProps {
  // The stored text that could not be used; it is only ever downloaded, never shown
  raw: string
  // false when the copy could not be kept in the browser, so it can only be downloaded
  isCopyKept: boolean
  onClose: () => void
}

const FILE_NAME = 'aarshjul-odelagte-data.json'

function download(text: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Released a little later, so the browser has started the download first
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

export default function CorruptDataAlert({ raw, isCopyKept, onClose }: CorruptDataAlertProps) {
  return (
    <div className="alert" role="alert">
      <p>
        <strong>Lagrede data var ødelagt.</strong> De kunne ikke leses, så årshjulet startet med en tom liste.{' '}
        {isCopyKept
          ? 'En kopi av de ødelagte dataene er tatt vare på.'
          : 'Kopien kunne ikke lagres i nettleseren. Last ned kopien før du lagrer noe nytt.'}
      </p>
      <div className="alert-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            download(raw, FILE_NAME)
          }}
        >
          Last ned kopien
        </button>
        <button type="button" className="btn link" onClick={onClose}>
          Lukk
        </button>
      </div>
    </div>
  )
}
