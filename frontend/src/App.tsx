import './App.css'
import { useToday } from './useToday.ts'
import Wheel from './Wheel.tsx'

export default function App() {
  const today = useToday()
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
          <Wheel today={today} />
        </section>
        <aside className="month" aria-label="Denne måneden">
          <p className="eyebrow">Denne måneden</p>
        </aside>
      </main>
    </>
  )
}
