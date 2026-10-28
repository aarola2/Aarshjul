import { useState } from 'react'
import './App.css'
import ConfirmDeleteDialog from './ConfirmDeleteDialog.tsx'
import CorruptDataAlert from './CorruptDataAlert.tsx'
import MonthColumn from './MonthColumn.tsx'
import { keepCorruptCopy, loadTodos, saveTodos, type Todo } from './storage.ts'
import StorageBlockedAlert from './StorageBlockedAlert.tsx'
import { createTodo, removeTodo, type TodoDraft, updateTodo } from './todoForm.ts'
import TodoFormDialog from './TodoFormDialog.tsx'
import TodoViewDialog from './TodoViewDialog.tsx'
import { useToday } from './useToday.ts'
import Wheel from './Wheel.tsx'

type FormState = { kind: 'new' } | { kind: 'edit'; id: string } | null

export default function App() {
  const today = useToday()
  // Read once at start. Corrupt data gives an empty list, a copy kept aside and a warning;
  // blocked storage gives an empty list and a warning.
  const [loaded] = useState(loadTodos)
  const [todos, setTodos] = useState<Todo[]>(loaded.status === 'ok' ? loaded.todos : [])
  const [corruptRaw, setCorruptRaw] = useState(loaded.status === 'corrupt' ? loaded.raw : null)
  const [isBlockedShown, setBlockedShown] = useState(loaded.status === 'blocked')
  // Kept before anything can be saved over the corrupt data. Writing the same text twice in StrictMode does no harm.
  const [isCopyKept] = useState(() => loaded.status !== 'corrupt' || keepCorruptCopy(loaded.raw))
  const [form, setForm] = useState<FormState>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const viewing = todos.find((todo) => todo.id === viewingId)
  const editing = form?.kind === 'edit' ? todos.find((todo) => todo.id === form.id) : undefined
  // The form for editing is only shown while the todo still exists, so it never turns into a new one
  const isFormShown = form?.kind === 'new' || editing !== undefined
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deleting = todos.find((todo) => todo.id === deletingId)
  // The open dialog stays open with a message when what it did could not be stored
  const [hasStoreFailed, setStoreFailed] = useState(false)

  // Saved first, so the wheel and the column never show anything that is not stored
  const store = (next: Todo[]) => {
    const isStored = saveTodos(next)
    if (isStored) setTodos(next)
    setStoreFailed(!isStored)
    return isStored
  }

  const saveTodo = (draft: TodoDraft) => {
    if (store(editing ? updateTodo(todos, editing.id, draft) : [...todos, createTodo(draft, todos, new Date())])) {
      setForm(null)
    }
  }

  const askToDelete = (id: string) => {
    setViewingId(null)
    setDeletingId(id)
  }

  const deleteTodo = (id: string) => {
    if (store(removeTodo(todos, id))) setDeletingId(null)
  }

  const closeForm = () => {
    setForm(null)
    setStoreFailed(false)
  }

  const closeConfirm = () => {
    setDeletingId(null)
    setStoreFailed(false)
  }

  const editTodo = (id: string) => {
    setViewingId(null)
    setForm({ kind: 'edit', id })
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <h1>Årshjul</h1>
          <p>Faste gjøremål som kommer igjen hvert år</p>
        </div>
        <button
          type="button"
          className="btn primary"
          // Gets focus when the element that opened a dialog is gone
          data-focus-fallback
          onClick={() => {
            setForm({ kind: 'new' })
          }}
        >
          + Legg til nytt gjøremål
        </button>
      </header>
      {isBlockedShown && (
        <StorageBlockedAlert
          onClose={() => {
            setBlockedShown(false)
          }}
        />
      )}
      {corruptRaw !== null && (
        <CorruptDataAlert
          raw={corruptRaw}
          isCopyKept={isCopyKept}
          onClose={() => {
            setCorruptRaw(null)
          }}
        />
      )}
      <main className="layout">
        <section className="wheel-area" aria-label="Årshjul">
          <Wheel today={today} todos={todos} onOpenTodo={setViewingId} />
        </section>
        <aside className="month" aria-label="Denne måneden">
          <MonthColumn
            today={today}
            todos={todos}
            onOpenTodo={setViewingId}
            onEditTodo={editTodo}
            onDeleteTodo={askToDelete}
          />
        </aside>
      </main>
      {viewing && (
        <TodoViewDialog
          todo={viewing}
          today={today}
          onClose={() => {
            setViewingId(null)
          }}
          onEdit={editTodo}
          onDelete={askToDelete}
        />
      )}
      {deleting && (
        <ConfirmDeleteDialog
          title={deleting.title}
          hasDeleteFailed={hasStoreFailed}
          onConfirm={() => {
            deleteTodo(deleting.id)
          }}
          onClose={closeConfirm}
        />
      )}
      {isFormShown && (
        <TodoFormDialog initial={editing} hasSaveFailed={hasStoreFailed} onSave={saveTodo} onClose={closeForm} />
      )}
    </>
  )
}
