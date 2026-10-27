import { type KeyboardEvent, useMemo, useState } from 'react'
import { type PlacedDot, placeDots } from './dotPlacement.ts'
import type { Todo, TodoDate } from './storage.ts'
import {
  bandPath,
  type CalendarDay,
  CENTRE,
  dayAngle,
  dayOfYear,
  daysOfYear,
  hasDayNumber,
  labelArcPath,
  type Month,
  monthStartAngle,
  MONTHS,
  pointOnCircle,
  R_BAND,
  R_CENTRE,
  R_NUMBER,
  R_OUTER,
  R_TODAY,
  shownDay,
  tickLength,
} from './wheelGeometry.ts'

interface WheelProps {
  today: Date
  todos?: readonly Todo[]
  onOpenTodo?: (id: string) => void
}

interface Tooltip {
  title: string
  left: number
  top: number
}

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
const RING_RADIUS = 17

const NO_TODOS: readonly Todo[] = []

const labelArcId = (month: number) => `month-arc-${String(month)}`

// Read out as «Title, 15. mai», with the day that is shown on the wheel
const dotLabel = (todo: Todo, date: TodoDate, year: number) =>
  `${todo.title}, ${String(shownDay(date, year))}. ${MONTHS[date.month - 1]?.name ?? ''}`

// Drawn, and so reached with Tab, in calendar order from January, then from the centre outwards
function inCalendarOrder(dots: readonly PlacedDot[], year: number): PlacedDot[] {
  const dayIndex = (dot: PlacedDot) => dayOfYear(dot.date.month, shownDay(dot.date, year), year)
  return [...dots].sort((a, b) => dayIndex(a) - dayIndex(b) || a.radius - b.radius)
}

export default function Wheel({ today, todos = NO_TODOS, onOpenTodo }: WheelProps) {
  const year = today.getFullYear()
  const isToday = (month: number, day: number) => month === today.getMonth() + 1 && day === today.getDate()
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  // Placing is only redone when the todos or the year change, not on every hover
  const dots = useMemo(() => inCalendarOrder(placeDots(todos, year), year), [todos, year])

  // The tooltip is placed above the dot, relative to the area around the wheel
  const showTooltip = (element: SVGGElement, title: string) => {
    const area = element.ownerSVGElement?.parentElement?.getBoundingClientRect()
    // Measure the dot itself, not the whole group, so the larger focus ring does not move the tooltip
    const dot = (element.querySelector('circle') ?? element).getBoundingClientRect()
    setTooltip({
      title,
      left: dot.left + dot.width / 2 - (area?.left ?? 0),
      top: dot.top - (area?.top ?? 0),
    })
  }

  return (
    <>
      <svg className="wheel" viewBox="0 0 1000 1000" role="group" aria-label="Årshjul med gjøremål">
        <defs>
          <filter id="magnet" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx={0} dy={1.5} stdDeviation={1.5} floodOpacity={0.35} />
          </filter>
          {MONTHS.map((month) => (
            <path key={month.number} id={labelArcId(month.number)} d={labelArcPath(month.number, year)} />
          ))}
        </defs>
        <circle className="rim" cx={CENTRE} cy={CENTRE} r={R_OUTER} />
        {MONTHS.map((month) => (
          <MonthSegment key={month.number} month={month} year={year} />
        ))}
        <g data-testid="dagsstreker">
          {daysOfYear(year).map((day) => (
            <DayTick
              key={`${String(day.month)}-${String(day.day)}`}
              {...day}
              year={year}
              current={isToday(day.month, day.day)}
            />
          ))}
        </g>
        <TodayMarker today={today} />
        <Centre today={today} />
        {dots.map((dot) => (
          <WheelDot
            key={`${dot.todo.id}-${String(dot.date.month)}-${String(dot.date.day)}`}
            dot={dot}
            year={year}
            onShowTitle={showTooltip}
            onHideTitle={() => {
              setTooltip(null)
            }}
            onOpen={() => {
              onOpenTodo?.(dot.todo.id)
            }}
          />
        ))}
      </svg>
      {tooltip && (
        <div className="tooltip" role="tooltip" style={{ left: tooltip.left, top: tooltip.top }}>
          {tooltip.title}
        </div>
      )}
    </>
  )
}

interface WheelDotProps {
  dot: PlacedDot
  year: number
  onShowTitle: (element: SVGGElement, title: string) => void
  onHideTitle: () => void
  onOpen: () => void
}

// A button for the keyboard and screen readers: Tab reaches it, Enter and space open it,
// and focus shows the title just like hovering does
function WheelDot({ dot: { todo, date, radius }, year, onShowTitle, onHideTitle, onOpen }: WheelDotProps) {
  const [cx, cy] = pointOnCircle(radius, dayAngle(date.month, shownDay(date, year), year))
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    // Space would otherwise scroll the page
    event.preventDefault()
    onOpen()
  }
  return (
    <g
      className="dot"
      data-testid="prikk"
      role="button"
      tabIndex={0}
      aria-label={dotLabel(todo, date, year)}
      onMouseEnter={(event) => {
        onShowTitle(event.currentTarget, todo.title)
      }}
      onMouseLeave={onHideTitle}
      onFocus={(event) => {
        onShowTitle(event.currentTarget, todo.title)
      }}
      onBlur={onHideTitle}
      onClick={onOpen}
      onKeyDown={onKeyDown}
    >
      <circle className="dot-mark" cx={cx} cy={cy} r={7} />
      <circle className="dot-focus" data-testid="fokusring" cx={cx} cy={cy} r={15} />
    </g>
  )
}

// Today's tick is red and reaches the ring. Today's number is shown only in the ring.
function DayTick({ month, day, year, current }: CalendarDay & { year: number; current: boolean }) {
  const angle = dayAngle(month, day, year)
  const [x1, y1] = pointOnCircle(R_BAND, angle)
  const [x2, y2] = pointOnCircle(current ? R_TODAY + RING_RADIUS : R_BAND - tickLength(day), angle)
  const kind = current ? 'today' : day === 1 ? 'first' : hasDayNumber(day) ? 'major' : ''
  const [nx, ny] = pointOnCircle(R_NUMBER, angle)
  return (
    <>
      <line className={`tick ${kind}`.trim()} x1={x1} y1={y1} x2={x2} y2={y2} />
      {hasDayNumber(day) && !current && (
        <text className="day-num" x={nx} y={ny} aria-hidden="true">
          {day}
        </text>
      )}
    </>
  )
}

function TodayMarker({ today }: { today: Date }) {
  const [x, y] = pointOnCircle(R_TODAY, dayAngle(today.getMonth() + 1, today.getDate(), today.getFullYear()))
  return (
    <g data-testid="dagens-dato">
      <circle className="today-ring" cx={x} cy={y} r={RING_RADIUS} />
      <text className="day-num today" x={x} y={y} aria-hidden="true">
        {today.getDate()}
      </text>
    </g>
  )
}

function Centre({ today }: { today: Date }) {
  const month = MONTHS[today.getMonth()]
  return (
    <>
      <circle className="centre" cx={CENTRE} cy={CENTRE} r={R_CENTRE} />
      <text className="centre-day" x={CENTRE} y={CENTRE - 6}>{`${String(today.getDate())}.`}</text>
      <text className="centre-month" x={CENTRE} y={CENTRE + 34}>{month?.name}</text>
      <text className="centre-weekday" x={CENTRE} y={CENTRE + 60}>{WEEKDAYS[today.getDay()]}</text>
    </>
  )
}

function MonthSegment({ month, year }: { month: Month; year: number }) {
  const start = monthStartAngle(month.number, year)
  const [x1, y1] = pointOnCircle(R_CENTRE, start)
  const [x2, y2] = pointOnCircle(R_BAND, start)
  return (
    <g>
      <path className={`band ${month.season}`} d={bandPath(month.number, year)} />
      <line className="divider" x1={x1} y1={y1} x2={x2} y2={y2} />
      <text className={`month-label ${month.season}`} aria-hidden="true">
        <textPath href={`#${labelArcId(month.number)}`} startOffset="50%" textAnchor="middle">
          {month.name.toUpperCase()}
        </textPath>
      </text>
    </g>
  )
}
