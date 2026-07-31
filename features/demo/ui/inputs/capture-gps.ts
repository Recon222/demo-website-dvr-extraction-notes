'use client'

import {
  GPS_MESSAGES,
  gpsTimeoutMessage,
  meetsTargetAccuracy,
  selectBestSample,
  toGpsFix,
  type GpsCaptureOutcome,
  type GpsConfig,
  type GpsFailure,
  type GpsSample,
} from '@/features/demo/engine/logic/gps'
import { clock } from '@/features/demo/ui/inputs/clock'

/**
 * Browser geolocation I/O — the thin layer between `navigator.geolocation` and the pure
 * aggregation core in `engine/logic/gps.ts`. This is the demo's analog of the phone's
 * `gps-service.captureLocation` loop; everything it decides ABOUT the samples lives in the
 * engine, so this file only orchestrates: read, count, retry, stop.
 *
 * Honesty contract (the demo's brand rule): when the browser has no geolocation service, or
 * the visitor declines the permission prompt, this returns a typed failure. It never
 * substitutes a plausible-looking coordinate, and there is no "sample fallback" the way the
 * media capability has one — a fabricated GPS fix in a forensic tool would be a lie about
 * evidence provenance, not a convenience. `vitest.setup.ts` deliberately leaves
 * `navigator.geolocation` undefined (the same posture it takes for `navigator.mediaDevices`),
 * so the `UNSUPPORTED` path is the DEFAULT tested contract.
 */

/** The slice of `navigator.geolocation` this module uses — the injection seam for tests. */
export interface GeolocationLike {
  getCurrentPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError: (error: GeolocationPositionError) => void,
    options?: PositionOptions,
  ): void
}

/** `navigator.geolocation`, or `null` on any environment that doesn't expose it (jsdom, an
 *  insecure origin, a locked-down browser). Read at call time — never at module scope. */
export function readBrowserGeolocation(): GeolocationLike | null {
  if (typeof navigator === 'undefined') return null
  const geo = (navigator as Navigator & { geolocation?: GeolocationLike }).geolocation
  return geo ?? null
}

export interface CaptureProgress {
  /** Readings taken so far, 1-based once the first lands. Drives the live sample counter. */
  samplesTaken: number
  /** Accuracy of the best reading so far, in metres. */
  bestAccuracyM: number
}

export interface CaptureGpsDeps {
  /** `null` means "this browser has no location service" → an `UNSUPPORTED` failure. */
  geolocation: GeolocationLike | null
  /** Between-attempt pause (phone: `retryDelay`). Injected so tests don't wait 500ms a sample. */
  delay?(ms: number): Promise<void>
  /** Wall clock in ms, for the capture deadline. Defaults to the demo's clock seam. */
  now?(): number
  /** Fired after every successful reading — the demo's live progress readout. */
  onProgress?(progress: CaptureProgress): void
  /** Polled between attempts; `true` abandons the capture (component unmounted). */
  isAborted?(): boolean
}

const realDelay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** W3C `GeolocationPositionError` codes — named because the constants live on an instance. */
const POSITION_ERROR = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as const

function getPosition(geolocation: GeolocationLike, options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, reject, options)
  })
}

/** Structural narrowing — a rejected `getCurrentPosition` hands back a `GeolocationPositionError`,
 *  but a stubbed/broken implementation could reject with anything. */
function positionErrorCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null
  const code = (error as { code?: unknown }).code
  return typeof code === 'number' ? code : null
}

/**
 * Multi-sample capture, mirroring phone `gps-service.captureLocation` (:165-338): up to
 * `maxAttempts` high-accuracy readings, stop early the moment one meets `targetAccuracyM`,
 * `retryDelayMs` between attempts, and commit the most accurate reading.
 *
 * ONE deliberate mechanical difference from the phone: the phone races the whole sample loop
 * against a `setTimeout` timer, while this enforces the same budget as a DEADLINE — each
 * `getCurrentPosition` is given the remaining budget as its own `timeout` option, and the
 * deadline is re-checked between attempts. Same guarantee (the capture cannot outlive
 * `timeoutMs` by more than the tail of one reading the browser has already been told to
 * abandon), with no dangling timer to leak and no fake-timer choreography in tests.
 *
 * Returns `null` when `isAborted()` went true mid-capture — an abandoned capture is neither a
 * fix nor a failure the operator should see, matching the phone's abort branches which return
 * `{ location: null, error: null }` (useGpsCapture.ts:100-105,121-126,150-155).
 */
export async function captureGps(
  config: GpsConfig,
  deps: CaptureGpsDeps,
): Promise<GpsCaptureOutcome | null> {
  const { geolocation, onProgress, isAborted } = deps
  const delay = deps.delay ?? realDelay
  const now = deps.now ?? (() => clock.now().getTime())

  if (!geolocation) {
    return { ok: false, failure: { code: 'UNSUPPORTED', message: GPS_MESSAGES.UNSUPPORTED } }
  }

  const deadline = now() + config.timeoutMs
  const timedOut: GpsCaptureOutcome = {
    ok: false,
    failure: { code: 'TIMEOUT', message: gpsTimeoutMessage(config.timeoutMs) },
  }

  const samples: GpsSample[] = []
  let attempts = 0

  while (attempts < config.maxAttempts) {
    if (isAborted?.()) return null

    const remainingMs = deadline - now()
    // Out of budget with nothing to show — the phone's TIMEOUT branch. With samples in hand
    // we commit what we have instead of discarding real readings on a stopwatch.
    if (remainingMs <= 0) return samples.length > 0 ? toGpsFix(samples) : timedOut

    let position: GeolocationPosition
    try {
      position = await getPosition(geolocation, {
        enableHighAccuracy: true, // phone: Accuracy.BestForNavigation
        maximumAge: 0, // a forensic capture must never be served a cached fix
        timeout: remainingMs,
      })
    } catch (error) {
      attempts++
      const code = positionErrorCode(error)

      // Permission is a terminal answer — retrying a denial only burns the budget and
      // re-prompts. The phone reaches the same state before sampling (useGpsCapture:129-140);
      // in a browser the denial surfaces on the first read instead.
      if (code === POSITION_ERROR.PERMISSION_DENIED) {
        const failure: GpsFailure = { code: 'PERMISSION_DENIED', message: GPS_MESSAGES.PERMISSION_DENIED }
        return { ok: false, failure }
      }
      // The per-call timeout WAS the remaining budget, so this is the overall timeout.
      if (code === POSITION_ERROR.TIMEOUT) {
        return samples.length > 0 ? toGpsFix(samples) : timedOut
      }
      // POSITION_UNAVAILABLE (or an unrecognised rejection — the demo classifies rather than
      // carrying the phone's `UNKNOWN` code): keep trying while attempts remain, exactly as
      // the phone does (gps-service.ts:249-255). Exhausting them yields LOCATION_UNAVAILABLE.
      if (attempts >= config.maxAttempts) break
      await delay(config.retryDelayMs)
      continue
    }

    attempts++
    samples.push({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      // `accuracy` is required by the spec but defensively defaulted (the phone defaults the
      // nullable native value to 0 the same way, gps-service.ts:206).
      accuracyM: position.coords.accuracy ?? 0,
      timestampMs: position.timestamp,
    })
    const best = selectBestSample(samples)
    onProgress?.({ samplesTaken: samples.length, bestAccuracyM: best?.accuracyM ?? 0 })

    if (meetsTargetAccuracy(samples[samples.length - 1], config.targetAccuracyM)) break
    if (attempts >= config.maxAttempts) break
    await delay(config.retryDelayMs)
  }

  if (isAborted?.()) return null
  return toGpsFix(samples)
}
