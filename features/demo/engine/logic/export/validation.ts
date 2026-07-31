/**
 * Pre-export PDF validation (parity P5.1, matrix row 25) — the phone's
 * `validateLocationForPdf` and its two aggregates, ported from
 * `src/features/case-management/services/pdf-export-service.ts:105-235` and `:1441-1458`.
 *
 * WHAT IT ANSWERS: "will this location's Case Notes PDF be worth generating?" — not "is this
 * location finished". A location that fails still exports; it just ships without PDF notes,
 * which is exactly what the validation modal tells the visitor before they commit (see
 * `describeValidationPrompt` in ./flow).
 *
 * THE ERROR STRINGS ARE FIELD NAMES, NOT SENTENCES (phone `pdf-export.types.ts:42`): the modal
 * renders them as "- Missing: {error}", so "Case number" is correct and "Case number is
 * required" would read as "- Missing: Case number is required". Lifted verbatim.
 *
 * Synchronous, unlike the phone's `async` pair: the phone's are async only because they fetch
 * the case from SQLite first (`getCaseWithLocations`). The demo holds everything in the
 * session store, so the caller passes the rows in and there is nothing to await. Faking a
 * Promise here would add a render gap the demo does not have, and the flow machine in ./flow
 * is written against the synchronous shape.
 */

/**
 * The four field names a failing location reports (phone `pdf-export-service.ts:127-149`).
 * Exported so a test — or the validation modal — can assert against the same strings the
 * validator emits rather than a re-typed copy.
 */
export const PDF_VALIDATION_FIELDS = Object.freeze({
  caseNumber: 'Case number',
  scope: 'At least one extraction scope with start and end times',
  completionDate: 'Completion date',
  completedBy: 'Completed by',
} as const)

/** Result of validating ONE location (phone `LocationPdfValidation`, `pdf-export.types.ts:37-44`).
 *
 *  The phone's fifth member, `directoryName`, is deliberately absent: it names the folder the
 *  location gets inside the ZIP, and the demo has no filesystem to name folders in. Nothing in
 *  the validation modal reads it (`ExportModal.tsx:204-216` renders `locationName` + `errors`). */
export interface LocationPdfValidation {
  locationId: string
  locationName: string
  valid: boolean
  /** Human-readable FIELD NAMES (see the module note), in the phone's evaluation order. */
  errors: string[]
}

/** Aggregate over the locations being exported (phone `CasePdfValidationResult`,
 *  `pdf-export.types.ts:49-58`).
 *
 *  `totalLocations` is K-SCOPED for a subset result — it counts the rows handed in, not the
 *  case (phone `pdf-export-service.ts:1444-1447`). The operator-facing N never comes from
 *  here; it comes from the selection (`ExportSelectionPlan.totalInCase`). */
export interface CasePdfValidationResult {
  caseId: string
  caseNumber: string
  validLocations: LocationPdfValidation[]
  invalidLocations: LocationPdfValidation[]
  allValid: boolean
  totalLocations: number
  validCount: number
  invalidCount: number
}

/**
 * The demo's analog of the phone's `CaseValidationError` (`case-management/utils/errors.ts`),
 * thrown by `validateLocationSubsetForPdf` on an empty or foreign selection.
 *
 * FAIL-LOUD BY DESIGN (phone `pdf-export-service.ts:1402-1409`): "a selected location silently
 * missing from an evidence package is this feature's worst failure mode". The demo keeps the
 * throw even though its own selection is pruned every render — the prune is a different
 * mechanism in a different file, and a validator that quietly drops what it was handed would
 * make a future gap in that mechanism invisible.
 */
export class CaseValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CaseValidationError'
  }
}

/** The shape the validator reads off a location. `DemoLocation` satisfies it structurally. */
export interface ValidatableLocation {
  id: string
  locationName: string
  form: {
    scopes: readonly { startDateTime: string; endDateTime: string }[]
    dateTimeCompleted: string
    completedBy: string
  }
}

/** The shape the validator reads off a case. `DemoCase` satisfies it structurally. */
export interface ValidatableCase {
  id: string
  caseNumber: string
}

/**
 * Validates one location against the four PDF requirements (phone
 * `pdf-export-service.ts:90-161`):
 *
 * 1. Case number exists (from the CASE, not the location)
 * 2. At least one scope with start AND end times
 * 3. Completion date exists
 * 4. Completed by exists
 *
 * Cameras are NOT required — the phone says so explicitly (`:99`) and the demo must not
 * quietly add a fifth rule the phone would pass.
 *
 * The phone's corrupted-`formData` guard (`:113-122`, which returns the single error "Location
 * data is corrupted or missing") is NOT ported: it exists because the phone rehydrates
 * `formData` from a SQLite JSON blob that can be `null` or a non-object. The demo's
 * `LocationForm` is total by type, and the sessionStorage snapshot is shape-guarded by Zod
 * before it ever reaches the store, so there is no path that can produce the state the guard
 * catches. See deferred.md §70.
 */
export function validateLocationForPdf(
  location: ValidatableLocation,
  caseNumber: string,
): LocationPdfValidation {
  const errors: string[] = []
  const form = location.form

  if (!caseNumber || caseNumber.trim() === '') {
    errors.push(PDF_VALIDATION_FIELDS.caseNumber)
  }

  const hasValidScope = form.scopes.some(
    (scope) => scope.startDateTime.trim() !== '' && scope.endDateTime.trim() !== '',
  )
  if (!hasValidScope) {
    errors.push(PDF_VALIDATION_FIELDS.scope)
  }

  if (form.dateTimeCompleted.trim() === '') {
    errors.push(PDF_VALIDATION_FIELDS.completionDate)
  }

  if (form.completedBy.trim() === '') {
    errors.push(PDF_VALIDATION_FIELDS.completedBy)
  }

  return {
    locationId: location.id,
    locationName: location.locationName,
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates every location handed in (phone `validateLocationsForPdfInternal`,
 * `pdf-export-service.ts:171-210`). Order is preserved in both buckets — the modal lists
 * invalid locations in the order they appear on the card.
 *
 * A case with NO locations returns `allValid: true` with zero counts, exactly as the phone's
 * loop does. The Export tab can never dispatch that selection (a location-less case is a no-op
 * at the checkbox — see `toggleCaseSelection`), so this is the shape of a question that was
 * never really asked, not a claim that an empty case is exportable.
 */
export function validateLocationsForPdf(
  caseData: ValidatableCase,
  locations: readonly ValidatableLocation[],
): CasePdfValidationResult {
  const validLocations: LocationPdfValidation[] = []
  const invalidLocations: LocationPdfValidation[] = []

  for (const location of locations) {
    const validation = validateLocationForPdf(location, caseData.caseNumber)
    if (validation.valid) {
      validLocations.push(validation)
    } else {
      invalidLocations.push(validation)
    }
  }

  return {
    caseId: caseData.id,
    caseNumber: caseData.caseNumber,
    validLocations,
    invalidLocations,
    allValid: invalidLocations.length === 0,
    totalLocations: locations.length,
    validCount: validLocations.length,
    invalidCount: invalidLocations.length,
  }
}

/**
 * Validates the SELECTED locations of a case (phone `validateLocationSubsetForPdf`,
 * `pdf-export-service.ts:1451-1458` over `fetchSubsetLocations`, `:1410-1439`).
 *
 * Fail-loud on an empty selection or ANY id the case does not own — both throw
 * `CaseValidationError` on the phone, and the messages are lifted verbatim. Selection order is
 * ignored: the subset is taken in the case's own location order, like the phone's
 * `caseData.locations.filter(...)`.
 */
export function validateLocationSubsetForPdf(
  caseData: ValidatableCase,
  locations: readonly ValidatableLocation[],
  locationIds: readonly string[],
): CasePdfValidationResult {
  if (locationIds.length === 0) {
    throw new CaseValidationError('No locations selected for subset export')
  }

  const known = new Set(locations.map((location) => location.id))
  const missing = locationIds.filter((id) => !known.has(id))
  if (missing.length > 0) {
    throw new CaseValidationError(`Selected locations not found in case: ${missing.join(', ')}`)
  }

  const selectedIds = new Set(locationIds)
  const selected = locations.filter((location) => selectedIds.has(location.id))

  return validateLocationsForPdf(caseData, selected)
}
