import './App.css'
import Wheel from './Wheel.tsx'

export default function App() {
  const year = new Date().getFullYear()
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
          <Wheel year={year} />
        </section>
        <aside className="month" aria-label="Denne måneden">
          <p className="eyebrow">Denne måneden</p>
        </aside>
      </main>
    </>
  )
}
