'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { buildGpsConfig, type GpsConfig, type GpsFailure, type GpsFix } from '@/features/demo/engine/logic/gps'
import {
  captureGps,
  readBrowserGeolocation,
  type CaptureGpsDeps,
  type CaptureProgress,
} from '@/features/demo/ui/inputs/capture-gps'

/**
 * React wrapper around `captureGps` — the demo's analog of the phone's `useGpsCapture`
 * (`src/features/location/hooks/useGpsCapture.ts`). Same three guarantees:
 *
 * 1. one capture at a time (phone :74-80),
 * 2. an in-flight capture is abandoned on unmount and never writes state after it (phone's
 *    `abortRef` + cleanup effect, :60-67),
 * 3. the previous failure is cleared when a new capture starts (phone :86).
 *
 * It adds the demo-only live progress readout (`samplesTaken` / `bestAccuracyM`): on the phone
 * the multi-sample loop is invisible behind a one-second spinner, and the demo exists to SHOW
 * that the capture is a forensic multi-sample procedure rather than a single fix.
 *
 * The capability is deliberately generic — P3.4 (New Location) and P3.7 (per-camera GPS) mount
 * the same hook with `PRECISE_GPS_CONFIG`.
 */

export interface UseGpsCaptureOptions {
  /** Defaults to the balanced/30s config (the phone's settings default). */
  config?: GpsConfig
  /** Test seam: overrides for the browser I/O (`geolocation`, `delay`, `now`). */
  deps?: Partial<Omit<CaptureGpsDeps, 'onProgress' | 'isAborted'>>
}

export interface UseGpsCaptureReturn {
  isCapturing: boolean
  /** Live during a capture, retained after it so the UI can report how many readings were taken. */
  progress: CaptureProgress | null
  fix: GpsFix | null
  failure: GpsFailure | null
  /** Runs a capture. Resolves to the fix, or `null` if it failed or was abandoned. */
  capture(): Promise<GpsFix | null>
  reset(): void
}

export function useGpsCapture(options: UseGpsCaptureOptions = {}): UseGpsCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)
  const [progress, setProgress] = useState<CaptureProgress | null>(null)
  const [fix, setFix] = useState<GpsFix | null>(null)
  const [failure, setFailure] = useState<GpsFailure | null>(null)

  const abortedRef = useRef(false)
  // `isCapturing` state can't guard re-entry: two clicks in the same tick both read the
  // pre-update value. The ref is the actual mutex (the phone has the same shape via its
  // synchronous early return).
  const runningRef = useRef(false)

  useEffect(() => {
    abortedRef.current = false
    return () => {
      abortedRef.current = true
    }
  }, [])

  // Read the latest options inside the handler rather than closing over them, so a caller
  // passing an inline config object doesn't invalidate `capture`'s identity every render.
  // Synced in an effect (not during render) — `capture` only ever runs from an event
  // handler, which is always after the commit that refreshed this.
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  const capture = useCallback(async (): Promise<GpsFix | null> => {
    if (runningRef.current) return null
    runningRef.current = true

    const { config, deps } = optionsRef.current
    setFailure(null)
    setProgress(null)
    setIsCapturing(true)

    try {
      const outcome = await captureGps(config ?? buildGpsConfig(), {
        geolocation: deps?.geolocation !== undefined ? deps.geolocation : readBrowserGeolocation(),
        delay: deps?.delay,
        now: deps?.now,
        onProgress: (p) => {
          if (!abortedRef.current) setProgress(p)
        },
        isAborted: () => abortedRef.current,
      })

      // Unmounted mid-capture, or the capture was abandoned — leave state alone.
      if (abortedRef.current || outcome === null) return null

      if (outcome.ok) {
        setFix(outcome.fix)
        return outcome.fix
      }
      setFailure(outcome.failure)
      return null
    } finally {
      runningRef.current = false
      if (!abortedRef.current) setIsCapturing(false)
    }
  }, [])

  const reset = useCallback(() => {
    setProgress(null)
    setFix(null)
    setFailure(null)
  }, [])

  return { isCapturing, progress, fix, failure, capture, reset }
}
