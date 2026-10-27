import { type MonthItem, shortDate, todosInMonth } from './monthList.ts'
import type { Todo, TodoDate } from './storage.ts'
import { MONTHS, type Season } from './wheelGeometry.ts'

interface MonthColumnProps {
  today: Date
  todos: readonly Todo[]
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export default function MonthColumn({ today, todos }: MonthColumnProps) {
  const month = MONTHS[today.getMonth()]
  // getMonth() is always 0–11; the check is only there for the type
  if (!month) return null
  return (
    <>
      <p className="eyebrow">Denne måneden</p>
      <h2 className="month-title">{capitalise(month.name)}</h2>
      {todosInMonth(todos, month.number).map((item) => (
        <MonthCard key={item.todo.id} item={item} season={month.season} today={today.getDate()} />
      ))}
    </>
  )
}

interface MonthCardProps {
  item: MonthItem
  season: Season
  today: number
}

function MonthCard({ item: { todo, dates }, season, today }: MonthCardProps) {
  return (
    <article className="card">
      <div className="badges">
        {dates.map((date) => (
          <DateBadge key={date.day} date={date} season={season} isToday={date.day === today} />
        ))}
      </div>
      <h3>{todo.title}</h3>
      {todo.description !== '' && <p className="desc">{todo.description}</p>}
    </article>
  )
}

interface DateBadgeProps {
  date: TodoDate
  season: Season
  isToday: boolean
}

function DateBadge({ date, season, isToday }: DateBadgeProps) {
  return (
    <span className={`badge ${season}${isToday ? ' today' : ''}`}>
      {isToday ? `I dag · ${shortDate(date)}` : shortDate(date)}
    </span>
  )
}
