import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Wheel from './Wheel.tsx'

const renderWheel = () => render(<Wheel year={2026} />).container

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
    render(<Wheel year={year} />)
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
