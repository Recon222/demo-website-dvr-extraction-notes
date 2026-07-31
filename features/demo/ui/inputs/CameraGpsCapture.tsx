'use client'

import type { CSSProperties } from 'react'

import {
  PRECISE_GPS_CONFIG,
  formatSampleProgress,
  toCameraGpsFix,
} from '@/features/demo/engine/logic/gps'
import type { CameraGpsFix } from '@/features/demo/engine/types'
import { CoordinateDisplay } from '@/features/demo/ui/inputs/CoordinateDisplay'
import { GPS_CONTROL_LABELS } from '@/features/demo/ui/inputs/GpsCaptureControl'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { useGpsCapture, type UseGpsCaptureOptions } from '@/features/demo/ui/inputs/useGpsCapture'

/**
 * Per-camera GPS capture (parity P3.7, matrix row 42) — the demo's port of the phone's
 * `CameraGpsCapture` (`src/features/location/camera-gps/components/CameraGpsCapture.tsx`,
 * ui-mapping 07:149-158). A compact 44×44 glass crosshair button sitting on a camera row,
 * with the captured fix rendered beside it and capture errors below.
 *
 * It composes `useGpsCapture` DIRECTLY rather than reusing `GpsCaptureControl`, exactly as the
 * phone does and for the same reason: this surface is an icon, has no reverse-geocode toggle
 * (a camera's coordinates are never turned into a street address) and no wide label.
 *
 * ── Two things the phone hard-codes, kept ────────────────────────────────────────────────
 * 1. **Forced precise accuracy.** Every camera capture runs `PRECISE_GPS_CONFIG` — the phone's
 *    `CAMERA_ACCURACY_OVERRIDE = 'precise'` (camera-gps/constants.ts:23), bypassing the
 *    settings default. Individual cameras are metres apart inside one building, so the 10 m
 *    target (and the 2-minute budget that buys it) is the whole point of the sub-feature.
 * 2. **The icon says whether a fix exists.** Outline crosshair before, filled crosshair after,
 *    with the phone's two accessible names verbatim (`locate-outline`/`locate`;
 *    camera-gps/constants.ts:8-17).
 *
 * ── Ownership ────────────────────────────────────────────────────────────────────────────
 * Presentational: it emits `onCapture(cameraId, fix)` and stores nothing. The bridge decides
 * whether that write still applies — see `setCameraGps` in `engine/store/create-store.ts`,
 * which resolves the camera BY ID at write time, so a row removed (or a location switched)
 * during the capture is never written to and never resurrected. This component contributes the
 * other half of that guard for free: the row is keyed by camera id in `CamerasScreen`, so a
 * removal unmounts it and `useGpsCapture`'s abort fires before any callback can run.
 */

/** Phone copy, verbatim (`src/features/location/camera-gps/constants.ts:14-17`). */
export const CAMERA_GPS_LABELS = {
  capture: 'Capture camera GPS location',
  recapture: 'Re-capture camera GPS location',
} as const

/** camera-gps/constants.ts:20 — the compact glass square. */
export const CAMERA_GPS_BUTTON_SIZE = 44

const iconButton: CSSProperties = {
  width: CAMERA_GPS_BUTTON_SIZE,
  height: CAMERA_GPS_BUTTON_SIZE,
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  border: GLASS.borderBtn,
  background: GLASS.gradientCardDiag,
  cursor: 'pointer',
  padding: 0,
}

/** `locate-outline` / `locate`: the same crosshair, its centre filled once a fix is stored. */
function CrosshairIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4BA3D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      {filled && <circle cx="12" cy="12" r="3" fill="#4BA3D4" stroke="none" />}
    </svg>
  )
}

function Spinner() {
  // Direct read, matching GpsCaptureControl's reduced-motion treatment (P1.2 review R-14).
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <svg
      aria-hidden="true"
      data-testid="camera-gps-spinner"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4BA3D4"
      strokeWidth="2.5"
      style={{ animation: reduce ? undefined : 'spin 0.9s linear infinite' }}
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" />
    </svg>
  )
}

export interface CameraGpsCaptureProps {
  /** Stable identity of the camera row this control belongs to — the write token the bridge
   *  re-resolves. NOT the row index: the index a capture started on may name another camera
   *  (or nothing) two minutes later. */
  cameraId: string
  /** The camera's stored fix, if it has one. Drives the icon variant and the coordinate card. */
  gps?: CameraGpsFix
  onCapture(cameraId: string, gps: CameraGpsFix): void
  /** Test seam forwarded to `useGpsCapture` (geolocation / delay / now). */
  deps?: UseGpsCaptureOptions['deps']
}

export function CameraGpsCapture({ cameraId, gps, onCapture, deps }: CameraGpsCaptureProps) {
  const { isCapturing, progress, failure, capture } = useGpsCapture({ config: PRECISE_GPS_CONFIG, deps })

  const hasCoordinates = gps !== undefined
  const label = hasCoordinates ? CAMERA_GPS_LABELS.recapture : CAMERA_GPS_LABELS.capture

  const onClick = () => {
    // R-7: `aria-disabled`, not `disabled`. A real `disabled` attribute blurs the element, so a
    // keyboard user loses their place in the camera list for the whole 120 s precise budget —
    // and the error line below would then announce with focus nowhere near a route back.
    if (isCapturing) return
    capture()
      .then((fix) => {
        if (fix) onCapture(cameraId, toCameraGpsFix(fix))
      })
      .catch((e: unknown) => {
        // R-13 backstop: `capture()` classifies every failure it can see, so reaching here means
        // a genuinely unexpected throw. Swallowing it would leave the dead-button shape.
        console.warn('[demo/gps] camera capture chain threw unexpectedly:', e)
      })
  }

  return (
    <div data-testid={`camera-gps-${cameraId}`} style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <button
          type="button"
          onClick={onClick}
          aria-disabled={isCapturing}
          aria-busy={isCapturing}
          aria-label={isCapturing ? GPS_CONTROL_LABELS.capturingA11y : label}
          style={{ ...iconButton, opacity: isCapturing ? 0.7 : 1, cursor: isCapturing ? 'default' : 'pointer' }}
        >
          {isCapturing ? <Spinner /> : <CrosshairIcon filled={hasCoordinates} />}
        </button>

        {gps && (
          // The card carries its own 14px trailing gutter; cancelling it here keeps ONE gutter
          // below the group instead of two stacked ones (CoordinateDisplay is shared with the
          // Submission block, so the margin belongs to it, not to this row).
          <div style={{ flex: 1, minWidth: 0, marginBottom: -14 }}>
            <CoordinateDisplay lat={gps.lat} lng={gps.lng} accuracyM={gps.accuracyM} source={gps.source} />
          </div>
        )}
      </div>

      {/* Live sample readout — demo-only, every value measured (see `formatSampleProgress`). */}
      {isCapturing && progress && (
        <div role="status" data-testid={`camera-gps-${cameraId}-progress`} style={{ fontSize: 12, color: '#7a9fc4', marginTop: 5 }}>
          {formatSampleProgress(progress.samplesTaken, PRECISE_GPS_CONFIG.maxAttempts, progress.bestAccuracyM)}
        </div>
      )}

      {failure && (
        <div role="alert" data-testid={`camera-gps-${cameraId}-error`} style={{ fontSize: 12, color: '#ff4757', marginTop: 4 }}>
          {failure.message}
        </div>
      )}
    </div>
  )
}
