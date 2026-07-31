/**
 * Pure coordinate parsing/validation for the demo's manual lat/lng entry (incident scene).
 *
 * Ported from the phone app's `IncidentLocationForm.strictParseNumber` + range guards: a
 * coordinate must round-trip as a *complete* finite number (parseFloat-style truncation like
 * `parseFloat("43.6abc") === 43.6` is unsafe for forensic capture), then sit inside the
 * lat (±90) / lng (±180) range. No React, no DOM — engine-pure and unit-tested.
 */

export type CoordKind = 'lat' | 'lng'

export type ParseCoordinateResult =
  | { ok: true; value: number }
  | { ok: false; error: string }

const NUMERIC = /^[-+]?(\d+\.?\d*|\.\d+)$/

/**
 * Strict-parse + range-validate a raw coordinate string for the given axis.
 * Accepts `43`, `43.65`, `-79.38`, `.5`, `-.5`, `+12`. Rejects `43.6abc`, `abc`, ``, `1e`, `--5`.
 */
export function parseCoordinate(raw: string, kind: CoordKind): ParseCoordinateResult {
  const trimmed = raw.trim()
  if (!NUMERIC.test(trimmed)) return { ok: false, error: 'Enter a valid number' }
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return { ok: false, error: 'Enter a valid number' }
  if (kind === 'lat') {
    if (n < -90 || n > 90) return { ok: false, error: 'Latitude must be between -90 and 90' }
  } else if (n < -180 || n > 180) {
    return { ok: false, error: 'Longitude must be between -180 and 180' }
  }
  return { ok: true, value: n }
}

/** Fixed 6-decimal "lat, lng" display (forensic precision; matches the phone coordinate chip). */
export function formatCoordinate(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

/**
 * "Were these coordinates actually CAPTURED?" — the phone's `hasCapturedCoordinates` policy
 * (BUG-008/BUG-024): reject NaN/Infinity, out-of-range values, and the exact (0,0) null-island
 * pair, which is what a failed fix reported as zeros looks like. A (0,0) row once printed as an
 * authoritative GPS location in a court-admissible PDF.
 *
 * It lives HERE, next to the other coordinate policy, because it has two consumers with the
 * same duty — the notes camera formatter and the PDF camera table — exactly as on the phone,
 * where both import one shared function (`@/features/case-management`) rather than each
 * carrying its own copy of the (0,0) rule.
 */
export function hasCapturedCoordinates(gps: { lat: number; lng: number }): boolean {
  const { lat, lng } = gps
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  if (lat === 0 && lng === 0) return false
  return true
}
