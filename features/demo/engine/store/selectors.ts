import type { DemoState } from '@/features/demo/engine/store/create-store'
import type { DemoCase, DemoLocation, DrawerDef, WizardScreenId } from '@/features/demo/engine/types'
import { getProfile } from '@/features/demo/engine/content/profiles'
import { DRAWER_DEFS } from '@/features/demo/engine/content/screens'
import { calculateCorrectedTimeRange } from '@/features/demo/engine/logic/time'
import type { CaseNotesData } from '@/features/demo/engine/logic/pdf/case-notes'

/** Pure derived reads so components stay dumb (props in, no store logic). */

export interface AdjustedScopeRow {
  id: string
  reqLabel: string
  reqStart: string
  reqEnd: string
  adjStart: string
  adjEnd: string
  cameras: string
}

/**
 * Requested scopes with their EXACT corrected (adjusted) times — `calculateCorrectedTimeRange`,
 * NO rounding. The Time-Offset screen shows these (the actual difference calculation); the
 * Extracted-Scope screen rounds them to 5-minute boundaries separately (`generateExtractedScopes`).
 * A scope whose requested time isn't canonical yet leaves its adjusted fields blank.
 */
export function selectAdjustedScopes(s: DemoState): AdjustedScopeRow[] {
  const loc = selectCurrentLocation(s)
  const off = loc?.form.timeOffset
  if (!loc || !off) return []
  return loc.form.scopes.map((sc) => {
    let adjStart = ''
    let adjEnd = ''
    try {
      const cr = calculateCorrectedTimeRange({ startDateTime: sc.startDateTime, endDateTime: sc.endDateTime }, off, sc.isActualTime)
      adjStart = cr.startDateTime
      adjEnd = cr.endDateTime
    } catch {
      // non-canonical requested time — adjusted stays blank (the extracted screen surfaces it)
    }
    return {
      id: sc.id,
      reqLabel: sc.isActualTime ? 'real time' : 'DVR time',
      reqStart: sc.startDateTime,
      reqEnd: sc.endDateTime,
      adjStart,
      adjEnd,
      cameras: sc.cameras,
    }
  })
}

export function selectCurrentCase(s: DemoState): DemoCase | null {
  return s.cases.find((c) => c.id === s.currentCaseId) ?? null
}

export function selectCurrentLocation(s: DemoState): DemoLocation | null {
  return s.locations.find((l) => l.id === s.currentLocationId) ?? null
}

export function selectLocationsForCase(s: DemoState, caseId: string): DemoLocation[] {
  return s.locations.filter((l) => l.caseId === caseId)
}

export function selectVisibleWizardScreens(s: DemoState): WizardScreenId[] {
  return getProfile(s.profile).wizardScreens
}

export function selectDrawerItems(s: DemoState): DrawerDef[] {
  const visible = new Set(selectVisibleWizardScreens(s))
  return DRAWER_DEFS.filter((d) => visible.has(d.id))
}

// ---- Wizard drawer completion dots ----------------------------------------------------------
export type DrawerStatus = 'complete' | 'partial' | 'empty'

const isFilled = (v: string | undefined): boolean => typeof v === 'string' && v.trim().length > 0

/** all blank → empty · all filled → complete · some → partial */
function checkFields(values: Array<string | undefined>): DrawerStatus {
  const n = values.filter(isFilled).length
  if (n === 0) return 'empty'
  return n === values.length ? 'complete' : 'partial'
}

/** no items / all-blank items → empty · every item fully filled → complete · else partial */
function checkArray<T>(items: T[], fields: (item: T) => Array<string | undefined>): DrawerStatus {
  if (items.length === 0) return 'empty'
  const per = items.map((it) => checkFields(fields(it)))
  if (per.every((d) => d === 'complete')) return 'complete'
  if (per.every((d) => d === 'empty')) return 'empty'
  return 'partial'
}

/**
 * Per-screen completion dot for the wizard drawer — mirrors the phone's `useSectionCompletion`:
 * the dot tells the user what's not yet filled, but only counted fields move it. Excluded:
 * toggles (a boolean is never "empty"), derived/read-only fields, and the two explicit opt-outs —
 * DVR `serialModelNumber` and export `mediaPlayerIncluded` (a screen goes green without them).
 * Notes is two-state; extracted-scope is empty only at 0 items; completion has no editable fields.
 * `null` location → all empty. See docs/planning/demo-drawer-status-dots for the field mapping.
 */
export function selectDrawerStatus(loc: DemoLocation | null): Record<WizardScreenId, DrawerStatus> {
  if (!loc) {
    return {
      submission: 'empty',
      requestedScope: 'empty',
      arrivalDeparture: 'empty',
      timeOffset: 'empty',
      extractedScope: 'empty',
      dvrInfo: 'empty',
      cameras: 'empty',
      exportInfo: 'empty',
      notes: 'empty',
      completion: 'empty',
    }
  }
  const f = loc.form
  const dvr = f.dvr
  const ex = f.extractedScopes
  return {
    submission: checkFields([loc.requesterName, loc.requesterBadge, loc.requesterPhone, loc.requesterEmail, loc.businessName, loc.streetAddress, loc.city, loc.locationContact, loc.locationPhone]),
    requestedScope: checkArray(f.scopes, (s) => [s.startDateTime, s.endDateTime, s.cameras]),
    arrivalDeparture: checkArray(f.arrivalDepartures, (a) => [a.arrival, a.departure]),
    timeOffset: checkFields([f.timeOffset?.dvrDateTime, f.timeOffset?.actualDateTime]),
    extractedScope: ex.length === 0 ? 'empty' : ex.every((s) => checkFields([s.startDateTime, s.endDateTime, s.cameras]) === 'complete') ? 'complete' : 'partial',
    dvrInfo: checkFields([dvr.dvrLocation, dvr.dvrTypeBrand, dvr.dvrUsername, dvr.dvrPassword, dvr.numberOfChannels, dvr.activeCameras, dvr.resolution, dvr.recordingFps, dvr.firstRecordedDate]),
    cameras: checkArray(f.cameras, (c) => [c.cameraName, c.resolution, c.recordingFps]),
    exportInfo: checkFields([f.export.exportMedia, f.export.fileType, f.export.sizeGb, f.export.mediaProvidedVia]),
    notes: isFilled(f.notesText) ? 'complete' : 'empty',
    completion: 'empty',
  }
}

/** Assemble the current case + location into the Case Notes PDF input shape. */
export function selectCaseNotesData(s: DemoState): CaseNotesData {
  const loc = selectCurrentLocation(s)
  const caseObj = selectCurrentCase(s)
  const form = loc?.form
  const off = form?.timeOffset ?? null
  // "Adjusted Scope (Calculated Times)" is the EXACT corrected time (matches the app's PDF) — not
  // the rounded extracted scope. Rounding is the extracted-scope screen's job, not the document's.
  const adjusted = selectAdjustedScopes(s)
  return {
    occNumber: caseObj?.caseNumber,
    address: loc ? [loc.businessName, loc.streetAddress, loc.city].filter(Boolean).join(', ') : '',
    requesterName: loc?.requesterName,
    requesterBadgeNumber: loc?.requesterBadge,
    requesterUnit: caseObj?.unit,
    requesterPhone: loc?.requesterPhone,
    requesterEmail: loc?.requesterEmail,
    locationContact: loc?.locationContact,
    locationPhone: loc?.locationPhone,
    scopes: form?.scopes.map((sc) => ({
      start: sc.startDateTime,
      end: sc.endDateTime,
      isActualTime: sc.isActualTime,
      cameras: sc.cameras,
    })),
    adjustedScopes: adjusted.filter((r) => r.adjStart && r.adjEnd).map((r) => ({ start: r.adjStart, end: r.adjEnd })),
    adjustedScopesPartial: adjusted.some((r) => !r.adjStart || !r.adjEnd),
    timeOffset: off
      ? { isCorrect: off.isCorrect, formattedDifference: off.formattedDifference, direction: off.direction }
      : null,
    dvrDateTime: off?.dvrDateTime,
    actualDateTime: off?.actualDateTime,
    dvr: form?.dvr,
    cameras: form?.cameras.map((c) => ({ name: c.cameraName, resolution: c.resolution, fps: c.recordingFps })),
    export: form?.export,
    notes: form?.notesText,
    arrivalDepartures: form?.arrivalDepartures.map((a) => ({ arrival: a.arrival, departure: a.departure })),
  }
}
