import DateBadge from './DateBadge.tsx'
import type { Todo, TodoDate } from './storage.ts'
import { useModalDialog } from './useModalDialog.ts'

interface TodoViewDialogProps {
  todo: Todo
  today: Date
  onClose: () => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

const byCalendar = (a: TodoDate, b: TodoDate) => a.month - b.month || a.day - b.day

export default function TodoViewDialog({ todo, today, onClose, onEdit, onDelete }: TodoViewDialogProps) {
  const dialogRef = useModalDialog()
  return (
    <dialog
      ref={dialogRef}
      aria-label={todo.title}
      onClose={onClose}
      onClick={(event) => {
        // The content fills the dialog, so a click on the dialog element itself is a click on the backdrop
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dlg">
        <button type="button" className="btn close" aria-label="Lukk" onClick={onClose}>
          ×
        </button>
        <h2>{todo.title}</h2>
        <div className="badges">
          {[...todo.dates].sort(byCalendar).map((date) => (
            <DateBadge key={`${String(date.month)}-${String(date.day)}`} date={date} today={today} />
          ))}
        </div>
        {todo.description !== '' && <p className="desc">{todo.description}</p>}
        <p className="repeat">↻ Gjentas automatisk hvert år</p>
        <div className="dlg-actions">
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              onDelete?.(todo.id)
            }}
          >
            Slett
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              onEdit?.(todo.id)
            }}
          >
            Rediger
          </button>
        </div>
      </div>
    </dialog>
  )
}
