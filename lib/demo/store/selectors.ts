import type { DemoState } from '@/lib/demo/store/create-store'
import type { DemoCase, DemoLocation, DrawerDef, WizardScreenId } from '@/lib/demo/types'
import { getProfile } from '@/lib/demo/content/profiles'
import { DRAWER_DEFS } from '@/lib/demo/content/screens'
import type { CaseNotesData } from '@/lib/demo/logic/pdf/case-notes'

/** Pure derived reads so components stay dumb (props in, no store logic). */

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

/** Assemble the current case + location into the Case Notes PDF input shape. */
export function selectCaseNotesData(s: DemoState): CaseNotesData {
  const loc = selectCurrentLocation(s)
  const caseObj = selectCurrentCase(s)
  const form = loc?.form
  const off = form?.timeOffset ?? null
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
    adjustedScopes: form?.extractedScopes.map((sc) => ({ start: sc.startDateTime, end: sc.endDateTime })),
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
