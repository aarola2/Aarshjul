import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CORRUPT_COPY_KEY, FIRST_CORRUPT_COPY_KEY, keepCorruptCopy, olderCorruptCopy } from './storage.ts'

const copy = () => localStorage.getItem(CORRUPT_COPY_KEY)
const first = () => localStorage.getItem(FIRST_CORRUPT_COPY_KEY)
// Storage is full for this key only; other writes go through as usual
const failWritesTo = (key: string) => {
  const setItem = localStorage.setItem.bind(localStorage)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k: string, value: string) => {
    if (k === key) throw new DOMException('Full', 'QuotaExceededError')
    setItem(k, value)
  })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('kopier av ødelagte data', () => {
  it('bruker en egen nøkkel med prosjektnavn og versjon for den første kopien', () => {
    expect(FIRST_CORRUPT_COPY_KEY).toBe('aarhjul:v1:corrupt-copy-first')
  })

  it('den første kopien havner der den alltid har gjort, og det finnes ingen eldre', () => {
    expect(keepCorruptCopy('A')).toBe(true)
    expect(copy()).toBe('A')
    expect(first()).toBeNull()
    expect(olderCorruptCopy('A')).toBeNull()
  })

  it('en ny, annerledes kopi flytter den forrige til sin egen plass i stedet for å overskrive den', () => {
    keepCorruptCopy('A')
    expect(keepCorruptCopy('B')).toBe(true)
    expect(copy()).toBe('B')
    expect(first()).toBe('A')
    expect(olderCorruptCopy('B')).toBe('A')
  })

  it('den første kopien står, også når det kommer en tredje', () => {
    keepCorruptCopy('A')
    keepCorruptCopy('B')
    keepCorruptCopy('C')
    expect(copy()).toBe('C')
    expect(first()).toBe('A')
    expect(olderCorruptCopy('C')).toBe('A')
  })

  it('de samme dataene to ganger, for eksempel ved ny innlasting, flytter ingenting', () => {
    keepCorruptCopy('A')
    keepCorruptCopy('A')
    expect(copy()).toBe('A')
    expect(first()).toBeNull()
  })

  it('er den første kopien lik dataene som vises nå, er det ingen eldre kopi å tilby', () => {
    keepCorruptCopy('A')
    keepCorruptCopy('B')
    keepCorruptCopy('A')
    expect(olderCorruptCopy('A')).toBeNull()
  })

  it('beholder den eksisterende kopien og sier fra når den nye ikke får plass', () => {
    keepCorruptCopy('A')
    failWritesTo(FIRST_CORRUPT_COPY_KEY)
    expect(keepCorruptCopy('B')).toBe(false)
    expect(copy()).toBe('A')
    expect(first()).toBeNull()
    expect(olderCorruptCopy('B')).toBe('A')
  })

  it('beholder den første kopien når den nyeste ikke kan skrives', () => {
    keepCorruptCopy('A')
    keepCorruptCopy('B')
    failWritesTo(CORRUPT_COPY_KEY)
    expect(keepCorruptCopy('C')).toBe(false)
    expect(first()).toBe('A')
    expect(copy()).toBe('B')
  })

  it('krasjer ikke når nettleseren sperrer lagringen', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Sperret', 'SecurityError')
    })
    expect(keepCorruptCopy('A')).toBe(false)
    expect(olderCorruptCopy('A')).toBeNull()
  })
})
