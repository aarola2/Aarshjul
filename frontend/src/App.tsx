import { useState } from 'react'
import './App.css'
import MonthColumn from './MonthColumn.tsx'
import { loadTodos, saveTodos, type Todo } from './storage.ts'
import { createTodo, type TodoDraft } from './todoForm.ts'
import TodoFormDialog from './TodoFormDialog.tsx'
import { useToday } from './useToday.ts'
import Wheel from './Wheel.tsx'

export default function App() {
  const today = useToday()
  // Corrupt data gives an empty list; the message about it comes in #19
  const [todos, setTodos] = useState<Todo[]>(() => {
    const result = loadTodos()
    return result.status === 'ok' ? result.todos : []
  })
  const [isFormOpen, setFormOpen] = useState(false)

  // Saved first, so the wheel and the column never show a todo that is not stored
  const addTodo = (draft: TodoDraft) => {
    const next = [...todos, createTodo(draft, todos, new Date())]
    saveTodos(next)
    setTodos(next)
    setFormOpen(false)
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
            setFormOpen(true)
          }}
        >
          + Legg til nytt gjøremål
        </button>
      </header>
      <main className="layout">
        <section className="wheel-area" aria-label="Årshjul">
          <Wheel today={today} todos={todos} />
        </section>
        <aside className="month" aria-label="Denne måneden">
          <MonthColumn today={today} todos={todos} />
        </aside>
      </main>
      {isFormOpen && (
        <TodoFormDialog
          onSave={addTodo}
          onClose={() => {
            setFormOpen(false)
          }}
        />
      )}
    </>
  )
}
