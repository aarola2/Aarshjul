import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { msUntilNextMidnight, useToday } from './useToday.ts'

describe('msUntilNextMidnight', () => {
  it('gir tiden til midnatt', () => {
    expect(msUntilNextMidnight(new Date(2026, 9, 26, 23, 59, 50))).toBe(10_000)
    expect(msUntilNextMidnight(new Date(2026, 9, 26, 0, 0, 0))).toBe(24 * 60 * 60 * 1000)
  })

  it('treffer lokal midnatt neste dag hver dag i året, også når sommertiden begynner og slutter', () => {
    for (let day = 0; day < 366; day++) {
      const noon = new Date(2026, 0, 1 + day, 12)
      const next = new Date(noon.getTime() + msUntilNextMidnight(noon))
      expect([next.getHours(), next.getMinutes(), next.getSeconds()]).toEqual([0, 0, 0])
      expect(next.getDate()).toBe(new Date(2026, 0, 2 + day).getDate())
    }
  })
})

describe('useToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const dayOf = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()]

  it('gir dagens dato', () => {
    vi.setSystemTime(new Date(2026, 9, 26, 12))
    const { result } = renderHook(() => useToday())
    expect(dayOf(result.current)).toEqual([2026, 10, 26])
  })

  it('går til neste dag ved midnatt', () => {
    vi.setSystemTime(new Date(2026, 9, 26, 23, 59, 50))
    const { result } = renderHook(() => useToday())
    act(() => {
      vi.advanceTimersByTime(9_000)
    })
    expect(dayOf(result.current)).toEqual([2026, 10, 26])
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(dayOf(result.current)).toEqual([2026, 10, 27])
  })

  it('fortsetter å flytte seg natt etter natt, også over årsskiftet', () => {
    vi.setSystemTime(new Date(2026, 11, 30, 12))
    const { result } = renderHook(() => useToday())
    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000)
    })
    expect(dayOf(result.current)).toEqual([2026, 12, 31])
    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000)
    })
    expect(dayOf(result.current)).toEqual([2027, 1, 1])
  })

  it('henter ny dato når fanen blir synlig igjen etter dvale', () => {
    vi.setSystemTime(new Date(2026, 9, 26, 22))
    const { result } = renderHook(() => useToday())
    // The timers stand still while the computer sleeps, but the clock moves on
    vi.setSystemTime(new Date(2026, 9, 27, 8))
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(dayOf(result.current)).toEqual([2026, 10, 27])
  })

  it('beholder samme dato når fanen blir synlig samme dag', () => {
    vi.setSystemTime(new Date(2026, 9, 26, 12))
    const { result } = renderHook(() => useToday())
    const before = result.current
    vi.setSystemTime(new Date(2026, 9, 26, 18))
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(before)
  })

  it('rydder opp tidtakeren og lytteren når den fjernes', () => {
    vi.setSystemTime(new Date(2026, 9, 26, 12))
    const { result, unmount } = renderHook(() => useToday())
    const before = result.current
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    vi.setSystemTime(new Date(2026, 9, 27, 8))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(result.current).toBe(before)
  })
})
