'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { formatCoordinate } from '@/features/demo/engine/logic/coordinates'
import { formatAccuracy, getAccuracyRating, gpsSourceLabel, type AccuracyTone } from '@/features/demo/engine/logic/gps'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import type { GpsCoordinates, GpsSource } from '@/features/demo/engine/types'

/**
 * The captured-coordinate card — the demo's port of the phone's `CoordinateDisplay`
 * (`src/features/location/components/CoordinateDisplay.tsx`). Renders only when coordinates
 * exist (the caller gates it, phone LocationForm.tsx:216), showing the 6-decimal pair and a
 * metadata row of `±{accuracy}m` · source · accuracy rating, with the rating's colour applied
 * to both accuracy and rating exactly as the phone does (:140-166).
 *
 * Presentational: props in, one callback-free copy action out. It reads
 * `navigator.clipboard` through an injectable seam and never touches the store.
 */

/** The demo's semantic triple — the same values `screenData.caseStatusTheme` uses. */
const TONE_COLOR: Record<AccuracyTone, string> = {
  success: '#10d177',
  warning: '#ffd93d',
  error: '#ff4757',
}

/** How long the copy confirmation stays up, matching NotesScreen's "Copy all" (R-31). The
 *  phone's equivalent is an auto-dismissing toast; a confirmation that never clears would still
 *  be claiming "Coordinates Copied" minutes later, and a failure line that never clears would
 *  outlive the condition that caused it. */
export const COPY_RESET_MS = 1600

/** Phone toast copy, reused as the card's inline confirmation (CoordinateDisplay.tsx:81,103). */
export const COPY_LABELS = {
  success: 'Coordinates Copied',
  failure: 'Unable to copy coordinates to clipboard',
} as const

async function defaultWriteClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('clipboard unavailable')
  }
  await navigator.clipboard.writeText(text)
}

const card: CSSProperties = {
  borderRadius: 12,
  border: GLASS.border,
  background: 'rgba(13,27,42,0.55)',
  padding: 12,
  width: '100%',
  textAlign: 'left',
  cursor: 'pointer',
  display: 'block',
}

/** Renders a fix that EXISTS, so it takes `GpsCoordinates` as-is: `lat`/`lng` required,
 *  `accuracyM` optional — absent when nothing measured one, and the accuracy and rating chips
 *  then don't render (phone CoordinateDisplay.tsx:138-166). Derived, not re-typed (R-24). */
export interface CoordinateDisplayProps extends GpsCoordinates {
  source?: GpsSource
  /** Test seam — defaults to `navigator.clipboard.writeText`. */
  writeClipboard?(text: string): Promise<void>
}

export function CoordinateDisplay({ lat, lng, accuracyM, source, writeClipboard }: CoordinateDisplayProps) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle')
  // Tracked handle, cleared on re-arm and on unmount (R-31, the R-12 idiom): an untracked
  // timer lets a first copy's reset wipe a second confirmation mid-display, and outlives the
  // component.
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current)
    },
    [],
  )

  const armReset = () => {
    if (resetTimer.current !== null) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => {
      resetTimer.current = null
      setCopied('idle')
    }, COPY_RESET_MS)
  }
  const coordinates = formatCoordinate(lat, lng)
  const rating = accuracyM !== undefined ? getAccuracyRating(accuracyM) : null
  const sourceLabel = gpsSourceLabel(source)

  const copy = async () => {
    const write = writeClipboard ?? defaultWriteClipboard
    try {
      await write(coordinates)
      setCopied('ok')
      armReset()
    } catch {
      // Honest, visible failure — a locked-down or permission-denied clipboard must not look
      // like a successful copy (the phone shows its "Copy Failed" toast for the same reason).
      setCopied('failed')
      armReset()
    }
  }

  const sep = <span style={{ fontSize: 12, color: '#7a9fc4' }}>|</span>

  // R-6: `button` descendants are children-presentational and `aria-label` overrides the name
  // computation, so the metadata spans below are invisible to assistive tech. The measured
  // accuracy, its rating and the provenance — the whole point of a forensic coordinate card —
  // go into the accessible name instead.
  const nameParts = [`GPS coordinates: ${coordinates}`]
  if (rating && accuracyM !== undefined) nameParts.push(`accuracy ${formatAccuracy(accuracyM)}, ${rating.label}`)
  if (sourceLabel) nameParts.push(`source ${sourceLabel}`)
  nameParts.push('Copy to clipboard.')

  return (
    <div style={{ marginBottom: 14 }}>
      <button
        type="button"
        onClick={copy}
        style={card}
        data-testid="coordinate-display"
        aria-label={nameParts.join('. ')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span aria-hidden="true" style={{ fontSize: 16 }}>
            📍
          </span>
          <span
            data-testid="coordinate-display-coords"
            style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-jbmono, monospace)', color: '#f0f4f8' }}
          >
            {coordinates}
          </span>
        </div>
        {(rating || sourceLabel) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 22 }}>
            {rating && accuracyM !== undefined && (
              <span data-testid="coordinate-display-accuracy" style={{ fontSize: 12, fontWeight: 500, color: TONE_COLOR[rating.tone] }}>
                {formatAccuracy(accuracyM)}
              </span>
            )}
            {rating && sourceLabel && sep}
            {sourceLabel && (
              <span data-testid="coordinate-display-source" style={{ fontSize: 12, fontWeight: 500, color: '#7a9fc4' }}>
                {sourceLabel}
              </span>
            )}
            {rating && (
              <>
                {sep}
                <span data-testid="coordinate-display-rating" style={{ fontSize: 12, fontWeight: 500, color: TONE_COLOR[rating.tone] }}>
                  {rating.label}
                </span>
              </>
            )}
          </div>
        )}
      </button>
      {/* R-6: the live region is a SIBLING of the button, not a descendant — inside it the copy
          failure would be announced to nobody (the same shape GpsCaptureControl already uses for
          its progress/error lines). A blocked clipboard must not look like a successful copy to
          AT any more than it does visually. */}
      {copied !== 'idle' && (
        <div
          role="status"
          data-testid="coordinate-display-copy-status"
          style={{ fontSize: 12, marginTop: 6, marginLeft: 22, color: copied === 'ok' ? '#10d177' : '#ff4757' }}
        >
          {copied === 'ok' ? COPY_LABELS.success : COPY_LABELS.failure}
        </div>
      )}
    </div>
  )
}
