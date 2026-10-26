import {
  bandPath,
  CENTRE,
  labelArcPath,
  type Month,
  monthStartAngle,
  MONTHS,
  pointOnCircle,
  R_BAND,
  R_CENTRE,
  R_OUTER,
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
    </svg>
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
