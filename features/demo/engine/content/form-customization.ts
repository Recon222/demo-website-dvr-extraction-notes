import type {
  FormFieldDef,
  FormFieldId,
  FormStepClassification,
  FormStepDef,
  FormStepId,
  LinearFormStepDef,
} from '@/features/demo/engine/types'
import { ADDITIVE_FORM_STEP_IDS } from '@/features/demo/engine/types'
import { DRAWER_DEFS } from '@/features/demo/engine/content/screens'

/**
 * Form-customization registries — the step and field inventory the Settings "Form Fields" pane
 * switches, and the capability invariants that decide what it may NOT switch (P7.3, matrix A2,
 * decision D9). Ported from the phone's `src/features/form-customization/config/*`.
 *
 * ## Ordering is derived, never hand-typed
 *
 * The 10 linear rows ARE `DRAWER_DEFS` — same ids, same labels, same order — so the pane, the
 * drawer and the wizard's Next/Back spine cannot disagree about what the flow is. `order` is
 * array position; the two additive tools sort after everything linear (the phone's 101/102
 * convention, `config/wizard-steps.ts:114,122`).
 *
 * ## The invariants are COMPUTED, never authored
 *
 * `ALWAYS_ON_FIELDS` is the set `engine/logic/final-submission.ts` can reject a completion for,
 * plus the address components those messages are composed from, plus the two Time Offset
 * calibration inputs. `isStepMustStay` then falls out of it — a screen hosting a mandatory field
 * cannot be hidden. That derivation is what makes a "locked + off" (required-but-hidden) state
 * unreachable rather than merely unlikely, and it is why the pane can render a lock without
 * consulting anything else.
 */

// ---- Steps -------------------------------------------------------------------

/**
 * Which rows expand into per-field toggles. TOTAL over `FormStepId` on purpose: a step added to
 * either id space stops compiling here until someone decides how its row behaves.
 *
 * The three `screen-only` linear steps are the phone's (`config/wizard-steps.ts:56,64,98`) and
 * for the phone's reasons: Time Offset's inputs are all mandatory, Extracted Video Scope is
 * generated from the offset, and Notes is assembled from everything else. The two tools are
 * screen-only because they have no form at all.
 */
const STEP_CLASSIFICATION: Record<FormStepId, FormStepClassification> = {
  submission: 'field-capable',
  requestedScope: 'field-capable',
  arrivalDeparture: 'field-capable',
  timeOffset: 'screen-only',
  extractedScope: 'screen-only',
  dvrInfo: 'field-capable',
  cameras: 'field-capable',
  exportInfo: 'field-capable',
  notes: 'screen-only',
  completion: 'field-capable',
  mediaCapture: 'screen-only',
  audioRecording: 'screen-only',
}

/** The accordion rows' visible text (`ui/controls/WizardDrawer.tsx:325-326`, itself the phone's
 *  `'Capture Media'` / `'Record Audio'`). Pinned against the drawer + explore labels by test —
 *  the row defs themselves carry JSX, so they cannot live in the engine. */
const ADDITIVE_STEP_LABELS: Record<(typeof ADDITIVE_FORM_STEP_IDS)[number], string> = {
  mediaCapture: 'Capture Media',
  audioRecording: 'Record Audio',
}

/** The 10 linear wizard steps, in flow order. Typed `LinearFormStepDef` so their ids carry the
 *  `WizardScreenId` narrowing all the way to the router (R-22). */
export const LINEAR_FORM_STEPS: readonly LinearFormStepDef[] = DRAWER_DEFS.map((d, i) => ({
  id: d.id,
  label: d.label,
  order: i + 1,
  classification: STEP_CLASSIFICATION[d.id],
}))

/** The 2 drawer-accordion tools — never Next/Back targets. */
export const ADDITIVE_FORM_STEPS: readonly FormStepDef[] = ADDITIVE_FORM_STEP_IDS.map((id, i) => ({
  id,
  label: ADDITIVE_STEP_LABELS[id],
  order: 101 + i,
  classification: STEP_CLASSIFICATION[id],
  additive: true,
}))

/** Every switchable step: the 10 linear rows then the 2 tools. */
export const FORM_STEPS: readonly FormStepDef[] = [...LINEAR_FORM_STEPS, ...ADDITIVE_FORM_STEPS]

/**
 * Lookup by id — `undefined` when nothing matches.
 *
 * The parameter is `string`, not `FormStepId` (review R-27). The union signature made the
 * function's own return type unreachable for a typed caller AND forbade the exact call the id
 * guards have to make — `isKnownFormStep` was casting a `string` INTO the union to ask whether
 * it belonged there. A lookup that can answer "no" must accept an id that might be wrong.
 */
export function getFormStep(id: string): FormStepDef | undefined {
  return FORM_STEPS.find((s) => s.id === id)
}

// ---- Fields ------------------------------------------------------------------

const GPS_SUBMISSION = 'gps:submission'
const GPS_CAMERA = 'gps:camera'

/**
 * The full field inventory. Ids and labels are the phone's verbatim
 * (`config/field-registry.ts:19-97`); `screen` and `storeKey` are the demo's.
 *
 * Two storeKey divergences worth naming, both real shape differences rather than typos:
 * `arrival.*` writes `arrival`/`departure` (the demo's `ArrivalDeparture` members) where the
 * phone writes `arrivalDateTime`/`departureDateTime`, and every coordinate field writes into the
 * nested `gps` object rather than four flat columns.
 *
 * TWO ids carry no storeKey, and both are stated facts rather than omissions (pinned by test):
 * `submission.address` is composed by `formatAddress` from the three components above it, and
 * `dvr.daysUntilOverwritten` is the per-scope countdown the demo derives at render time (matrix
 * row 41 — DEMO-BETTER). Their toggles gate a RENDERED block, never a stored value.
 */
export const FORM_FIELDS: readonly FormFieldDef[] = [
  // ===== submission =====
  // The one field on this screen owned by the CASE, not the location — the screen renders it
  // read-only from `DemoCase.caseNumber`, same as the phone renders it from the case record.
  { id: 'submission.occNumber', screen: 'submission', label: 'Case Number', storeKey: 'caseNumber' },
  { id: 'submission.requesterName', screen: 'submission', label: 'Requester Name', storeKey: 'requesterName' },
  { id: 'submission.requesterBadgeNumber', screen: 'submission', label: 'Requester Badge', storeKey: 'requesterBadge' },
  { id: 'submission.requesterUnit', screen: 'submission', label: 'Requester Unit', storeKey: 'requesterUnit' },
  { id: 'submission.requesterPhone', screen: 'submission', label: 'Requester Phone', storeKey: 'requesterPhone' },
  { id: 'submission.requesterEmail', screen: 'submission', label: 'Requester Email', storeKey: 'requesterEmail' },
  { id: 'submission.businessName', screen: 'submission', label: 'Business Name', storeKey: 'businessName' },
  { id: 'submission.streetAddress', screen: 'submission', label: 'Street Address', storeKey: 'streetAddress' },
  { id: 'submission.city', screen: 'submission', label: 'City', storeKey: 'city' },
  // Derived from the three above by `formatAddress` — no input and no stored key on either side.
  { id: 'submission.address', screen: 'submission', label: 'Formatted Address (derived)' },
  { id: 'submission.latitude', screen: 'submission', label: 'GPS Latitude', storeKey: 'gps.lat', group: GPS_SUBMISSION },
  { id: 'submission.longitude', screen: 'submission', label: 'GPS Longitude', storeKey: 'gps.lng', group: GPS_SUBMISSION },
  { id: 'submission.coordinateAccuracy', screen: 'submission', label: 'GPS Accuracy', storeKey: 'gps.accuracyM', group: GPS_SUBMISSION },
  { id: 'submission.coordinateSource', screen: 'submission', label: 'Coordinate Source', storeKey: 'gps.source', group: GPS_SUBMISSION },
  { id: 'submission.locationContact', screen: 'submission', label: 'Contact Person', storeKey: 'locationContact' },
  { id: 'submission.locationPhone', screen: 'submission', label: 'Contact Phone', storeKey: 'locationPhone' },

  // ===== requestedScope (array: scopes) =====
  { id: 'scope.startDateTime', screen: 'requestedScope', label: 'Start Date/Time', storeKey: 'startDateTime' },
  { id: 'scope.endDateTime', screen: 'requestedScope', label: 'End Date/Time', storeKey: 'endDateTime' },
  { id: 'scope.isActualTime', screen: 'requestedScope', label: 'Time Entry Type', storeKey: 'isActualTime' },
  { id: 'scope.cameras', screen: 'requestedScope', label: 'Cameras', storeKey: 'cameras' },

  // ===== arrivalDeparture (array: arrivalDepartures) =====
  { id: 'arrival.arrivalDateTime', screen: 'arrivalDeparture', label: 'Arrival Date/Time', storeKey: 'arrival' },
  { id: 'arrival.departureDateTime', screen: 'arrivalDeparture', label: 'Departure Date/Time', storeKey: 'departure' },

  // ===== timeOffset =====
  { id: 'timeoffset.dvrDateTime', screen: 'timeOffset', label: 'DVR Date/Time', storeKey: 'dvrDateTime' },
  { id: 'timeoffset.actualDateTime', screen: 'timeOffset', label: 'Actual Date/Time', storeKey: 'actualDateTime' },
  { id: 'timeoffset.dvrAppliesDST', screen: 'timeOffset', label: 'DVR Applies DST', storeKey: 'dvrAppliesDST' },

  // ===== extractedScope (array: extractedScopes) =====
  { id: 'extracted.startDateTime', screen: 'extractedScope', label: 'Start Date/Time', storeKey: 'startDateTime' },
  { id: 'extracted.endDateTime', screen: 'extractedScope', label: 'End Date/Time', storeKey: 'endDateTime' },
  { id: 'extracted.cameras', screen: 'extractedScope', label: 'Cameras', storeKey: 'cameras' },

  // ===== dvrInfo =====
  { id: 'dvr.dvrLocation', screen: 'dvrInfo', label: 'DVR Location', storeKey: 'dvrLocation' },
  { id: 'dvr.dvrTypeBrand', screen: 'dvrInfo', label: 'DVR Type/Brand', storeKey: 'dvrTypeBrand' },
  { id: 'dvr.serialModelNumber', screen: 'dvrInfo', label: 'Serial/Model Number', storeKey: 'serialModelNumber' },
  { id: 'dvr.dvrUsername', screen: 'dvrInfo', label: 'DVR Username', storeKey: 'dvrUsername' },
  { id: 'dvr.dvrPassword', screen: 'dvrInfo', label: 'DVR Password', storeKey: 'dvrPassword' },
  { id: 'dvr.numberOfChannels', screen: 'dvrInfo', label: 'Number of Channels', storeKey: 'numberOfChannels' },
  { id: 'dvr.activeCameras', screen: 'dvrInfo', label: 'Active Cameras', storeKey: 'activeCameras' },
  { id: 'dvr.recordingSchedule', screen: 'dvrInfo', label: 'Recording Schedule', storeKey: 'recordingSchedule' },
  { id: 'dvr.resolution', screen: 'dvrInfo', label: 'Resolution', storeKey: 'resolution' },
  { id: 'dvr.recordingFps', screen: 'dvrInfo', label: 'Recording FPS', storeKey: 'recordingFps' },
  { id: 'dvr.firstRecordedDate', screen: 'dvrInfo', label: 'First Recorded Date', storeKey: 'firstRecordedDate' },
  { id: 'dvr.totalDvrRetention', screen: 'dvrInfo', label: 'Total DVR Retention (computed)', storeKey: 'totalDvrRetention' },
  { id: 'dvr.daysUntilOverwritten', screen: 'dvrInfo', label: 'Days Until Overwritten (computed)' },

  // ===== cameras (array: cameras) =====
  { id: 'camera.cameraName', screen: 'cameras', label: 'Camera Name/Number', storeKey: 'cameraName' },
  { id: 'camera.resolution', screen: 'cameras', label: 'Resolution', storeKey: 'resolution' },
  { id: 'camera.recordingFps', screen: 'cameras', label: 'Recording FPS', storeKey: 'recordingFps' },
  { id: 'camera.latitude', screen: 'cameras', label: 'GPS Latitude', storeKey: 'gps.lat', group: GPS_CAMERA },
  { id: 'camera.longitude', screen: 'cameras', label: 'GPS Longitude', storeKey: 'gps.lng', group: GPS_CAMERA },
  { id: 'camera.coordinateAccuracy', screen: 'cameras', label: 'GPS Accuracy', storeKey: 'gps.accuracyM', group: GPS_CAMERA },
  { id: 'camera.coordinateSource', screen: 'cameras', label: 'Coordinate Source', storeKey: 'gps.source', group: GPS_CAMERA },
  { id: 'camera.coordinateCapturedAt', screen: 'cameras', label: 'GPS Captured At', storeKey: 'gps.capturedAt', group: GPS_CAMERA },

  // ===== exportInfo =====
  { id: 'export.exportMedia', screen: 'exportInfo', label: 'Export Media', storeKey: 'exportMedia' },
  { id: 'export.fileType', screen: 'exportInfo', label: 'File Type', storeKey: 'fileType' },
  { id: 'export.sizeGb', screen: 'exportInfo', label: 'Size (GB)', storeKey: 'sizeGb' },
  { id: 'export.mediaPlayerIncluded', screen: 'exportInfo', label: 'Media Player Included', storeKey: 'mediaPlayerIncluded' },
  { id: 'export.mediaProvidedVia', screen: 'exportInfo', label: 'Media Provided Via', storeKey: 'mediaProvidedVia' },

  // ===== notes =====
  { id: 'notes.notesSections', screen: 'notes', label: 'Auto-generated Notes Sections', storeKey: 'notesSections' },
  { id: 'notes.notesFreeText', screen: 'notes', label: 'Free Text (notes tail)', storeKey: 'notesFreeText' },

  // ===== completion =====
  { id: 'completion.dateTimeCompleted', screen: 'completion', label: 'Date and Time Completed', storeKey: 'dateTimeCompleted' },
  { id: 'completion.completedBy', screen: 'completion', label: 'Completed By', storeKey: 'completedBy' },
]

/** Lookup by id — `undefined` when nothing matches. `string` for the same reason as
 *  `getFormStep` above (R-27): the unknown-id guards are real callers. */
export function getFormField(id: string): FormFieldDef | undefined {
  return FORM_FIELDS.find((f) => f.id === id)
}

/** Every field that toggles together with `id` — the field alone when it has no group, and an
 *  empty list for an id the registry does not know (pinned by test). */
export function getFieldGroupMembers(id: string): FormFieldDef[] {
  const field = getFormField(id)
  if (!field) return []
  if (!field.group) return [field]
  return FORM_FIELDS.filter((f) => f.group === field.group)
}

/** The fields hosted by one step, in registry order. */
export function getStepFields(id: FormStepId): FormFieldDef[] {
  return FORM_FIELDS.filter((f) => f.screen === id)
}

/**
 * The fields that actually reach a SWITCH in the Form Fields grid — every registry field whose
 * host step is `field-capable`. The screen-only steps (Time Offset, Extracted Scope, Notes)
 * contribute a note instead of toggles, on the phone too, so their fields are in `FORM_FIELDS`
 * but never rendered as a row.
 *
 * Exported (R-5) because the number was being re-derived in two places and hand-typed in a
 * third: `FormFieldsPane.test.tsx` filtered for it inline, and the Settings rail narration
 * carried a literal "57" that was an estimate made before this registry existed (§82a). Copy
 * that quotes a registry count must READ the registry — a number typed into prose is a claim
 * with no gate on it, which is exactly how "57" outlived the thing it described.
 */
export const SWITCHABLE_FORM_FIELDS: readonly FormFieldDef[] = FORM_FIELDS.filter(
  (f) => FORM_STEPS.find((s) => s.id === f.screen)?.classification === 'field-capable',
)

// ---- Capability invariants ---------------------------------------------------

/**
 * Mandatory fields — forced visible under every profile and every override.
 *
 * Derived from what can BLOCK a completion (`engine/logic/final-submission.ts:27-29`: OCC
 * number, address, and at least one scope with both times), widened to the three address
 * components the derived address is composed from, plus the two Time Offset calibration inputs
 * the whole offset feature is built on. Pinned against `final-submission` by test — if that
 * validator grows a rule, the new required field must join this set or the pane would offer to
 * hide a field the visitor can then be blocked on with no way back.
 */
export const ALWAYS_ON_FIELDS: ReadonlySet<FormFieldId> = new Set<FormFieldId>([
  'submission.occNumber',
  'submission.address',
  'submission.businessName',
  'submission.streetAddress',
  'submission.city',
  'scope.startDateTime',
  'scope.endDateTime',
  'timeoffset.dvrDateTime',
  'timeoffset.actualDateTime',
])

/** The terminal step — the review/export screen, always reachable. */
const TERMINAL_STEP: FormStepId = 'completion'

export function isFieldAlwaysOn(id: FormFieldId): boolean {
  return ALWAYS_ON_FIELDS.has(id)
}

/** A step is must-stay iff it is terminal or it hosts an always-on field. */
export function isStepMustStay(id: FormStepId): boolean {
  if (id === TERMINAL_STEP) return true
  return FORM_FIELDS.some((f) => f.screen === id && ALWAYS_ON_FIELDS.has(f.id))
}
