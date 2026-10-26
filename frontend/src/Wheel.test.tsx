import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Todo } from './storage.ts'
import Wheel from './Wheel.tsx'
import { dayAngle } from './wheelGeometry.ts'

const renderWheel = () => render(<Wheel today={new Date(2026, 2, 15)} />).container

describe('Wheel', () => {
  it('er en gruppe med navnet «Årshjul med gjøremål»', () => {
    renderWheel()
    expect(screen.getByRole('group', { name: 'Årshjul med gjøremål' })).toBeInTheDocument()
  })

  it('viser alle 12 månedsnavnene i rekkefølge med klokken fra januar', () => {
    const container = renderWheel()
    const labels = [...container.querySelectorAll('textPath')].map((label) => label.textContent)
    expect(labels).toEqual([
      'JANUAR', 'FEBRUAR', 'MARS', 'APRIL', 'MAI', 'JUNI',
      'JULI', 'AUGUST', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
    ])
  })

  it('gir hvert fargebånd årstiden til måneden', () => {
    const container = renderWheel()
    const seasons = [...container.querySelectorAll('path.band')].map((band) => band.getAttribute('class'))
    expect(seasons).toEqual([
      'band winter', 'band winter', 'band spring', 'band spring', 'band spring', 'band summer',
      'band summer', 'band summer', 'band autumn', 'band autumn', 'band autumn', 'band winter',
    ])
  })

  it('legger hvert navn på sin egen bue', () => {
    const container = renderWheel()
    const targets = [...container.querySelectorAll('textPath')].map((label) => label.getAttribute('href') ?? '')
    expect(new Set(targets).size).toBe(12)
    for (const target of targets) {
      expect(container.querySelector(target)).not.toBeNull()
    }
  })
})

describe('Wheel, dagsstreker', () => {
  const ticksOf = (year: number) => {
    render(<Wheel today={new Date(year, 2, 15)} />)
    return screen.getByTestId('dagsstreker')
  }

  it.each([
    [2026, 365],
    [2024, 366],
  ])('tegner én strek per dag i %i (%i)', (year, count) => {
    expect(ticksOf(year).querySelectorAll('line')).toHaveLength(count)
  })

  it('har datotall 1, 10 og 20 i hver måned', () => {
    const numbers = [...ticksOf(2026).querySelectorAll('text')].map((text) => text.textContent)
    expect(numbers).toEqual(Array.from({ length: 12 }, () => ['1', '10', '20']).flat())
  })

  it('gir den 1. og den 10. og 20. lengre streker', () => {
    const ticks = ticksOf(2026)
    expect(ticks.querySelectorAll('line.first')).toHaveLength(12)
    expect(ticks.querySelectorAll('line.major')).toHaveLength(24)
  })

  it('starter 1. januar rett over sentrum', () => {
    const first = ticksOf(2026).querySelector('line')
    expect(Number(first?.getAttribute('x1'))).toBeGreaterThan(500)
    expect(Number(first?.getAttribute('x1'))).toBeLessThan(505)
    expect(Number(first?.getAttribute('y1'))).toBeLessThan(500)
  })

  it('tegner den 1. med lang strek innover fra fargebåndet', () => {
    const first = ticksOf(2026).querySelector('line')
    const length = Number(first?.getAttribute('y2')) - Number(first?.getAttribute('y1'))
    expect(length).toBeCloseTo(26, 0)
  })
})

describe('Wheel, dagens dato', () => {
  const renderOn = (today: Date) => {
    const { container } = render(<Wheel today={today} />)
    return { container, marker: screen.getByTestId('dagens-dato') }
  }
  const dayNumbers = (container: HTMLElement, text: string) =>
    [...container.querySelectorAll('text')].filter((node) => node.textContent === text)

  it('viser dagens datotall i ringen', () => {
    const { marker } = renderOn(new Date(2026, 9, 26))
    expect(marker.querySelectorAll('circle')).toHaveLength(1)
    expect(marker.querySelector('text')?.textContent).toBe('26')
  })

  it('viser den 20. bare i ringen når den er dagens dato', () => {
    const { container, marker } = renderOn(new Date(2026, 9, 20))
    expect(marker.querySelector('text')?.textContent).toBe('20')
    expect(dayNumbers(container, '20')).toHaveLength(12)
  })

  it('har bare én ring og én rød strek, på dagens dato', () => {
    const { container } = renderOn(new Date(2026, 9, 26))
    expect(screen.getAllByTestId('dagens-dato')).toHaveLength(1)
    expect(container.querySelectorAll('circle.today-ring')).toHaveLength(1)
    const todayTicks = container.querySelectorAll('line.today')
    expect(todayTicks).toHaveLength(1)
    // The red tick and the ring lie on the same line from the centre
    const ring = container.querySelector('circle.today-ring')
    const tick = todayTicks[0]
    const tickAngle = Math.atan2(Number(tick?.getAttribute('x1')) - 500, 500 - Number(tick?.getAttribute('y1')))
    const ringAngle = Math.atan2(Number(ring?.getAttribute('cx')) - 500, 500 - Number(ring?.getAttribute('cy')))
    expect(ringAngle).toBeCloseTo(tickAngle, 6)
  })

  it('flytter ringen når datoen endres', () => {
    const { container, rerender } = render(<Wheel today={new Date(2026, 9, 26)} />)
    const before = container.querySelector('circle.today-ring')?.getAttribute('cx')
    rerender(<Wheel today={new Date(2026, 9, 27)} />)
    expect(container.querySelector('circle.today-ring')?.getAttribute('cx')).not.toBe(before)
    expect(screen.getByTestId('dagens-dato').querySelector('text')?.textContent).toBe('27')
    expect(container.querySelectorAll('circle.today-ring')).toHaveLength(1)
  })

  it('bytter til nytt år ved årsskiftet', () => {
    const { container, rerender } = render(<Wheel today={new Date(2024, 11, 31)} />)
    expect(screen.getByTestId('dagsstreker').querySelectorAll('line')).toHaveLength(366)
    rerender(<Wheel today={new Date(2025, 0, 1)} />)
    expect(screen.getByTestId('dagsstreker').querySelectorAll('line')).toHaveLength(365)
    expect(screen.getByTestId('dagens-dato').querySelector('text')?.textContent).toBe('1')
    expect(dayNumbers(container, '1')).toHaveLength(12)
  })

  it.each([
    [new Date(2026, 9, 26), '26.', 'oktober', 'mandag'],
    [new Date(2026, 9, 27), '27.', 'oktober', 'tirsdag'],
    [new Date(2024, 1, 29), '29.', 'februar', 'torsdag'],
    [new Date(2026, 0, 4), '4.', 'januar', 'søndag'],
  ])('senterfeltet viser %s som %s %s, %s', (today, day, month, weekday) => {
    renderOn(today)
    expect(screen.getByText(day, { exact: true })).toBeInTheDocument()
    expect(screen.getByText(month, { exact: true })).toBeInTheDocument()
    expect(screen.getByText(weekday, { exact: true })).toBeInTheDocument()
  })
})

describe('Wheel, prikker', () => {
  const todo = (id: string, title: string, ...dates: [number, number][]): Todo => ({
    id,
    title,
    description: '',
    dates: dates.map(([month, day]) => ({ month, day })),
    createdAt: '2026-01-02T09:00:00.000Z',
  })
  const TODOS = [
    todo('a1', 'Dekkskift', [4, 15], [10, 15]),
    todo('b2', 'Vårvask av garasjen', [5, 15]),
    todo('c3', 'Rense takrennene', [3, 20], [6, 1], [9, 1]),
  ]
  const renderDots = (todos: readonly Todo[]) => {
    render(<Wheel today={new Date(2026, 9, 26)} todos={todos} />)
    return screen.queryAllByTestId('prikk')
  }
  const angleOfDot = (dot: Element) => {
    const mark = dot.querySelector('circle')
    return Math.atan2(Number(mark?.getAttribute('cx')) - 500, 500 - Number(mark?.getAttribute('cy')))
  }
  const normalise = (angle: number) => (angle + 2 * Math.PI) % (2 * Math.PI)

  it('tegner én prikk per dato per gjøremål', () => {
    expect(renderDots(TODOS)).toHaveLength(6)
  })

  it('tegner ingen prikker uten gjøremål', () => {
    expect(renderDots([])).toHaveLength(0)
  })

  it('legger hver prikk langs linjen for sin dato', () => {
    const angles = renderDots(TODOS).map((dot) => normalise(angleOfDot(dot)))
    const expected = TODOS.flatMap(({ dates }) => dates.map(({ month, day }) => dayAngle(month, day, 2026)))
    expect(angles).toHaveLength(expected.length)
    angles.forEach((angle, i) => {
      expect(angle).toBeCloseTo(expected[i] ?? NaN, 6)
    })
  })

  it('viser tittelen når musen holdes over en prikk, og skjuler den etterpå', () => {
    const [dot] = renderDots([todo('a1', 'Dekkskift', [4, 15])])
    if (!dot) throw new Error('Fant ingen prikk')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.mouseEnter(dot)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Dekkskift')
    fireEvent.mouseLeave(dot)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
