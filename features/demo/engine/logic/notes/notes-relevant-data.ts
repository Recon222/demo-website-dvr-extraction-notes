/**
 * Notes-relevant data extraction — THE single coercion site for reconcile inputs
 * (phone parity: `notes/services/notes-relevant-data.ts` / architecture rule F5).
 * Every reconcile caller — the notes store actions, the section meta builder, the
 * Case Notes PDF derivation — must build its `NotesRelevantFormData` through this
 * function: output comparison is only stable if all callers coerce identically.
 *
 * Demo-shape adaptations (each is the ONE place the demo store shape meets the
 * phone-verbatim formatter shape):
 * - `arrival`/`departure` keys → `arrivalDateTime`/`departureDateTime`.
 * - Corrected scope times are DERIVED here via `calculateCorrectedTimeRange` (the
 *   demo never stores them — the phone writes them onto scope entries when the
 *   offset is calculated; the demo derives on read). Present only when an offset
 *   exists AND the requested times are canonical — mirroring the phone's "corrected
 *   appears once the offset calculation has produced both times". Deterministic from
 *   (scope, timeOffset), so output comparison stays stable.
 * - `totalDvrRetention` is stored WITH its unit ('35 days', written by the
 *   retention-derivation effect / import); the trailing unit is stripped here so the
 *   verbatim retention formatter appends ' days' exactly once.
 * - `timeOffsetData` narrows to the display pair (formattedDifference + direction) —
 *   the notes never read differenceMs (phone parity: isDvrTimeCorrect keys off the
 *   displayed string).
 */

import type { DemoLocation } from '@/features/demo/engine/types'
import { calculateCorrectedTimeRange } from '@/features/demo/engine/logic/time'
import type { NotesRelevantFormData, NotesScope } from '@/features/demo/engine/logic/notes/types'

/** '35 days' / '35 day' → '35'; already-bare '35' passes through. */
function stripDaysUnit(totalDvrRetention: string): string {
  return totalDvrRetention.replace(/\s*days?\s*$/i, '')
}

export function extractNotesRelevantData(loc: DemoLocation): NotesRelevantFormData {
  const form = loc.form
  const off = form.timeOffset

  const scopes: NotesScope[] = form.scopes.map(sc => {
    const base: NotesScope = {
      startDateTime: sc.startDateTime,
      endDateTime: sc.endDateTime,
      isActualTime: sc.isActualTime,
      cameras: sc.cameras,
    }
    if (!off) return base
    try {
      const corrected = calculateCorrectedTimeRange(
        { startDateTime: sc.startDateTime, endDateTime: sc.endDateTime },
        off,
        sc.isActualTime,
      )
      return {
        ...base,
        correctedStartDateTime: corrected.startDateTime,
        correctedEndDateTime: corrected.endDateTime,
      }
    } catch {
      // Non-canonical requested times — corrected stays absent (Tier-2 rendering).
      // Deliberately silent: this runs per reconcile/render; the creation-boundary
      // breadcrumbs (generateExtractedScopes / applyImport) already surfaced it once.
      return base
    }
  })

  return {
    address: '', // the demo has no legacy flat address — locations are created structured
    businessName: loc.businessName || undefined,
    streetAddress: loc.streetAddress || undefined,
    city: loc.city || undefined,
    arrivalDepartures: form.arrivalDepartures.map(v => ({
      arrivalDateTime: v.arrival,
      departureDateTime: v.departure,
    })),
    scopes,
    extractedScopes: form.extractedScopes.map(es => ({
      startDateTime: es.startDateTime,
      endDateTime: es.endDateTime,
      cameras: es.cameras,
    })),
    timeOffsetData: off
      ? { formattedDifference: off.formattedDifference, direction: off.direction }
      : undefined,
    cameras: form.cameras.map(c => ({
      cameraName: c.cameraName,
      resolution: c.resolution,
      recordingFps: c.recordingFps,
      gps: c.gps,
    })),
    totalDvrRetention: stripDaysUnit(form.dvr.totalDvrRetention || ''),
    exportMedia: form.export.exportMedia || '',
    sizeGb: form.export.sizeGb || '',
    mediaProvidedVia: form.export.mediaProvidedVia || '',
  }
}
