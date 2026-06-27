import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'

type Listener = (event: { matches: boolean }) => void

function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>()
  const mql = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_type: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_type: string, cb: Listener) => listeners.delete(cb),
    emit(matches: boolean) {
      mql.matches = matches
      listeners.forEach((cb) => cb({ matches }))
    },
  }
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql))
  return mql
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useReducedMotion', () => {
  it('returns false when the user has no reduced-motion preference', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when the user prefers reduced motion', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('updates when the preference changes', () => {
    const mql = mockMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)

    act(() => {
      mql.emit(true)
    })

    expect(result.current).toBe(true)
  })

  it('defaults to false when matchMedia is unavailable', () => {
    // jsdom has no matchMedia unless stubbed; the hook must not throw.
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('removes its change listener on unmount (no leak)', () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener,
        removeEventListener,
      }),
    )

    const { unmount } = renderHook(() => useReducedMotion())
    // The exact handler instance registered must be the one torn down — a mismatched
    // reference (e.g. an anonymous wrapper) would leave the listener attached.
    const handler = addEventListener.mock.calls[0][1]
    expect(addEventListener).toHaveBeenCalledWith('change', handler)

    unmount()

    expect(removeEventListener).toHaveBeenCalledWith('change', handler)
  })
})
