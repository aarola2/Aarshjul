import DateBadge from './DateBadge.tsx'
import { type MonthItem, todosInMonth } from './monthList.ts'
import type { Todo } from './storage.ts'
import { MONTHS } from './wheelGeometry.ts'

interface MonthColumnProps {
  today: Date
  todos: readonly Todo[]
  onOpenTodo?: (id: string) => void
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export default function MonthColumn({ today, todos, onOpenTodo }: MonthColumnProps) {
  const month = MONTHS[today.getMonth()]
  // getMonth() is always 0–11; the check is only there for the type
  if (!month) return null
  return (
    <>
      <p className="eyebrow">Denne måneden</p>
      <h2 className="month-title">{capitalise(month.name)}</h2>
      {todosInMonth(todos, month.number).map((item) => (
        <MonthCard
          key={item.todo.id}
          item={item}
          today={today}
          onOpen={() => {
            onOpenTodo?.(item.todo.id)
          }}
        />
      ))}
    </>
  )
}

interface MonthCardProps {
  item: MonthItem
  today: Date
  onOpen: () => void
}

// The whole card can be clicked. Keyboard access to it comes in #22.
function MonthCard({ item: { todo, dates }, today, onOpen }: MonthCardProps) {
  return (
    <article className="card" onClick={onOpen}>
      <div className="badges">
        {dates.map((date) => (
          <DateBadge key={date.day} date={date} today={today} />
        ))}
      </div>
      <h3>{todo.title}</h3>
      {todo.description !== '' && <p className="desc">{todo.description}</p>}
    </article>
  )
}
