/**
 * Domain types for the interactive demo engine. These describe the in-memory state
 * the demo holds — there is no backend; everything is per-session. Simplified from the
 * real app's SQLite model, keeping only what the demo renders.
 *
 * Closed string unions are declared as `as const` tuples with the TYPE derived from the
 * tuple (R-4a): the persistence shape guard consumes the same tuples via `z.enum(...)`, so
 * a schema narrower than its domain union is structurally impossible — adding a variant
 * updates the type and the guard in one edit.
 *
 * See docs/features/interactive-demo/01-interactive-demo-architecture.md §4.
 */

// ---- Profiles ---------------------------------------------------------------
/** The phone's three deployment profiles (`src/features/form-customization/types:15-17`).
 *  `limited` joined the union with P7.3 — the demo previously modelled only the two the old
 *  `getProfile` switch knew about. Persisted via `z.enum(PROFILES)`, so widening this tuple is
 *  a persisted-shape change: it rode the SNAPSHOT_VERSION 6→7 bump. */
export const PROFILES = ['forensic', 'limited', 'canvas'] as const
export type Profile = (typeof PROFILES)[number]

// ---- The analyst's own profile ----------------------------------------------
/**
 * Who the analyst IS — the demo's port of the phone's `UserProfile`
 * (`src/features/settings/user-profile/types.ts:11-28`, P7.2, matrix row 86).
 *
 * NOT to be confused with `Profile` above: that one is the FORM profile (which wizard screens
 * and fields are shown); this one is the person filling them in. The phone keeps them in
 * separate stores for the same reason.
 *
 * All seven fields are strings with empty-string defaults (`DEFAULT_USER_PROFILE`), and the two
 * `*Start` fields hold the demo's canonical `'YYYY-MM-DD HH:MM:SS'` wall-clock string (the phone
 * stores an ISO date there) which `computeCareerDuration` renders as `"12 years, 3 months"`.
 *
 * **`name` is the only field with a consumer today**: it autofills Completion's `completedBy`,
 * which is what carries it into the Case Notes PDF header. The other six are groundwork for the
 * will-say document — kept whole, typed, persisted and exported from this barrel so that feature
 * inherits a real profile rather than re-deriving one.
 *
 * **The phone's eighth field, `agencyLogoUri`, is deliberately absent** (matrix row 86: it
 * "exists on the type as `[Future]`, has no UI, and must not be built"). On the phone it is a
 * declared-but-unimplemented member that is never written and never read; modelling it here would
 * add a key to the snapshot shape guard, the defaults and the save transform to guard an absence
 * — the same three-dead-things argument that kept `devOnly` off `SettingsCategory` (deferred
 * §80a). Adding it later is a v-bump and three lines.
 */
export interface UserProfile {
  /** Analyst's full name — autofills "Completed By" on the Completion screen. */
  name: string
  /** Badge / ID number. */
  badgeNumber: string
  /** When the analyst started in the forensic-video / investigative field. [Will Say] */
  timeInFieldStart: string
  /** When the analyst started at their current agency. [Will Say] */
  timeAtAgencyStart: string
  /** Current employer / police service. [Will Say] */
  currentAgency: string
  /** Unit / section name (e.g. "Forensic Video Unit"). [Will Say] */
  unitName: string
  /** Free-form qualifications, education, certifications. [Will Say] */
  qualifications: string
}

// ---- Screen identifiers -----------------------------------------------------
/** The 10 in-drawer wizard screens, in Next/Back order. */
export type WizardScreenId =
  | 'submission'
  | 'requestedScope'
  | 'arrivalDeparture'
  | 'timeOffset'
  | 'extractedScope'
  | 'dvrInfo'
  | 'cameras'
  | 'exportInfo'
  | 'notes'
  | 'completion'

/** App chapters shown before the wizard, plus the wizard screens themselves. */
export type ChapterId = 'splash' | 'dashboard' | 'cases' | WizardScreenId

/** Launch-only screens — opened by an action button, NEVER in Next/Back. */
export type LaunchableId = 'ocr' | 'mediaCapture' | 'audioRecording'

/** Overlay modals. */
export type ModalId =
  | 'newCase'
  | 'newLocation'
  | 'import'
  | 'mediaLibrary'
  /** The map's incident-location editor (P3.6 — phone `EditIncidentLocationModal`). */
  | 'editIncident'
  /** The location action chooser (P3.5 — phone `DuplicateLocationModal`). */
  | 'duplicateLocation'
  /** The chooser's "New Location w/ Sub Info [+ Scopes]" card: the create-location modal in
   *  its require-address variant, pre-filled from the source location. A second modal id
   *  rather than a flag on `newLocation` — the two mounts have different narration, different
   *  submit semantics, and the phone likewise mounts a second instance. */
  | 'newAddressLocation'
  /** The ZIP scope chooser reached from Completion's "Export Zip" (P5.3 — phone
   *  `ExportActionSheet`, whose only call site is `completion.tsx:610-617`). A modal id and
   *  not flow state: it is opened and closed by a gesture, unlike the progress/validation
   *  overlay, whose visibility is DERIVED from the export machine (`resolveExportModalMode`)
   *  exactly as on the phone. */
  | 'exportScope'
  /** The Settings sheet (P7.1 — phone `SettingsModal`), opened by the gear on the Home and
   *  Cases headers. ONE id for the whole master/detail surface: which pane is open is local
   *  state inside the sheet on both sides (phone `SettingsModal.tsx:53`), and it dies with the
   *  sheet, so it is neither a modal id nor a snapshot field. */
  | 'settings'

/** The two flavours every duplicate action carries (phone `DuplicateMode`,
 *  `duplicate-location-service.ts:23`): submission info alone, or submission info plus a
 *  clone of the requested scopes. A plain union like the other id unions above — it is
 *  transient UI intent, never persisted, so the `as const` tuple device (which exists to
 *  share a closed union with the snapshot shape guard) would buy nothing. */
export type DuplicateMode = 'submission-only' | 'with-scopes'

// ---- Content / form value types --------------------------------------------
export interface ScopeEntry {
  id: string
  startDateTime: string
  endDateTime: string
  /** true = wall-clock/real time; false = DVR time. Drives the offset math. */
  isActualTime: boolean
  cameras: string
}

export interface ArrivalDeparture {
  id: string
  arrival: string
  departure: string
}

export const SYNC_METHODS = ['NTP', 'HTTP'] as const

export interface SyncResult {
  method: (typeof SYNC_METHODS)[number]
  server: string
  offsetMs: number
  uncertaintyMs: number
  rttMs?: number
  traceability?: string
  /** Unix ms when the sync completed — drives the card's "Calibrated at" row. */
  timestamp?: number
  /** Responding server stratum (1–15) — encoded in the traceability chain. */
  stratum?: number
}

export interface OcrProof {
  rawText: string
  cleanedText: string
  parsedDateTime: string
  confidence: number
  imageDataUrl?: string
}

export const OFFSET_DIRECTIONS = ['AHEAD OF', 'BEHIND'] as const
export const CAPTURE_METHODS = ['manual', 'ocr'] as const
export type CaptureMethod = (typeof CAPTURE_METHODS)[number]

export interface TimeOffsetData {
  dvrDateTime: string
  actualDateTime: string
  differenceMs: number
  formattedDifference: string
  direction: (typeof OFFSET_DIRECTIONS)[number]
  isDvrAhead: boolean
  isCorrect: boolean
  dvrAppliesDST: boolean
  /** NTP calibration metadata (simulated in the demo); null = manual, unverified. */
  sync: SyncResult | null
  captureMethod: CaptureMethod
  ocr?: OcrProof
}

/**
 * A coordinate pair with the accuracy achieved when it was obtained, in metres.
 *
 * `accuracyM` is OPTIONAL because not every source measures one — exactly as on the phone,
 * where `coordinateAccuracy?: number` (LocationForm.tsx:34, CoordinateDisplay.tsx:25) and the
 * accuracy/rating chip renders only when it is defined (CoordinateDisplay.tsx:138-166). A GPS
 * capture always carries a measured radius; a geocoded pick carries 5 m only when Mapbox
 * reports a rooftop match (phone mapbox-service.ts:246-247) and nothing otherwise. Filling a
 * placeholder `0` here would render as "±0m · Excellent" — fabricated precision on a
 * coordinate nobody measured.
 */
export interface GpsCoordinates {
  lat: number
  lng: number
  accuracyM?: number
}

/**
 * A per-camera coordinate (P3.7, matrix row 42) — the demo's nested form of the phone's five
 * flat camera keys `latitude` / `longitude` / `coordinateAccuracy` / `coordinateSource` /
 * `coordinateCapturedAt` (`src/features/location/camera-gps/types.ts:13-19`).
 *
 * Two members the recovery-location fix does NOT carry, both required here because the phone
 * writes all five keys in one shot (`mapGpsLocationToCameraData`, camera-gps/types.ts:47-55):
 *
 * - `source` is the LITERAL `'gps'`, not `GpsSource`. A recovery location can be geocoded from
 *   its address or entered by hand; a camera has exactly one coordinate path — the crosshair
 *   button — so "captured by GPS" is the only representable provenance, exactly as the phone
 *   types it (`coordinateSource: 'gps'`, camera-gps/types.ts:17,36). Written as
 *   `Extract<GpsSource, 'gps'>` rather than a bare `'gps'` so it stays LINKED to the canonical
 *   union (R-24/R-25 discipline): if `GPS_SOURCES` ever loses that member this resolves to
 *   `never` and every producer stops compiling, instead of silently stamping a dead provenance
 *   the chip can no longer label.
 * - `capturedAt` is ISO-8601 UTC taken from the winning READING's own platform timestamp
 *   (`GpsFix.capturedAtIso`), never an ambient clock read — the phone does the same
 *   (`new Date(bestSample.timestamp).toISOString()`, gps-service.ts:301). A forensic capture
 *   time must be when the satellite fix was taken, not when the app got round to storing it.
 */
export interface CameraGpsFix extends GpsCoordinates {
  source: Extract<GpsSource, 'gps'>
  capturedAt: string
}

export interface CameraEntry {
  id: string
  cameraName: string
  resolution: string
  recordingFps: string
  gps?: CameraGpsFix
}

export interface DvrInformation {
  dvrLocation: string
  dvrTypeBrand: string
  serialModelNumber: string
  dvrUsername: string
  dvrPassword: string
  numberOfChannels: string
  activeCameras: string
  recordingSchedule: string
  resolution: string
  recordingFps: string
  /** Earliest date the DVR has on disk. Drives the derived retention (see logic/retention). */
  firstRecordedDate: string
  /** Derived: total retention window, written back as "N days" for the PDF/notes. */
  totalDvrRetention: string
}

export interface ExportInformation {
  exportMedia: string
  fileType: string
  sizeGb: string
  mediaPlayerIncluded: boolean
  mediaProvidedVia: string
}

// ---- Notes sections (P2.1 — phone notes-generator port) ---------------------
/**
 * The seven registry-ordered notes sections, in display order (phone parity:
 * `src/features/documentation/notes/services/section-registry.ts`). Declared as an
 * `as const` tuple so the persistence shape guard consumes the same value via
 * `z.enum(NOTE_SECTION_IDS)` (snapshot-guard device 3 / R-4a) — the union and the
 * schema enum cannot drift apart. Display order itself is owned by
 * `engine/logic/notes/section-registry.ts` (which is pinned to cover this union
 * exhaustively at compile time).
 */
export const NOTE_SECTION_IDS = [
  'address',
  'timeOffset',
  'scopes',
  'retention',
  'cameras',
  'export',
  'timeOnScene',
] as const
export type NoteSectionId = (typeof NOTE_SECTION_IDS)[number]

/**
 * A single section of the structured notes (output-comparison model, ported from the
 * phone's `notes/types.ts`). Section state is DERIVED, never stored, from these fields
 * plus the current formatter output:
 *
 * | State           | Predicate                                              |
 * |-----------------|--------------------------------------------------------|
 * | Auto            | `!manuallyEdited`                                      |
 * | Auto + addendum | `!manuallyEdited && userAddendum`                      |
 * | Edited          | `manuallyEdited && (fresh === '' || fresh === generatedContent)` |
 * | Edited + stale  | `manuallyEdited && fresh !== '' && fresh !== generatedContent`   |
 * | Deleted         | `manuallyEdited && content === ''`                     |
 * | Empty (no data) | `!manuallyEdited && content === ''`                    |
 */
export interface NoteSection {
  id: NoteSectionId
  /** Displayed/exported primary text: formatter output, or the user's replacement. */
  content: string
  /**
   * What the formatter produced the last time it was APPLIED to content. For un-edited
   * sections this always equals content; for edited sections it is frozen at the
   * generation the user overwrote — the staleness baseline.
   */
  generatedContent: string
  /**
   * Optional user annotation rendered after content within the same block.
   * Survives regeneration and reset. Never merged into content.
   */
  userAddendum?: string
  /** True only when the user has REPLACED the generated text (or deleted it). */
  manuallyEdited: boolean
}

export const MEDIA_KINDS = ['photo', 'video', 'audio'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]

export interface MediaItem {
  id: string
  kind: MediaKind
  /**
   * Where the bytes are. OPTIONAL (P4.1): a live capture is a `blob:` object URL scoped to
   * the document that minted it, and the demo deliberately does NOT persist media bytes
   * (plan §5 P4.1 / decision D2), so `snapshotOf` strips those URLs on the way to
   * sessionStorage. An item restored from a snapshot therefore has no `url` and renders
   * `MEDIA_EXPIRED_NOTICE` rather than a broken `<img>` — a library row that claims to hold
   * evidence it cannot show is exactly the lie this app exists to prevent.
   *
   * Bundled sample assets keep theirs: `/demo-media/...` is as valid after a refresh as
   * before it. See `engine/logic/media/captured.ts`.
   */
  url?: string
  poster?: string
  filename: string
  caption: string
  capturedAt: string
  durationSec?: number
  /** true when produced from a sample (no real camera/mic). */
  sample?: boolean
}

export interface LocationForm {
  scopes: ScopeEntry[]
  /** Auto-generated, always DVR-time, derived from the offset. */
  extractedScopes: ScopeEntry[]
  /** True if generateExtractedScopes skipped ≥1 non-canonical scope, so the Adjusted Scope
   *  output is incomplete and must be annotated rather than silently omitted. */
  extractedScopesPartial: boolean
  arrivalDepartures: ArrivalDeparture[]
  timeOffset: TimeOffsetData | null
  dvr: DvrInformation
  cameras: CameraEntry[]
  export: ExportInformation
  /** The seven independently-tracked notes sections (registry order once reconciled).
   *  Empty until the Notes screen first reconciles (Flow A) — read paths that need
   *  wizard-fresh notes reconcile READ-ONLY themselves (Flow F, the PDF path). */
  notesSections: NoteSection[]
  /** Free-text tail appended after all sections in the assembled notes. */
  notesFreeText: string
  /** Completion screen entry fields. */
  dateTimeCompleted: string
  completedBy: string
  /** True once THIS location's "Complete & Save" was tapped (R-1): the Completion screen's
   *  confirmation gate is location-scoped — the case-level status only colors the cards. */
  completed: boolean
  media: { photos: MediaItem[]; videos: MediaItem[]; audios: MediaItem[] }
}

// ---- Entities ---------------------------------------------------------------
export const CASE_STATUSES = ['draft', 'complete', 'archived'] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]
/** Incident coordinates come from the address pick or hand entry — never a live GPS fix. */
export const COORD_SOURCES = ['geocoded', 'manual'] as const
/** Recovery-location fixes can additionally come from a real GPS capture. */
export const GPS_SOURCES = ['gps', 'geocoded', 'manual'] as const
/** Coordinate provenance. Named (R-25) so consumers annotate rather than hand-retyping the
 *  members: a widened `GPS_SOURCES` must reach the provenance chip, not stop at a copy. */
export type GpsSource = (typeof GPS_SOURCES)[number]
/** Incident-scene provenance — the strictly narrower half (no live fix). Named for the same
 *  R-25 reason: the incident form and its mappers annotate with this rather than re-typing
 *  `'geocoded' | 'manual'`, so widening `COORD_SOURCES` reaches every one of them. */
export type IncidentCoordSource = (typeof COORD_SOURCES)[number]

export interface DemoCase {
  id: string
  caseNumber: string
  displayName: string
  unit: string
  oicName: string
  oicBadge: string
  vcName: string
  vcBadge: string
  /** Incident location (the occurrence scene — distinct from the recovery locations). */
  incidentBusinessName: string
  incidentStreetAddress: string
  incidentCity: string
  /** Incident scene coordinates — geocoded from the address pick or entered by hand. Unlike a
   *  recovery location (which always has a real street address), the incident can be anywhere
   *  (a scene in the woods), so coordinates may exist without/independent of the address. */
  incidentCoordinates?: { lat: number; lng: number; source: (typeof COORD_SOURCES)[number] }
  /** Free-text case notes. */
  notes: string
  status: CaseStatus
  createdLabel: string
  locationIds: string[]
}

export interface DemoLocation {
  id: string
  caseId: string
  locationName: string
  businessName: string
  streetAddress: string
  city: string
  requesterName: string
  requesterBadge: string
  /** Requester's unit/section (defaults to the case unit if left blank). */
  requesterUnit: string
  requesterPhone: string
  requesterEmail: string
  locationContact: string
  locationPhone: string
  gps?: GpsCoordinates & { source: GpsSource }
  form: LocationForm
}

// ---- Content registries -----------------------------------------------------
export interface ChapterNarration {
  eyebrow: string
  title: string
  paras: string[]
  bullets: string[]
  tip?: string
}

export interface DrawerDef {
  id: WizardScreenId
  label: string
  icon: string
}

// ---- Form customization (P7.3, matrix A2 / decision D9) ---------------------
/**
 * The two additive capture TOOLS the drawer's Media accordion opens. They are launchables,
 * never linear nav targets — the same split the phone makes with `additive: true`
 * (`config/wizard-steps.ts:109-125`).
 *
 * `ocr` is deliberately absent: it is a step INSIDE Time Offset, launched by a button on an
 * always-on screen, not a toggleable tool (the phone's Decision OD-1, `types/index.ts:22-26`).
 * `satisfies` pins membership in `LaunchableId`; the tuple's EXHAUSTIVENESS over
 * `Exclude<LaunchableId, 'ocr'>` is pinned by test — a new launchable must be classified here
 * or explicitly excluded, never silently omitted.
 */
export const ADDITIVE_FORM_STEP_IDS = ['mediaCapture', 'audioRecording'] as const satisfies readonly LaunchableId[]
export type AdditiveFormStepId = (typeof ADDITIVE_FORM_STEP_IDS)[number]

/** Everything the Form Fields settings pane can switch: the 10 wizard screens + the 2 tools. */
export type FormStepId = WizardScreenId | AdditiveFormStepId

/** `field-capable` → the row expands into per-field toggles; `screen-only` → a note. */
export type FormStepClassification = 'field-capable' | 'screen-only'

export interface FormStepDef {
  readonly id: FormStepId
  /** Row label. Linear steps take the drawer's label; the tools take the accordion's. */
  readonly label: string
  /** DERIVED from registry position — never hand-typed (the house ordering rule). */
  readonly order: number
  readonly classification: FormStepClassification
  /** A drawer-accordion tool rather than a linear wizard step. */
  readonly additive?: boolean
}

/**
 * Canonical id for every user-facing wizard field, VERBATIM from the phone's `FieldId` union
 * (`src/features/form-customization/types/index.ts:44-112`) so the two grids are diffable
 * id-for-id. The prefix is the phone's screen name, which is NOT always the demo's
 * `WizardScreenId` (`scope.` = `requestedScope`, `dvr.` = `dvrInfo`, …) — `FormFieldDef.screen`
 * carries the demo id, and `storeKey` carries the DEMO store key, which is where the two apps
 * genuinely differ (`arrival.arrivalDateTime` → `arrival`, `camera.latitude` → `gps.lat`).
 */
export type FormFieldId =
  // submission
  | 'submission.occNumber'
  | 'submission.requesterName'
  | 'submission.requesterBadgeNumber'
  | 'submission.requesterUnit'
  | 'submission.requesterPhone'
  | 'submission.requesterEmail'
  | 'submission.businessName'
  | 'submission.streetAddress'
  | 'submission.city'
  | 'submission.address'
  | 'submission.latitude'
  | 'submission.longitude'
  | 'submission.coordinateAccuracy'
  | 'submission.coordinateSource'
  | 'submission.locationContact'
  | 'submission.locationPhone'
  // requestedScope (array: scopes)
  | 'scope.startDateTime'
  | 'scope.endDateTime'
  | 'scope.isActualTime'
  | 'scope.cameras'
  // arrivalDeparture (array: arrivalDepartures)
  | 'arrival.arrivalDateTime'
  | 'arrival.departureDateTime'
  // timeOffset
  | 'timeoffset.dvrDateTime'
  | 'timeoffset.actualDateTime'
  | 'timeoffset.dvrAppliesDST'
  // extractedScope (array: extractedScopes)
  | 'extracted.startDateTime'
  | 'extracted.endDateTime'
  | 'extracted.cameras'
  // dvrInfo
  | 'dvr.dvrLocation'
  | 'dvr.dvrTypeBrand'
  | 'dvr.serialModelNumber'
  | 'dvr.dvrUsername'
  | 'dvr.dvrPassword'
  | 'dvr.numberOfChannels'
  | 'dvr.activeCameras'
  | 'dvr.recordingSchedule'
  | 'dvr.resolution'
  | 'dvr.recordingFps'
  | 'dvr.firstRecordedDate'
  | 'dvr.totalDvrRetention'
  | 'dvr.daysUntilOverwritten'
  // cameras (array: cameras)
  | 'camera.cameraName'
  | 'camera.resolution'
  | 'camera.recordingFps'
  | 'camera.latitude'
  | 'camera.longitude'
  | 'camera.coordinateAccuracy'
  | 'camera.coordinateSource'
  | 'camera.coordinateCapturedAt'
  // exportInfo
  | 'export.exportMedia'
  | 'export.fileType'
  | 'export.sizeGb'
  | 'export.mediaPlayerIncluded'
  | 'export.mediaProvidedVia'
  // notes
  | 'notes.notesSections'
  | 'notes.notesFreeText'
  // completion
  | 'completion.dateTimeCompleted'
  | 'completion.completedBy'

export interface FormFieldDef {
  readonly id: FormFieldId
  /** The DEMO screen that hosts the input. */
  readonly screen: FormStepId
  /** Row label — the phone's, verbatim. */
  readonly label: string
  /**
   * The demo store key this field writes: a `LocationForm`/`DemoLocation` member for a flat
   * field, or the entry-property name for an array screen. ABSENT for a field the demo
   * derives at render time and stores nowhere (`dvr.daysUntilOverwritten`) — pinned by test,
   * so "no store key" is a stated fact about two ids and not a hole anything can fall into.
   */
  readonly storeKey?: string
  /** Fields sharing a group toggle atomically (the two GPS blocks). */
  readonly group?: string
}

/**
 * The visitor's sparse deviations from the active profile's defaults — only ids they actually
 * changed. A later edit to `PROFILE_DEFAULTS` therefore still flows through for untouched ids.
 */
export interface FormOverrides {
  readonly steps: Readonly<Partial<Record<FormStepId, boolean>>>
  readonly fields: Readonly<Partial<Record<FormFieldId, boolean>>>
}

/**
 * Everything the visibility resolver reads. `DemoState` satisfies it STRUCTURALLY, so every
 * resolver call site can pass the store state directly — no wrapper object allocated per call,
 * which is what keeps `useStore(store, (s) => resolveFieldVisible(id, s))` loop-safe.
 */
export interface FormVisibility {
  readonly profile: Profile
  readonly formOverrides: FormOverrides
}

/** Per-profile out-of-the-box visibility. TOTAL over both id spaces. */
export interface ProfileDefaults {
  readonly steps: Readonly<Record<FormStepId, boolean>>
  readonly fields: Readonly<Record<FormFieldId, boolean>>
}
