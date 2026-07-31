'use client'

import type { CSSProperties } from 'react'

import { formatAccuracy, type GpsConfig, type GpsFix } from '@/features/demo/engine/logic/gps'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { switchKeyDown } from '@/features/demo/ui/screens/_shared'
import { useGpsCapture, type UseGpsCaptureOptions } from '@/features/demo/ui/inputs/useGpsCapture'

/**
 * "Use Current Location" — the demo's port of the phone's `GpsCaptureControl`
 * (`src/features/location/components/GpsCaptureControl.tsx`, ui-mapping 05:39): a flex-1
 * glass capture button with a compact labelled "Geocode" toggle to its right, and capture
 * errors rendered inline below the row.
 *
 * Ownership matches the phone's: this control owns the CAPTURE, the parent owns the
 * reverse-geocode (it holds the preference and the address fields), so the only thing this
 * emits is the fix. That is what makes it reusable as-is for P3.4 (New Location) and P3.7
 * (per-camera, with `PRECISE_GPS_CONFIG`).
 *
 * Two deliberate demo additions over the phone, both additive and both truthful:
 *
 * 1. **The sample counter.** The phone's busy state is a spinner plus the single word
 *    "Capturing…" (GpsCaptureControl.tsx:71) — its multi-sample loop is invisible. The demo
 *    exists to SHOW that a capture is a forensic multi-sample procedure, so the button keeps
 *    the phone's verbatim "Capturing…" label and a separate progress line underneath reports
 *    the readings actually taken and the best accuracy so far. Every number on that line is
 *    measured, never simulated.
 * 2. **The `UNSUPPORTED` failure line.** A browser can lack geolocation entirely; a phone
 *    cannot. The message says plainly that nothing was captured (see `GPS_MESSAGES`) — there
 *    is no sample-coordinate fallback anywhere in this capability.
 */

const button: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '12px 16px',
  minHeight: 60, // phone GpsCaptureControl.tsx:156 — fixed height, no bump between states
  borderRadius: 10,
  border: GLASS.borderBtn,
  background: GLASS.gradientCardDiag,
  color: '#f0f4f8',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'center',
}

/** Phone copy, verbatim (GpsCaptureControl.tsx:71 / LocationForm.tsx:207 / :113). */
export const GPS_CONTROL_LABELS = {
  capture: 'Use Current Location',
  capturing: 'Capturing…',
  lookingUp: 'Looking up address…',
  geocodeToggle: 'Geocode',
} as const

function LocateIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4BA3D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="2.2" fill="#4BA3D4" stroke="none" />
    </svg>
  )
}

function Spinner() {
  // Direct read, matching PickerStage's reduced-motion treatment (P1.2 review R-14).
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <svg
      aria-hidden="true"
      data-testid="gps-capture-spinner"
      width="18"
      height="18"
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

export interface GpsCaptureControlProps {
  /** Button label — P3.7's per-camera control passes the "(Highest Accuracy)" variant. */
  label?: string
  /** Capture config; omit for the settings default (balanced / 30 s). */
  config?: GpsConfig
  /** Called with the fix on success. The PARENT decides whether to reverse-geocode. */
  onCapture(fix: GpsFix): void
  /** Per-context reverse-geocode-on-capture preference, owned by the parent (phone parity). */
  geocodeEnabled: boolean
  onToggleGeocode(enabled: boolean): void
  /** True while the parent is reverse-geocoding — swaps the in-button label, no layout bump. */
  reverseGeocoding?: boolean
  disabled?: boolean
  /** Test seam forwarded to `useGpsCapture` (geolocation / delay / now). */
  deps?: UseGpsCaptureOptions['deps']
}

export function GpsCaptureControl({
  label = GPS_CONTROL_LABELS.capture,
  config,
  onCapture,
  geocodeEnabled,
  onToggleGeocode,
  reverseGeocoding = false,
  disabled = false,
  deps,
}: GpsCaptureControlProps) {
  const { isCapturing, progress, failure, capture } = useGpsCapture({ config, deps })

  const busy = isCapturing || reverseGeocoding
  const busyText = isCapturing ? GPS_CONTROL_LABELS.capturing : GPS_CONTROL_LABELS.lookingUp

  const onClick = () => {
    void capture().then((fix) => {
      if (fix) onCapture(fix)
    })
  }

  return (
    <div style={{ marginBottom: 14 }} data-testid="gps-capture-control">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onClick}
          disabled={busy || disabled}
          aria-busy={busy}
          aria-label={isCapturing ? 'Capturing location, please wait' : reverseGeocoding ? 'Looking up address, please wait' : label}
          style={{ ...button, opacity: busy || disabled ? 0.7 : 1, cursor: busy || disabled ? 'default' : 'pointer' }}
        >
          {busy ? <Spinner /> : <LocateIcon />}
          <span>{busy ? busyText : label}</span>
        </button>

        {/* Compact geocode toggle — keeps the button wide (phone GpsCaptureControl.tsx:111-120). */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, color: '#7a9fc4' }}>
            {GPS_CONTROL_LABELS.geocodeToggle}
          </span>
          <div
            role="switch"
            aria-checked={geocodeEnabled}
            aria-label="Reverse-geocode captured coordinates into an address"
            tabIndex={0}
            onClick={() => onToggleGeocode(!geocodeEnabled)}
            onKeyDown={switchKeyDown(() => onToggleGeocode(!geocodeEnabled))}
            style={{ width: 46, height: 28, borderRadius: 14, background: geocodeEnabled ? '#2B8CC1' : '#1e3a5f', position: 'relative', cursor: 'pointer' }}
          >
            <div style={{ position: 'absolute', top: 3, [geocodeEnabled ? 'right' : 'left']: 3, width: 22, height: 22, borderRadius: 11, background: geocodeEnabled ? '#fff' : '#7a9fc4' }} />
          </div>
        </div>
      </div>

      {/* Live sample readout — demo-only (see the header note); every value is measured. */}
      {isCapturing && progress && (
        <div role="status" data-testid="gps-capture-progress" style={{ fontSize: 12, color: '#7a9fc4', marginTop: 5 }}>
          {`Sample ${progress.samplesTaken} of ${config?.maxAttempts ?? 10} · best ${formatAccuracy(progress.bestAccuracyM)}`}
        </div>
      )}

      {failure && (
        <div role="alert" data-testid="gps-capture-error" style={{ fontSize: 12, color: '#ff4757', marginTop: 4 }}>
          {failure.message}
        </div>
      )}
    </div>
  )
}
