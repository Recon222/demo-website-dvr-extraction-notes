import type { DemoCase } from '@/features/demo/engine/types'
import type { CaseEdits, NewCaseInput } from '@/features/demo/engine/store/create-store'
import { parseCoordinate } from '@/features/demo/engine/logic/coordinates'

/**
 * The New Case form's value shape and the mappers between it and the store.
 *
 * Extracted for the same reason the phone extracted `incident-location-mapping.ts`: once a
 * modal has BOTH a create and an edit caller, the seed and the submit are two halves of one
 * round trip, and inlining them at each call site is how they drift. `caseToCaseForm` and
 * `caseFormToInput` are inverses over everything the form can express; a field added to
 * `NewCaseFields` that only one of them knows about is a bug this file's tests catch.
 *
 * Lives in the UI layer (like `screenData.ts`) because `NewCaseFields` is a form view-model:
 * every value is a STRING, including the coordinates, because that is what an <input> holds.
 * The parse back to numbers happens here, at the boundary, and nowhere else.
 */
export interface NewCaseFields {
  caseNumber: string
  displayName: string
  unit: string
  oicName: string
  oicBadge: string
  vcName: string
  vcBadge: string
  incidentBusinessName: string
  incidentStreetAddress: string
  incidentCity: string
  /** Manual coordinate entry (string-form for the inputs; parsed + range-checked at submit).
   *  The incident scene can be off-grid (no street address), so coords are hand-enterable. */
  incidentLatitude: string
  incidentLongitude: string
  /** '' | 'geocoded' (filled by an address pick) | 'manual' (typed by hand). */
  incidentCoordinateSource: string
  notes: string
}

export const blankCaseForm: NewCaseFields = {
  caseNumber: '',
  displayName: '',
  unit: '',
  oicName: '',
  oicBadge: '',
  vcName: '',
  vcBadge: '',
  incidentBusinessName: '',
  incidentStreetAddress: '',
  incidentCity: '',
  incidentLatitude: '',
  incidentLongitude: '',
  incidentCoordinateSource: '',
  notes: '',
}

/**
 * Seed the form from a stored case — the demo's `caseToIncidentValues` analog, widened to the
 * whole case because the demo's modal owns every field (the phone splits the incident block
 * into its own mapper so `EditIncidentLocationModal` can share it).
 *
 * Coordinates come back as their string form so the manual inputs stay editable, and the
 * stored `source` is carried through: re-opening a geocoded case and saving it unchanged must
 * NOT silently restamp the coordinates as hand-typed.
 */
export function caseToCaseForm(c: DemoCase): NewCaseFields {
  return {
    caseNumber: c.caseNumber,
    displayName: c.displayName,
    unit: c.unit,
    oicName: c.oicName,
    oicBadge: c.oicBadge,
    vcName: c.vcName,
    vcBadge: c.vcBadge,
    incidentBusinessName: c.incidentBusinessName,
    incidentStreetAddress: c.incidentStreetAddress,
    incidentCity: c.incidentCity,
    incidentLatitude: c.incidentCoordinates ? String(c.incidentCoordinates.lat) : '',
    incidentLongitude: c.incidentCoordinates ? String(c.incidentCoordinates.lng) : '',
    incidentCoordinateSource: c.incidentCoordinates?.source ?? '',
    notes: c.notes,
  }
}

/**
 * Incident coordinates, or `undefined`. Built only when BOTH values pass the strict
 * `parseCoordinate` (range included) — a half pair is meaningless and a typo'd pair is worse
 * than none, since a wrong scene coordinate would end up on a map and in a document. An
 * invalid entry costs the coordinates, never the case (matrix B4, preserved verbatim).
 */
function toIncidentCoordinates(form: NewCaseFields): NewCaseInput['incidentCoordinates'] {
  const lat = parseCoordinate(form.incidentLatitude, 'lat')
  const lng = parseCoordinate(form.incidentLongitude, 'lng')
  if (!lat.ok || !lng.ok) return undefined
  return {
    lat: lat.value,
    lng: lng.value,
    source: form.incidentCoordinateSource === 'geocoded' ? 'geocoded' : 'manual',
  }
}

/** The editable half of a case: everything `caseFormToInput` produces except the number. */
export function caseFormToEdits(form: NewCaseFields): CaseEdits {
  return {
    displayName: form.displayName.trim(),
    unit: form.unit.trim(),
    oicName: form.oicName.trim(),
    oicBadge: form.oicBadge.trim(),
    vcName: form.vcName.trim(),
    vcBadge: form.vcBadge.trim(),
    incidentBusinessName: form.incidentBusinessName.trim(),
    incidentStreetAddress: form.incidentStreetAddress.trim(),
    incidentCity: form.incidentCity.trim(),
    incidentCoordinates: toIncidentCoordinates(form),
    notes: form.notes.trim(),
  }
}

/** The create payload: the editable half plus the (trimmed) case number. Trimming every
 *  string mirrors the phone's `handleSubmit` (`NewCaseModal.tsx:212-224`). */
export function caseFormToInput(form: NewCaseFields): NewCaseInput {
  return { caseNumber: form.caseNumber.trim(), ...caseFormToEdits(form) }
}
