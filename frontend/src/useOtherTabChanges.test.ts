import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CORRUPT_COPY_KEY, STORAGE_KEY } from './storage.ts'
import { useOtherTabChanges } from './useOtherTabChanges.ts'

const changeIn = (key: string | null, storageArea: Storage | null = localStorage) => {
  window.dispatchEvent(new StorageEvent('storage', { key, storageArea }))
}

describe('useOtherTabChanges', () => {
  it('melder fra når en annen fane endrer gjøremålene', () => {
    const onChange = vi.fn()
    renderHook(() => {
      useOtherTabChanges(onChange)
    })
    changeIn(STORAGE_KEY)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('melder fra når en annen fane tømmer hele lagringen', () => {
    const onChange = vi.fn()
    renderHook(() => {
      useOtherTabChanges(onChange)
    })
    changeIn(null)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it.each([
    ['kopien av ødelagte data', CORRUPT_COPY_KEY],
    ['et annet prosjekt på samme adresse', 'annet-prosjekt:v1:todos'],
    ['en nøkkel som ligner', 'aarhjul:v1:todos-x'],
  ])('ignorerer endringer i %s', (_name, key) => {
    const onChange = vi.fn()
    renderHook(() => {
      useOtherTabChanges(onChange)
    })
    changeIn(key)
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each([
    ['gjøremålenes nøkkel i sessionStorage', STORAGE_KEY, sessionStorage],
    ['sessionStorage som tømmes', null, sessionStorage],
    ['en hendelse uten lagringsområde', STORAGE_KEY, null],
  ])('ignorerer %s', (_name, key, storageArea) => {
    const onChange = vi.fn()
    renderHook(() => {
      useOtherTabChanges(onChange)
    })
    changeIn(key, storageArea)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ignorerer hendelsen når nettleseren sperrer lagringen', () => {
    const onChange = vi.fn()
    renderHook(() => {
      useOtherTabChanges(onChange)
    })
    const area = localStorage
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Lagring er sperret', 'SecurityError')
    })
    changeIn(STORAGE_KEY, area)
    vi.restoreAllMocks()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('slutter å lytte når komponenten fjernes', () => {
    const onChange = vi.fn()
    const { unmount } = renderHook(() => {
      useOtherTabChanges(onChange)
    })
    unmount()
    changeIn(STORAGE_KEY)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('bruker den nyeste funksjonen etter en ny opptegning', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(
      ({ onChange }) => {
        useOtherTabChanges(onChange)
      },
      { initialProps: { onChange: first } },
    )
    rerender({ onChange: second })
    changeIn(STORAGE_KEY)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
  })
})
