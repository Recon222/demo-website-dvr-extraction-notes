import { describe, it, expect } from 'vitest'
import { parseCoordinate, formatCoordinate, hasCapturedCoordinates } from '@/features/demo/engine/logic/coordinates'

// Mirrors the phone app's strictParseNumber + range guards in IncidentLocationForm:
// the whole string must be a finite number (parseFloat-style truncation is unsafe for
// forensic coordinate capture), then the value must sit in the lat/lng range.
describe('parseCoordinate', () => {
  it('accepts a plain decimal latitude', () => {
    expect(parseCoordinate('43.65', 'lat')).toEqual({ ok: true, value: 43.65 })
  })

  it('accepts a negative decimal longitude', () => {
    expect(parseCoordinate('-79.38', 'lng')).toEqual({ ok: true, value: -79.38 })
  })

  it('accepts leading-dot, leading-sign, and integer forms', () => {
    expect(parseCoordinate('.5', 'lat')).toEqual({ ok: true, value: 0.5 })
    expect(parseCoordinate('-.5', 'lng')).toEqual({ ok: true, value: -0.5 })
    expect(parseCoordinate('+12', 'lat')).toEqual({ ok: true, value: 12 })
    expect(parseCoordinate('43', 'lat')).toEqual({ ok: true, value: 43 })
  })

  it('accepts the inclusive range bounds', () => {
    expect(parseCoordinate('90', 'lat')).toEqual({ ok: true, value: 90 })
    expect(parseCoordinate('-90', 'lat')).toEqual({ ok: true, value: -90 })
    expect(parseCoordinate('180', 'lng')).toEqual({ ok: true, value: 180 })
    expect(parseCoordinate('-180', 'lng')).toEqual({ ok: true, value: -180 })
  })

  it('rejects junk and partial-number forms', () => {
    for (const raw of ['43.6abc', 'abc', '', '   ', '1e', '--5', '4.5.6']) {
      expect(parseCoordinate(raw, 'lat')).toEqual({ ok: false, error: 'Enter a valid number' })
    }
  })

  it('rejects out-of-range latitude', () => {
    expect(parseCoordinate('95', 'lat')).toEqual({ ok: false, error: 'Latitude must be between -90 and 90' })
    expect(parseCoordinate('-91', 'lat')).toEqual({ ok: false, error: 'Latitude must be between -90 and 90' })
  })

  it('rejects out-of-range longitude', () => {
    expect(parseCoordinate('181', 'lng')).toEqual({ ok: false, error: 'Longitude must be between -180 and 180' })
    expect(parseCoordinate('-181', 'lng')).toEqual({ ok: false, error: 'Longitude must be between -180 and 180' })
  })
})

describe('formatCoordinate', () => {
  it('renders a fixed 6-decimal "lat, lng" pair', () => {
    expect(formatCoordinate(43.6087, -79.6505)).toBe('43.608700, -79.650500')
  })
})

// Phone parity: guards.ts hasCapturedCoordinates (BUG-008 display half). The policy question
// ("should this DISPLAY as a captured position?") is not the geometry question parseCoordinate
// answers — (0,0) is a valid pair and still must never render as an authoritative fix.
describe('hasCapturedCoordinates', () => {
  it('accepts a real captured position', () => {
    expect(hasCapturedCoordinates({ lat: 43.6087, lng: -79.6505 })).toBe(true)
  })

  it('rejects Null Island — the zero-init / failed-fix artifact', () => {
    expect(hasCapturedCoordinates({ lat: 0, lng: 0 })).toBe(false)
  })

  it('keeps the equator and the prime meridian — they are real places', () => {
    expect(hasCapturedCoordinates({ lat: 0, lng: -79.6505 })).toBe(true)
    expect(hasCapturedCoordinates({ lat: 43.6087, lng: 0 })).toBe(true)
  })

  it('rejects absent and non-finite pairs', () => {
    expect(hasCapturedCoordinates(undefined)).toBe(false)
    expect(hasCapturedCoordinates(null)).toBe(false)
    expect(hasCapturedCoordinates({ lat: Number.NaN, lng: 12 })).toBe(false)
    expect(hasCapturedCoordinates({ lat: 12, lng: Number.POSITIVE_INFINITY })).toBe(false)
  })
})
