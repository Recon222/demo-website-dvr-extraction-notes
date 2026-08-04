import { describe, it, expect, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { GPS_MESSAGES, buildGpsConfig } from '@/features/demo/engine/logic/gps'
import type { GeolocationLike } from '@/features/demo/ui/inputs/capture-gps'
import { useGpsCapture } from '@/features/demo/ui/inputs/useGpsCapture'

const position = (accuracy: number) =>
  ({
    coords: {
      latitude: 43.6087,
      longitude: -79.6505,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.UTC(2026, 6, 30, 12, 0, 0),
  }) as GeolocationPosition

/** Resolves each `getCurrentPosition` on the microtask queue, so state updates are awaitable. */
const asyncGeolocation = (accuracy: number, delayResolve = false): GeolocationLike => ({
  getCurrentPosition(onSuccess) {
    if (delayResolve) setTimeout(() => onSuccess(position(accuracy)), 5)
    else onSuccess(position(accuracy))
  },
})

const deps = (geolocation: GeolocationLike | null) => ({ geolocation, delay: async () => undefined })

describe('useGpsCapture', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useGpsCapture())
    expect(result.current).toMatchObject({ isCapturing: false, fix: null, failure: null, progress: null })
  })

  it('takes the honest UNSUPPORTED path with no geolocation service (the jsdom default)', async () => {
    const { result } = renderHook(() => useGpsCapture())

    let returned: unknown = 'unset'
    await act(async () => {
      returned = await result.current.capture()
    })

    expect(returned).toBeNull()
    expect(result.current.fix).toBeNull()
    expect(result.current.failure).toEqual({ code: 'UNSUPPORTED', message: GPS_MESSAGES.UNSUPPORTED })
    expect(result.current.isCapturing).toBe(false)
  })

  it('commits a fix and exposes the sample progress', async () => {
    const { result } = renderHook(() =>
      useGpsCapture({ config: buildGpsConfig('balanced'), deps: deps(asyncGeolocation(8)) }),
    )

    await act(async () => {
      await result.current.capture()
    })

    expect(result.current.fix).toMatchObject({ lat: 43.6087, lng: -79.6505, accuracyM: 8, sampleCount: 1 })
    expect(result.current.progress).toEqual({ samplesTaken: 1, bestAccuracyM: 8 })
    expect(result.current.failure).toBeNull()
  })

  it('clears a previous failure when a new capture starts', async () => {
    const { result, rerender } = renderHook(
      ({ geo }: { geo: GeolocationLike | null }) => useGpsCapture({ deps: deps(geo) }),
      { initialProps: { geo: null as GeolocationLike | null } },
    )

    await act(async () => {
      await result.current.capture()
    })
    expect(result.current.failure?.code).toBe('UNSUPPORTED')

    rerender({ geo: asyncGeolocation(4) })
    await act(async () => {
      await result.current.capture()
    })

    expect(result.current.failure).toBeNull()
    expect(result.current.fix?.accuracyM).toBe(4)
  })

  it('runs one capture at a time — a second call while in flight is a no-op', async () => {
    const getCurrentPosition = vi.fn<GeolocationLike['getCurrentPosition']>((onSuccess) => {
      setTimeout(() => onSuccess(position(9)), 5)
    })
    const { result } = renderHook(() => useGpsCapture({ deps: deps({ getCurrentPosition }) }))

    await act(async () => {
      const first = result.current.capture()
      const second = await result.current.capture() // same tick, while the first is in flight
      expect(second).toBeNull()
      await first
    })

    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(result.current.fix?.accuracyM).toBe(9)
  })

  it('does not write state after unmount (no act warning, no torn state)', async () => {
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args))

    const { result, unmount } = renderHook(() =>
      useGpsCapture({ deps: deps(asyncGeolocation(9, true)) }),
    )

    let settled: unknown = 'unset'
    let pending!: Promise<unknown>
    // Sync act: flushes the capture's opening state writes, leaves the promise in flight.
    act(() => {
      pending = result.current.capture().then((v) => {
        settled = v
      })
    })
    unmount()
    await pending
    await waitFor(() => expect(settled).toBeNull())

    expect(errors).toEqual([])
    spy.mockRestore()
  })

  it('reset() clears the fix, failure and progress', async () => {
    const { result } = renderHook(() => useGpsCapture({ deps: deps(asyncGeolocation(3)) }))
    await act(async () => {
      await result.current.capture()
    })
    expect(result.current.fix).not.toBeNull()

    act(() => result.current.reset())
    expect(result.current).toMatchObject({ fix: null, failure: null, progress: null })
  })
})
