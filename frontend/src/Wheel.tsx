import { type MouseEvent, useState } from 'react'
import { placeDots } from './dotPlacement.ts'
import type { Todo } from './storage.ts'
import {
  bandPath,
  type CalendarDay,
  CENTRE,
  dayAngle,
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
  tickLength,
} from './wheelGeometry.ts'

interface WheelProps {
  today: Date
  todos?: readonly Todo[]
}

interface Tooltip {
  title: string
  left: number
  top: number
}

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
const RING_RADIUS = 17

const labelArcId = (month: number) => `month-arc-${String(month)}`

export default function Wheel({ today, todos = [] }: WheelProps) {
  const year = today.getFullYear()
  const isToday = (month: number, day: number) => month === today.getMonth() + 1 && day === today.getDate()
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  // The tooltip is placed above the dot, relative to the area around the wheel
  const showTooltip = (event: MouseEvent<SVGGElement>, title: string) => {
    const area = event.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect()
    // Measure the dot itself, not the whole group, so a larger focus ring later does not move the tooltip
    const dot = (event.currentTarget.querySelector('circle') ?? event.currentTarget).getBoundingClientRect()
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
        {placeDots(todos, year).map(({ todo, date: { month, day }, radius }) => {
          const [cx, cy] = pointOnCircle(radius, dayAngle(month, day, year))
          return (
            <g
              key={`${todo.id}-${String(month)}-${String(day)}`}
              className="dot"
              data-testid="prikk"
              onMouseEnter={(event) => {
                showTooltip(event, todo.title)
              }}
              onMouseLeave={() => {
                setTooltip(null)
              }}
            >
              <circle className="dot-mark" cx={cx} cy={cy} r={7} />
            </g>
          )
        })}
      </svg>
      {tooltip && (
        <div className="tooltip" role="tooltip" style={{ left: tooltip.left, top: tooltip.top }}>
          {tooltip.title}
        </div>
      )}
    </>
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
