import { useState } from 'react'
import './App.css'
import ConfirmDeleteDialog from './ConfirmDeleteDialog.tsx'
import CorruptDataAlert from './CorruptDataAlert.tsx'
import MonthColumn from './MonthColumn.tsx'
import { keepCorruptCopy, loadTodos, saveTodos, type Todo } from './storage.ts'
import { createTodo, removeTodo, type TodoDraft, updateTodo } from './todoForm.ts'
import TodoFormDialog from './TodoFormDialog.tsx'
import TodoViewDialog from './TodoViewDialog.tsx'
import { useToday } from './useToday.ts'
import Wheel from './Wheel.tsx'

type FormState = { kind: 'new' } | { kind: 'edit'; id: string } | null

export default function App() {
  const today = useToday()
  // Read once at start. Corrupt data gives an empty list, a copy kept aside and a warning.
  const [loaded] = useState(loadTodos)
  const [todos, setTodos] = useState<Todo[]>(loaded.status === 'ok' ? loaded.todos : [])
  const [corruptRaw, setCorruptRaw] = useState(loaded.status === 'corrupt' ? loaded.raw : null)
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

  // Saved first, so the wheel and the column never show anything that is not stored
  const store = (next: Todo[]) => {
    saveTodos(next)
    setTodos(next)
  }

  const saveTodo = (draft: TodoDraft) => {
    store(editing ? updateTodo(todos, editing.id, draft) : [...todos, createTodo(draft, todos, new Date())])
    setForm(null)
  }

  const askToDelete = (id: string) => {
    setViewingId(null)
    setDeletingId(id)
  }

  const deleteTodo = (id: string) => {
    store(removeTodo(todos, id))
    setDeletingId(null)
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
          onClick={() => {
            setForm({ kind: 'new' })
          }}
        >
          + Legg til nytt gjøremål
        </button>
      </header>
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
          onConfirm={() => {
            deleteTodo(deleting.id)
          }}
          onClose={() => {
            setDeletingId(null)
          }}
        />
      )}
      {isFormShown && (
        <TodoFormDialog
          initial={editing}
          onSave={saveTodo}
          onClose={() => {
            setForm(null)
          }}
        />
      )}
    </>
  )
}
