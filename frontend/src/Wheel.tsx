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
  tickLength,
} from './wheelGeometry.ts'

interface WheelProps {
  year: number
}

const labelArcId = (month: number) => `month-arc-${String(month)}`

export default function Wheel({ year }: WheelProps) {
  return (
    <svg className="wheel" viewBox="0 0 1000 1000" role="group" aria-label="Årshjul med gjøremål">
      <defs>
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
          <DayTick key={`${String(day.month)}-${String(day.day)}`} {...day} year={year} />
        ))}
      </g>
    </svg>
  )
}

function DayTick({ month, day, year }: CalendarDay & { year: number }) {
  const angle = dayAngle(month, day, year)
  const [x1, y1] = pointOnCircle(R_BAND, angle)
  const [x2, y2] = pointOnCircle(R_BAND - tickLength(day), angle)
  const kind = day === 1 ? 'first' : hasDayNumber(day) ? 'major' : ''
  const [nx, ny] = pointOnCircle(R_NUMBER, angle)
  return (
    <>
      <line className={`tick ${kind}`.trim()} x1={x1} y1={y1} x2={x2} y2={y2} />
      {hasDayNumber(day) && (
        <text className="day-num" x={nx} y={ny} aria-hidden="true">
          {day}
        </text>
      )}
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
