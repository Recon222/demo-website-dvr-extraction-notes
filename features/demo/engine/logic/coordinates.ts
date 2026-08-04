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
 * Captured-position gate — port of the phone's `hasCapturedCoordinates`
 * (`src/features/case-management/types/guards.ts:103-110`, BUG-008 display half).
 *
 * Answers a DIFFERENT question than `parseCoordinate`:
 *   parseCoordinate          → "is this a well-formed lat/lng?"                  (geometry)
 *   hasCapturedCoordinates   → "should this ever DISPLAY as a captured position?" (policy)
 *
 * (0,0) — Null Island — is geometrically valid but is never a legitimate captured position
 * for this app (Ontario policing; the point is in the Gulf of Guinea). It is the classic
 * zero-init / failed-fix artifact, and rendering it as authoritative would put a false
 * position into a court-facing record. Latitude 0 alone (equator) or longitude 0 alone
 * (prime meridian) remain real places and pass.
 *
 * Every demo surface that DISPLAYS or PLOTS a coordinate should gate on this rather than on
 * object presence — that is exactly how `0.000000, 0.000000` reached the phone's case-detail
 * sheet in the original BUG-008 report.
 *
 * Shared by every consumer with this duty (notes camera formatter, PDF camera table,
 * case sheet, screenData) — one function, not per-file copies of the (0,0) rule.
 */
export function hasCapturedCoordinates(
  value: { lat: number; lng: number } | null | undefined,
): value is { lat: number; lng: number } {
  if (!value) return false
  if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return false
  if (value.lat < -90 || value.lat > 90 || value.lng < -180 || value.lng > 180) return false
  return !(value.lat === 0 && value.lng === 0)
}
