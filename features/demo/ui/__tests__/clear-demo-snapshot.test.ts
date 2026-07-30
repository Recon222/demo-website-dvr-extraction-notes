import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clearDemoSnapshot } from '@/features/demo/ui/clear-demo-snapshot'
import { clearSnapshot, SNAPSHOT_KEY } from '@/features/demo/engine/store/persistence'

// The "Start fresh" session wipe (review R-24): the /demo error net's escape hatch for a
// state-driven throw — the boundary flushes the throwing state as the newest snapshot, so
// reset() alone would rebuild it forever.
describe('clearDemoSnapshot', () => {
  beforeEach(() => window.sessionStorage.clear())
  afterEach(() => window.sessionStorage.clear())

  it('removes the snapshot key and leaves unrelated keys alone', () => {
    window.sessionStorage.setItem(SNAPSHOT_KEY, '{"version":2,"state":{}}')
    window.sessionStorage.setItem('unrelated', 'kept')
    clearDemoSnapshot()
    expect(window.sessionStorage.getItem(SNAPSHOT_KEY)).toBeNull()
    expect(window.sessionStorage.getItem('unrelated')).toBe('kept')
  })

  it('is a safe no-op when the sessionStorage PROPERTY ACCESS itself throws (Safari private mode)', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('storage blocked')
      },
    })
    try {
      expect(() => clearDemoSnapshot()).not.toThrow()
    } finally {
      if (original) Object.defineProperty(window, 'sessionStorage', original)
    }
  })
})

describe('clearSnapshot (engine, injected storage)', () => {
  it('null storage is a no-op', () => {
    expect(() => clearSnapshot(null)).not.toThrow()
  })

  it('a throwing removeItem is swallowed with the dev breadcrumb', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const storage = {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => {
          throw new Error('quotaish')
        },
      }
      expect(() => clearSnapshot(storage)).not.toThrow()
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })
})
