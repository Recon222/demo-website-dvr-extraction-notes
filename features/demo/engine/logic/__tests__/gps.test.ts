import { describe, it, expect } from 'vitest'

import {
  ACCURACY_MODE_TARGET_M,
  GPS_CONFIG_STATIC,
  GPS_MESSAGES,
  PRECISE_GPS_CONFIG,
  buildGpsConfig,
  formatAccuracy,
  getAccuracyRating,
  gpsSourceLabel,
  gpsTimeoutMessage,
  meetsTargetAccuracy,
  selectBestSample,
  toGpsFix,
  validateCoordinates,
  type GpsSample,
} from '@/features/demo/engine/logic/gps'

const sample = (o: Partial<GpsSample> = {}): GpsSample => ({
  lat: 43.6087,
  lng: -79.6505,
  accuracyM: 12,
  timestampMs: Date.UTC(2026, 6, 30, 14, 5, 6),
  ...o,
})

describe('config', () => {
  it('pins the phone accuracy-mode targets (quick 100 / balanced 50 / precise 10)', () => {
    expect(ACCURACY_MODE_TARGET_M).toEqual({ quick: 100, balanced: 50, precise: 10 })
  })

  it('defaults to the phone settings default: balanced, 30s, 10 samples, 500ms apart', () => {
    expect(buildGpsConfig()).toEqual({
      targetAccuracyM: 50,
      maxAttempts: 10,
      timeoutMs: 30_000,
      retryDelayMs: 500,
    })
    expect(GPS_CONFIG_STATIC).toEqual({ maxAttempts: 10, retryDelayMs: 500 })
  })

  it('resolves an explicit mode + timeout', () => {
    expect(buildGpsConfig('precise', 45_000)).toEqual({
      targetAccuracyM: 10,
      maxAttempts: 10,
      timeoutMs: 45_000,
      retryDelayMs: 500,
    })
  })

  it('exposes the forced-precise config the phone uses for incident/per-camera capture', () => {
    expect(PRECISE_GPS_CONFIG).toEqual({
      targetAccuracyM: 10,
      maxAttempts: 10,
      timeoutMs: 120_000,
      retryDelayMs: 500,
    })
  })
})

describe('meetsTargetAccuracy', () => {
  it('is inclusive at the target (phone uses <=)', () => {
    expect(meetsTargetAccuracy(sample({ accuracyM: 50 }), 50)).toBe(true)
    expect(meetsTargetAccuracy(sample({ accuracyM: 49.9 }), 50)).toBe(true)
    expect(meetsTargetAccuracy(sample({ accuracyM: 50.1 }), 50)).toBe(false)
  })

  it('never ends the loop early on a reading with no accuracy figure (R-18)', () => {
    // A `0` default would satisfy every target instantly and collapse the multi-sample
    // procedure to one reading — on a number nobody measured.
    expect(meetsTargetAccuracy(sample({ accuracyM: undefined }), 100)).toBe(false)
  })
})

describe('selectBestSample', () => {
  it('returns the lowest-accuracy-value (most accurate) reading', () => {
    const best = sample({ accuracyM: 4, lat: 1 })
    expect(selectBestSample([sample({ accuracyM: 30 }), best, sample({ accuracyM: 9 })])).toBe(best)
  })

  it('keeps the EARLIER sample on a tie — a browser returning one cached fix is all ties', () => {
    const first = sample({ accuracyM: 8, timestampMs: 1_000 })
    const second = sample({ accuracyM: 8, timestampMs: 2_000 })
    expect(selectBestSample([first, second])).toBe(first)
  })

  it('returns null for an empty set', () => {
    expect(selectBestSample([])).toBeNull()
  })

  it('prefers a MEASURED reading over an unmeasured one, in either order (R-18)', () => {
    const measured = sample({ accuracyM: 40 })
    const unmeasured = sample({ accuracyM: undefined })
    expect(selectBestSample([unmeasured, measured])).toBe(measured)
    expect(selectBestSample([measured, unmeasured])).toBe(measured)
  })

  it('still returns an unmeasured reading when nothing in the set carries an accuracy', () => {
    // Better an honest coordinate with no accuracy chip than discarding a real fix.
    const first = sample({ accuracyM: undefined, timestampMs: 1_000 })
    expect(selectBestSample([first, sample({ accuracyM: undefined, timestampMs: 2_000 })])).toBe(first)
  })
})

describe('validateCoordinates', () => {
  it('accepts in-range coordinates and the exact poles/antimeridian', () => {
    expect(validateCoordinates(43.6, -79.6)).toBeNull()
    expect(validateCoordinates(90, 180)).toBeNull()
    expect(validateCoordinates(-90, -180)).toBeNull()
  })

  it('rejects out-of-range latitude with the phone message', () => {
    expect(validateCoordinates(91, 0)).toEqual({
      code: 'INVALID_COORDINATES',
      message: 'Invalid latitude: 91. Must be between -90 and 90.',
    })
  })

  it('rejects out-of-range longitude with the phone message', () => {
    expect(validateCoordinates(0, -181)).toEqual({
      code: 'INVALID_COORDINATES',
      message: 'Invalid longitude: -181. Must be between -180 and 180.',
    })
  })

  it('rejects non-finite readings', () => {
    expect(validateCoordinates(Number.NaN, 0)?.code).toBe('INVALID_COORDINATES')
    expect(validateCoordinates(0, Number.POSITIVE_INFINITY)?.code).toBe('INVALID_COORDINATES')
  })
})

describe('toGpsFix', () => {
  it('commits the best sample with its own timestamp and the sample count', () => {
    const out = toGpsFix([
      sample({ accuracyM: 40, timestampMs: Date.UTC(2026, 6, 30, 14, 0, 0) }),
      sample({ accuracyM: 6, lat: 43.7, lng: -79.4, timestampMs: Date.UTC(2026, 6, 30, 14, 0, 3) }),
      sample({ accuracyM: 18, timestampMs: Date.UTC(2026, 6, 30, 14, 0, 6) }),
    ])
    expect(out).toEqual({
      ok: true,
      fix: {
        lat: 43.7,
        lng: -79.4,
        accuracyM: 6,
        capturedAtIso: '2026-07-30T14:00:03.000Z',
        sampleCount: 3,
      },
    })
  })

  it('fails with LOCATION_UNAVAILABLE (phone copy) when nothing was captured', () => {
    expect(toGpsFix([])).toEqual({
      ok: false,
      failure: { code: 'LOCATION_UNAVAILABLE', message: GPS_MESSAGES.LOCATION_UNAVAILABLE },
    })
  })

  it('fails rather than committing an out-of-range winning sample', () => {
    const out = toGpsFix([sample({ accuracyM: 3, lat: 120 })])
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.failure.code).toBe('INVALID_COORDINATES')
  })

  it('commits a fix with no accuracy when no reading carried one (R-18)', () => {
    const out = toGpsFix([sample({ accuracyM: undefined })])
    expect(out.ok).toBe(true)
    expect(out.ok === true && out.fix.accuracyM).toBeUndefined()
    expect(out.ok === true && out.fix.lat).toBe(43.6087)
  })

  it('fails with a typed error rather than throwing on a malformed timestamp (R-13)', () => {
    // new Date(NaN).toISOString() throws; unguarded that became an unhandled rejection and a
    // dead capture button with no failure line.
    const out = toGpsFix([sample({ accuracyM: 5, timestampMs: Number.NaN })])
    expect(out).toEqual({
      ok: false,
      failure: { code: 'INVALID_COORDINATES', message: 'Invalid timestamp reported by the location service.' },
    })
  })

  it('counts every reading taken, not just the winner', () => {
    const out = toGpsFix([sample({ accuracyM: 9 }), sample({ accuracyM: 9 }), sample({ accuracyM: 9 })])
    expect(out.ok === true && out.fix.sampleCount).toBe(3)
  })
})

describe('getAccuracyRating', () => {
  it.each([
    [0, 'Excellent', 'success'],
    [5, 'Excellent', 'success'],
    [5.1, 'Good', 'success'],
    [10, 'Good', 'success'],
    [10.1, 'Fair', 'warning'],
    [25, 'Fair', 'warning'],
    [25.1, 'Poor', 'error'],
    [180, 'Poor', 'error'],
  ])('rates %sm as %s/%s', (accuracy, label, tone) => {
    expect(getAccuracyRating(accuracy as number)).toEqual({ label, tone })
  })
})

describe('formatting', () => {
  it('renders accuracy as ±{rounded}m', () => {
    expect(formatAccuracy(8.4)).toBe('±8m')
    expect(formatAccuracy(8.5)).toBe('±9m')
    expect(formatAccuracy(0)).toBe('±0m')
  })

  it('labels the coordinate source like the phone chip', () => {
    expect(gpsSourceLabel('gps')).toBe('GPS')
    expect(gpsSourceLabel('geocoded')).toBe('Geocoded')
    expect(gpsSourceLabel('manual')).toBe('Manual')
    expect(gpsSourceLabel(undefined)).toBe('')
  })

  it('interpolates the configured timeout into the timeout message', () => {
    expect(gpsTimeoutMessage(30_000)).toBe('GPS capture timed out after 30000ms')
  })
})
