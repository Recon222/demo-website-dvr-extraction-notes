import { describe, it, expect, vi } from 'vitest'

import { GPS_MESSAGES, buildGpsConfig } from '@/features/demo/engine/logic/gps'
import {
  captureGps,
  readBrowserGeolocation,
  type CaptureProgress,
  type GeolocationLike,
} from '@/features/demo/ui/inputs/capture-gps'

/** A `GeolocationPosition`-shaped reading. */
const position = (accuracy: number, o: { lat?: number; lng?: number; t?: number } = {}) =>
  ({
    coords: {
      latitude: o.lat ?? 43.6087,
      longitude: o.lng ?? -79.6505,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: o.t ?? Date.UTC(2026, 6, 30, 12, 0, 0),
  }) as GeolocationPosition

const positionError = (code: number) => ({ code, message: 'stub' }) as GeolocationPositionError

/** Geolocation stub that plays a scripted list of readings/errors, one per call. */
function scripted(script: ReadonlyArray<GeolocationPosition | GeolocationPositionError>): GeolocationLike & {
  calls: PositionOptions[]
} {
  let i = 0
  const calls: PositionOptions[] = []
  return {
    calls,
    getCurrentPosition(onSuccess, onError, options) {
      if (options) calls.push(options)
      const next = script[Math.min(i, script.length - 1)]
      i++
      if (next && 'coords' in next) onSuccess(next)
      else onError(next as GeolocationPositionError)
    },
  }
}

const noDelay = { delay: async () => undefined }

describe('readBrowserGeolocation', () => {
  // THE default contract: vitest.setup.ts leaves navigator.geolocation undefined, mirroring
  // its navigator.mediaDevices posture. Nothing in the demo may invent a coordinate to fill
  // the gap, so this assertion guards the honest path staying the tested one.
  it('is null under jsdom, where no geolocation service exists', () => {
    expect(readBrowserGeolocation()).toBeNull()
  })
})

describe('captureGps — honest failure paths', () => {
  it('reports UNSUPPORTED (never a coordinate) when the browser has no geolocation', async () => {
    const outcome = await captureGps(buildGpsConfig(), { geolocation: null })
    expect(outcome).toEqual({
      ok: false,
      failure: { code: 'UNSUPPORTED', message: GPS_MESSAGES.UNSUPPORTED },
    })
  })

  it('returns PERMISSION_DENIED immediately, without retrying the prompt', async () => {
    const geo = scripted([positionError(1)])
    const spy = vi.spyOn(geo, 'getCurrentPosition')
    const outcome = await captureGps(buildGpsConfig(), { geolocation: geo, ...noDelay })

    expect(outcome).toEqual({
      ok: false,
      failure: { code: 'PERMISSION_DENIED', message: GPS_MESSAGES.PERMISSION_DENIED },
    })
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('reports LOCATION_UNAVAILABLE after exhausting every attempt with no reading', async () => {
    const geo = scripted([positionError(2)])
    const spy = vi.spyOn(geo, 'getCurrentPosition')
    const config = buildGpsConfig('balanced')
    const outcome = await captureGps(config, { geolocation: geo, ...noDelay })

    expect(outcome).toEqual({
      ok: false,
      failure: { code: 'LOCATION_UNAVAILABLE', message: GPS_MESSAGES.LOCATION_UNAVAILABLE },
    })
    expect(spy).toHaveBeenCalledTimes(config.maxAttempts)
  })

  it('reports TIMEOUT with the configured budget when the first read times out', async () => {
    const geo = scripted([positionError(3)])
    const outcome = await captureGps(buildGpsConfig('balanced', 15_000), { geolocation: geo, ...noDelay })

    expect(outcome).toEqual({
      ok: false,
      failure: { code: 'TIMEOUT', message: 'GPS capture timed out after 15000ms' },
    })
  })

  it('commits the readings it already has when the budget runs out mid-capture', async () => {
    // A reading, then a timeout: real samples are never thrown away on a stopwatch.
    const geo = scripted([position(30), positionError(3)])
    const outcome = await captureGps(buildGpsConfig('precise'), { geolocation: geo, ...noDelay })

    expect(outcome?.ok).toBe(true)
    expect(outcome?.ok === true && outcome.fix.accuracyM).toBe(30)
    expect(outcome?.ok === true && outcome.fix.sampleCount).toBe(1)
  })

  it('times out before the first read when the deadline has already passed', async () => {
    const geo = scripted([position(4)])
    const spy = vi.spyOn(geo, 'getCurrentPosition')
    let t = 0
    const outcome = await captureGps(buildGpsConfig('balanced', 30_000), {
      geolocation: geo,
      ...noDelay,
      now: () => (t += 60_000), // the deadline is already behind us on the first check
    })

    expect(outcome?.ok).toBe(false)
    expect(outcome?.ok === false && outcome.failure.code).toBe('TIMEOUT')
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('captureGps — multi-sample behaviour', () => {
  it('stops early once a reading meets the target accuracy', async () => {
    const geo = scripted([position(80), position(40), position(6), position(3)])
    const spy = vi.spyOn(geo, 'getCurrentPosition')
    const outcome = await captureGps(buildGpsConfig('balanced'), { geolocation: geo, ...noDelay })

    // balanced = 50m: the 40m reading is good enough, so the 6m one is never requested.
    expect(spy).toHaveBeenCalledTimes(2)
    expect(outcome?.ok === true && outcome.fix.accuracyM).toBe(40)
    expect(outcome?.ok === true && outcome.fix.sampleCount).toBe(2)
  })

  it('keeps sampling to the attempt cap and commits the most accurate reading', async () => {
    const geo = scripted([position(90), position(60, { lat: 1, lng: 2 }), position(75)])
    const config = { ...buildGpsConfig('precise'), maxAttempts: 3 }
    const outcome = await captureGps(config, { geolocation: geo, ...noDelay })

    expect(outcome?.ok).toBe(true)
    expect(outcome?.ok === true && outcome.fix).toMatchObject({ lat: 1, lng: 2, accuracyM: 60, sampleCount: 3 })
  })

  it('keeps trying after an unavailable reading and still commits a later fix', async () => {
    let call = 0
    const geo: GeolocationLike = {
      getCurrentPosition(onSuccess, onError) {
        call++
        if (call === 1) onError(positionError(2))
        else onSuccess(position(7))
      },
    }
    const outcome = await captureGps(buildGpsConfig('balanced'), { geolocation: geo, ...noDelay })

    expect(outcome?.ok).toBe(true)
    expect(outcome?.ok === true && outcome.fix.sampleCount).toBe(1)
  })

  it('reports live progress after every reading', async () => {
    const geo = scripted([position(90), position(40), position(6)])
    const progress: CaptureProgress[] = []
    await captureGps({ ...buildGpsConfig('precise'), maxAttempts: 3 }, {
      geolocation: geo,
      ...noDelay,
      onProgress: (p) => progress.push(p),
    })

    expect(progress).toEqual([
      { samplesTaken: 1, bestAccuracyM: 90 },
      { samplesTaken: 2, bestAccuracyM: 40 },
      { samplesTaken: 3, bestAccuracyM: 6 },
    ])
  })

  it('reports no accuracy — never a fabricated 0 — when the provider omits it (R-18)', async () => {
    const noAccuracy = {
      coords: { latitude: 43.6, longitude: -79.65, accuracy: null, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.UTC(2026, 6, 30, 12, 0, 0),
    } as unknown as GeolocationPosition
    const geo = scripted([noAccuracy])
    const spy = vi.spyOn(geo, 'getCurrentPosition')
    const progress: CaptureProgress[] = []
    const config = { ...buildGpsConfig('quick'), maxAttempts: 2 }
    const outcome = await captureGps(config, { geolocation: geo, ...noDelay, onProgress: (p) => progress.push(p) })

    expect(outcome?.ok).toBe(true)
    expect(outcome?.ok === true && outcome.fix.accuracyM).toBeUndefined()
    // And it did not satisfy the target, so the loop kept sampling to the cap.
    expect(spy).toHaveBeenCalledTimes(2)
    expect(progress[0]).toEqual({ samplesTaken: 1, bestAccuracyM: undefined })
  })

  it('asks for a fresh high-accuracy fix — never a cached one', async () => {
    const geo = scripted([position(3)])
    await captureGps(buildGpsConfig(), { geolocation: geo, ...noDelay })

    expect(geo.calls[0]).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 })
    expect(geo.calls[0].timeout).toBeGreaterThan(0)
  })

  it('waits retryDelayMs between attempts', async () => {
    const geo = scripted([position(90), position(80)])
    const delay = vi.fn(async () => undefined)
    await captureGps({ ...buildGpsConfig('precise'), maxAttempts: 2 }, { geolocation: geo, delay })

    expect(delay).toHaveBeenCalledExactlyOnceWith(500)
  })

  it('abandons the capture (null — neither fix nor failure) once aborted', async () => {
    const geo = scripted([position(3)])
    const outcome = await captureGps(buildGpsConfig(), {
      geolocation: geo,
      ...noDelay,
      isAborted: () => true,
    })

    expect(outcome).toBeNull()
  })
})
