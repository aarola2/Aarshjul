import { useState } from 'react'
import './App.css'
import MonthColumn from './MonthColumn.tsx'
import { loadTodos, saveTodos, type Todo } from './storage.ts'
import { createTodo, type TodoDraft, updateTodo } from './todoForm.ts'
import TodoFormDialog from './TodoFormDialog.tsx'
import TodoViewDialog from './TodoViewDialog.tsx'
import { useToday } from './useToday.ts'
import Wheel from './Wheel.tsx'

type FormState = { kind: 'new' } | { kind: 'edit'; id: string } | null

export default function App() {
  const today = useToday()
  // Corrupt data gives an empty list; the message about it comes in #19
  const [todos, setTodos] = useState<Todo[]>(() => {
    const result = loadTodos()
    return result.status === 'ok' ? result.todos : []
  })
  const [form, setForm] = useState<FormState>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const viewing = todos.find((todo) => todo.id === viewingId)
  const editing = form?.kind === 'edit' ? todos.find((todo) => todo.id === form.id) : undefined
  // The form for editing is only shown while the todo still exists, so it never turns into a new one
  const isFormShown = form?.kind === 'new' || editing !== undefined

  // Saved first, so the wheel and the column never show a todo that is not stored
  const saveTodo = (draft: TodoDraft) => {
    const next = editing ? updateTodo(todos, editing.id, draft) : [...todos, createTodo(draft, todos, new Date())]
    saveTodos(next)
    setTodos(next)
    setForm(null)
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
      <main className="layout">
        <section className="wheel-area" aria-label="Årshjul">
          <Wheel today={today} todos={todos} onOpenTodo={setViewingId} />
        </section>
        <aside className="month" aria-label="Denne måneden">
          <MonthColumn today={today} todos={todos} onOpenTodo={setViewingId} onEditTodo={editTodo} />
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
