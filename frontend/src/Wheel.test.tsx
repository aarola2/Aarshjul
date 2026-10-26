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
