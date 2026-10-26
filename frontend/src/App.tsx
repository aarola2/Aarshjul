import { useState } from 'react'
import './App.css'
import { loadTodos, type Todo } from './storage.ts'
import { useToday } from './useToday.ts'
import Wheel from './Wheel.tsx'

export default function App() {
  const today = useToday()
  // Corrupt data gives an empty list; the message about it comes in #19
  const [todos] = useState<Todo[]>(() => {
    const result = loadTodos()
    return result.status === 'ok' ? result.todos : []
  })
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <h1>Årshjul</h1>
          <p>Faste gjøremål som kommer igjen hvert år</p>
        </div>
      </header>
      <main className="layout">
        <section className="wheel-area" aria-label="Årshjul">
          <Wheel today={today} todos={todos} />
        </section>
        <aside className="month" aria-label="Denne måneden">
          <p className="eyebrow">Denne måneden</p>
        </aside>
      </main>
    </>
  )
}
