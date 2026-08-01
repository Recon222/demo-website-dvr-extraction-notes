/**
 * GPS capture logic — the pure core of the demo's geolocation capability (parity P2.3,
 * matrix row 29; the shared module P3.4/P3.7 consume for New Location + per-camera GPS).
 *
 * Ported from the phone's `src/features/location/services/gps-service.ts`,
 * `src/features/location/constants/index.ts` and `src/features/location/lib/accuracy-rating.ts`.
 * Everything here is a pure function over injected inputs: samples come in, a fix or a typed
 * failure comes out. No `navigator`, no timers, no clock — the browser I/O that feeds it lives
 * in `ui/inputs/capture-gps.ts`.
 *
 * ── The multi-sample algorithm (verified against phone SOURCE, not phone docs) ──────────
 * `captureLocation` (gps-service.ts:165-338) loops up to `maxAttempts` readings, stops early
 * the moment one meets `targetAccuracy`, waits `retryDelay` between attempts, races the whole
 * loop against `timeout`, and then returns **the single most accurate sample** — the lowest
 * `accuracy` value (gps-service.ts:276-282). It reports `sampleCount` (:303).
 *
 * REFUTATION — there is NO >2σ outlier filter. The parity brief and
 * `docs/planning/demo-phone-parity/phone-inventory.md:5604` (§M13) both describe one, sourced
 * from phone `src/features/README.md:768` ("Filters outliers (>2σ from mean)") and
 * `src/features/DOCUMENTATION-PLAN.md:2520`. Those are aspirational DOC lines: a repo-wide
 * grep for `outlier|stdDev|sigma|variance` finds outlier filtering only in
 * `precision-time-sync/utils/offset-calculator.ts` (RTT-based, a different feature).
 * `gps-service.ts` never computes a mean or a deviation, and the phone's own accurate
 * description is `src/features/location/README.md:276` ("returns the most accurate sample").
 * Shipping a 2σ filter here would make the demo's coordinates DIFFER from the phone's for the
 * same samples, so this module implements the phone's real behaviour. See deferred.md §41.
 */

import type { CameraGpsFix, GpsSource } from '@/features/demo/engine/types'

// ---- Domain ---------------------------------------------------------------

/** One raw reading. `accuracyM` is the radius of 68% confidence in metres, as reported by the
 *  platform (`GeolocationCoordinates.accuracy` in the browser, `coords.accuracy` on the phone).
 *  OPTIONAL (R-18): a provider that omits it has measured nothing, and `0` is the one value that
 *  would render green "±0m · Excellent" and instantly satisfy the target, collapsing the
 *  multi-sample procedure to a single reading on a fabricated number. */
export interface GpsSample {
  lat: number
  lng: number
  accuracyM?: number
  /** Unix ms as reported by the platform for THIS reading — never an ambient clock read. */
  timestampMs: number
}

/** The committed result of a capture: the best sample, plus how many were taken to get it.
 *  `accuracyM` is absent when no reading carried one — the honest "coordinates captured,
 *  accuracy unknown" outcome the coordinate card already renders correctly. */
export interface GpsFix {
  lat: number
  lng: number
  accuracyM?: number
  /** ISO-8601 UTC, derived from the winning sample's own timestamp. */
  capturedAtIso: string
  sampleCount: number
}

/** The phone's `GpsError` codes (gps-service.ts:29-32) minus `UNKNOWN`, plus `UNSUPPORTED`.
 *
 *  `UNSUPPORTED` covers the one failure mode a browser has and a phone does not — no
 *  geolocation API at all (jsdom, an insecure origin, a hardened browser). `UNKNOWN` is
 *  dropped rather than carried as a dead variant: the phone needs it because an arbitrary
 *  throw can escape `captureLocation`, whereas every rejection path in `capture-gps.ts` is
 *  classified (an unrecognised `getCurrentPosition` rejection retries like
 *  POSITION_UNAVAILABLE and ends in `LOCATION_UNAVAILABLE`). Add it back only alongside a
 *  producer. */
export const GPS_ERROR_CODES = [
  'PERMISSION_DENIED',
  'LOCATION_UNAVAILABLE',
  'TIMEOUT',
  'INVALID_COORDINATES',
  'UNSUPPORTED',
] as const
export type GpsErrorCode = (typeof GPS_ERROR_CODES)[number]

export interface GpsFailure {
  code: GpsErrorCode
  message: string
}

export type GpsCaptureOutcome = { ok: true; fix: GpsFix } | { ok: false; failure: GpsFailure }

// ---- Copy (lifted verbatim from the phone) --------------------------------

/** Operator-facing failure copy. `PERMISSION_DENIED` and `LOCATION_UNAVAILABLE` are the
 *  phone's strings character for character (as is `gpsTimeoutMessage` below); `UNSUPPORTED`
 *  is demo-only and states plainly that nothing was captured — the demo never invents a
 *  coordinate to paper over a missing capability. */
export const GPS_MESSAGES = {
  /** useGpsCapture.ts:135 */
  PERMISSION_DENIED: 'Location permission is required to capture GPS coordinates',
  /** gps-service.ts:266 */
  LOCATION_UNAVAILABLE: 'Could not capture GPS location after multiple attempts',
  /** Demo-only: no `navigator.geolocation` on this origin/browser. */
  UNSUPPORTED: 'This browser has no location service available — no coordinates were captured',
} as const

/** gps-service.ts:323 — the timeout message interpolates the configured timeout in ms. */
export function gpsTimeoutMessage(timeoutMs: number): string {
  return `GPS capture timed out after ${timeoutMs}ms`
}

// ---- Configuration --------------------------------------------------------

/** Phone `GpsAccuracyMode` (settings). `precise` is the only per-capture override the phone
 *  exposes (constants/index.ts:89) — incident + per-camera capture force it. */
export const GPS_ACCURACY_MODES = ['quick', 'balanced', 'precise'] as const
export type GpsAccuracyMode = (typeof GPS_ACCURACY_MODES)[number]

/** constants/index.ts:51-55 — target accuracy in metres per mode. */
export const ACCURACY_MODE_TARGET_M: Readonly<Record<GpsAccuracyMode, number>> = Object.freeze({
  quick: 100,
  balanced: 50,
  precise: 10,
})

/** constants/index.ts:40-43 — never settings-driven on the phone either. */
export const GPS_CONFIG_STATIC = { maxAttempts: 10, retryDelayMs: 500 } as const

export interface GpsConfig {
  /** Stop sampling as soon as a reading is at least this accurate (metres). */
  targetAccuracyM: number
  maxAttempts: number
  /** Whole-capture budget in ms; the phone races the sample loop against it. */
  timeoutMs: number
  retryDelayMs: number
}

/**
 * The demo's default capture config. The phone reads mode + timeout from the Location
 * settings pane, whose defaults are `balanced` / 30 s (phone settings README:325,
 * `DEFAULT_LOCATION_SETTINGS`); the demo pins those same defaults rather than inventing new
 * ones.
 *
 * P7.1 UPDATE: the demo now HAS a Location settings pane, and it opens showing exactly these
 * two defaults — but nothing routes its values here yet. That is decision D6's stub line, and
 * the pane says so in its own words. Wiring it is one prop each through `SubmissionScreen` and
 * `NewLocationModal` to `GpsCaptureControl`'s existing optional `config`; see deferred §80b for
 * the recipe and its trigger.
 */
export function buildGpsConfig(
  mode: GpsAccuracyMode = 'balanced',
  timeoutMs = 30_000,
): GpsConfig {
  return {
    targetAccuracyM: ACCURACY_MODE_TARGET_M[mode],
    maxAttempts: GPS_CONFIG_STATIC.maxAttempts,
    timeoutMs,
    retryDelayMs: GPS_CONFIG_STATIC.retryDelayMs,
  }
}

/** constants/index.ts:75-80 — the forced-precise config used by incident + per-camera capture
 *  (P3.6/P3.7 consume this; it bypasses the settings default exactly as the phone's does).
 *  Composed from the constants above rather than re-typing them (R-10): only the 2-minute
 *  budget is genuinely its own value. `gps.test.ts` pins the resulting literals, so a change
 *  to a shared constant that should NOT reach this config still fails loudly. */
export const PRECISE_GPS_CONFIG: GpsConfig = Object.freeze({
  targetAccuracyM: ACCURACY_MODE_TARGET_M.precise,
  maxAttempts: GPS_CONFIG_STATIC.maxAttempts,
  timeoutMs: 120_000,
  retryDelayMs: GPS_CONFIG_STATIC.retryDelayMs,
})

// ---- Sample aggregation ---------------------------------------------------

/** gps-service.ts:215 — the early-exit test. A reading at exactly the target counts; a reading
 *  with no accuracy figure cannot be SHOWN to meet it, so it never ends the loop early (R-18). */
export function meetsTargetAccuracy(sample: GpsSample, targetAccuracyM: number): boolean {
  return sample.accuracyM !== undefined && sample.accuracyM <= targetAccuracyM
}

/**
 * The winning reading: lowest `accuracyM`. Ties keep the EARLIER sample, because the phone
 * compares with a strict `<` while scanning forward (gps-service.ts:277-282) — worth pinning,
 * since a browser that returns the same cached fix repeatedly produces nothing but ties.
 * Returns `null` for an empty set; callers turn that into `LOCATION_UNAVAILABLE`.
 */
export function selectBestSample(samples: readonly GpsSample[]): GpsSample | null {
  let best: GpsSample | null = null
  for (const s of samples) {
    if (best === null) {
      best = s
      continue
    }
    // R-18: a MEASURED reading always beats an unmeasured one, whatever the order. An
    // unmeasured reading wins only when nothing in the set carries an accuracy — better an
    // honest coordinate with no accuracy chip than discarding a real fix.
    if (best.accuracyM === undefined) {
      if (s.accuracyM !== undefined) best = s
      continue
    }
    if (s.accuracyM !== undefined && s.accuracyM < best.accuracyM) best = s
  }
  return best
}

/** gps-service.ts:58-74 — range guards, with the phone's exact messages. `null` = valid. */
export function validateCoordinates(lat: number, lng: number): GpsFailure | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { code: 'INVALID_COORDINATES', message: 'Invalid coordinates reported by the location service.' }
  }
  if (lat < -90 || lat > 90) {
    return { code: 'INVALID_COORDINATES', message: `Invalid latitude: ${lat}. Must be between -90 and 90.` }
  }
  if (lng < -180 || lng > 180) {
    return { code: 'INVALID_COORDINATES', message: `Invalid longitude: ${lng}. Must be between -180 and 180.` }
  }
  return null
}

/**
 * Reduce a set of readings to the committed fix — the whole tail of the phone's
 * `captureLocation` (gps-service.ts:260-310) as one pure function: no samples →
 * `LOCATION_UNAVAILABLE`; otherwise the best sample, range-validated, stamped with its own
 * ISO timestamp and the number of readings taken.
 */
export function toGpsFix(samples: readonly GpsSample[]): GpsCaptureOutcome {
  const best = selectBestSample(samples)
  if (best === null) {
    return { ok: false, failure: { code: 'LOCATION_UNAVAILABLE', message: GPS_MESSAGES.LOCATION_UNAVAILABLE } }
  }
  const invalid = validateCoordinates(best.lat, best.lng)
  if (invalid) return { ok: false, failure: invalid }
  // R-13: `new Date(NaN).toISOString()` THROWS. Unguarded, a non-conformant provider (spoofing
  // extension, old WebView, a hand-stubbed seam) turned a capture into an unhandled rejection —
  // the button returned to idle with no fix and no failure line. `INVALID_COORDINATES` is the
  // phone's code for "this reading cannot be trusted"; the message names the actual defect.
  if (!Number.isFinite(best.timestampMs)) {
    return {
      ok: false,
      failure: { code: 'INVALID_COORDINATES', message: 'Invalid timestamp reported by the location service.' },
    }
  }

  return {
    ok: true,
    fix: {
      lat: best.lat,
      lng: best.lng,
      accuracyM: best.accuracyM,
      capturedAtIso: new Date(best.timestampMs).toISOString(),
      sampleCount: samples.length,
    },
  }
}

// ---- Per-camera fix -------------------------------------------------------

/**
 * `GpsFix` → the stored per-camera coordinate (P3.7). The demo's counterpart to the phone's
 * `mapGpsLocationToCameraData` (`src/features/location/camera-gps/types.ts:47-55`), and pure
 * for the same reason: the mapping between "what a capture produced" and "what a camera row
 * stores" is the one place the five keys are decided, so it is unit-testable without a browser.
 *
 * `sampleCount` is deliberately dropped — the phone's `GpsLocation.sampleCount` doesn't reach
 * the camera entry either, and a stored reading count nothing renders would be dead weight in
 * the snapshot. `capturedAt` is the winning reading's own timestamp, carried through untouched.
 */
export function toCameraGpsFix(fix: GpsFix): CameraGpsFix {
  return {
    lat: fix.lat,
    lng: fix.lng,
    accuracyM: fix.accuracyM,
    source: 'gps',
    capturedAt: fix.capturedAtIso,
  }
}

// ---- Accuracy rating ------------------------------------------------------

export const ACCURACY_RATINGS = ['Excellent', 'Good', 'Fair', 'Poor'] as const
export type AccuracyRatingLabel = (typeof ACCURACY_RATINGS)[number]

/** Semantic tone; the UI layer maps it to the demo's palette (the engine holds no colours —
 *  the phone's `getAccuracyRating` takes theme colours as an argument for the same reason). */
export type AccuracyTone = 'success' | 'warning' | 'error'

export interface AccuracyRating {
  label: AccuracyRatingLabel
  tone: AccuracyTone
}

/**
 * accuracy-rating.ts:32-45, thresholds unchanged: Excellent ≤5 m, Good ≤10 m, Fair ≤25 m,
 * Poor >25 m. Excellent and Good share the `success` tone exactly as the phone shares
 * `colors.success` between them.
 */
export function getAccuracyRating(accuracyM: number): AccuracyRating {
  if (accuracyM <= 5) return { label: 'Excellent', tone: 'success' }
  if (accuracyM <= 10) return { label: 'Good', tone: 'success' }
  if (accuracyM <= 25) return { label: 'Fair', tone: 'warning' }
  return { label: 'Poor', tone: 'error' }
}

/** CoordinateDisplay.tsx:145 — `±{rounded}m`. */
export function formatAccuracy(accuracyM: number): string {
  return `±${Math.round(accuracyM)}m`
}

/**
 * The demo-only live sample readout, shared by every capture surface (`GpsCaptureControl`,
 * `CameraGpsCapture`). The phone shows a bare spinner; the demo exists to SHOW that a capture
 * is a forensic multi-sample procedure, and every number on this line is measured — the
 * accuracy clause is omitted entirely when no reading has carried one, rather than printing a
 * placeholder (the same R-18 rule the coordinate card follows).
 *
 * Pure and shared so the two surfaces cannot drift into two different sentences for the same
 * state, and so the format is pinned by an engine test rather than by two JSX assertions.
 */
export function formatSampleProgress(samplesTaken: number, maxAttempts: number, bestAccuracyM?: number): string {
  const best = bestAccuracyM === undefined ? '' : ` · best ${formatAccuracy(bestAccuracyM)}`
  return `Sample ${samplesTaken} of ${maxAttempts}${best}`
}

/** CoordinateDisplay.tsx:30-41 — the coordinate provenance chip.
 *
 *  R-25: `case undefined` + the `never` check, not a bare `default`. The old default was
 *  load-bearing for `undefined` (no source yet → no chip), which disguised the exhaustiveness
 *  gap: a fourth `GPS_SOURCES` member — P4's import-provided coordinates is the named
 *  candidate — would have silently rendered NO provenance chip on a card whose whole job is
 *  provenance. Now it fails to compile instead. */
export function gpsSourceLabel(source: GpsSource | undefined): string {
  switch (source) {
    case 'gps':
      return 'GPS'
    case 'manual':
      return 'Manual'
    case 'geocoded':
      return 'Geocoded'
    case undefined:
      return ''
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}
