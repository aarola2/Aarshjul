import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DateBadge from './DateBadge.tsx'

const renderBadge = (month: number, day: number, today: Date) => {
  render(<DateBadge date={{ month, day }} today={today} />)
  return screen.getByText(/feb|mai|okt|des/)
}

describe('DateBadge', () => {
  it.each([
    [5, 15, 'spring', '15. mai'],
    [10, 3, 'autumn', '3. okt'],
    [12, 24, 'winter', '24. des'],
  ])('viser %i/%i i årstidsfargen', (month, day, season, text) => {
    const badge = renderBadge(month, day, new Date(2026, 0, 1))
    expect(badge).toHaveTextContent(text)
    expect(badge).toHaveClass('badge', season)
    expect(badge).not.toHaveClass('today')
  })

  it('setter «I dag ·» og rød kant på dagens dato', () => {
    const badge = renderBadge(10, 27, new Date(2026, 9, 27))
    expect(badge).toHaveTextContent('I dag · 27. okt')
    expect(badge).toHaveClass('today')
  })

  it('merker ikke samme dag i en annen måned', () => {
    expect(renderBadge(5, 27, new Date(2026, 9, 27))).not.toHaveClass('today')
  })

  it('viser 29. februar som 28. februar i år uten skuddår', () => {
    expect(renderBadge(2, 29, new Date(2026, 5, 1))).toHaveTextContent('28. feb')
  })

  it('viser 29. februar som den er i skuddår', () => {
    expect(renderBadge(2, 29, new Date(2028, 5, 1))).toHaveTextContent('29. feb')
  })

  it('setter «I dag ·» på 29. februar den 28. i år uten skuddår', () => {
    expect(renderBadge(2, 29, new Date(2026, 1, 28))).toHaveTextContent('I dag · 28. feb')
  })

  it('setter ikke «I dag ·» på 29. februar den 28. i skuddår', () => {
    expect(renderBadge(2, 29, new Date(2028, 1, 28))).toHaveTextContent(/^29\. feb$/)
  })
})
