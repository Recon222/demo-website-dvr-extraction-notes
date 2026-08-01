import { createStore, type StoreApi } from 'zustand/vanilla'

import { COORD_SOURCES } from '@/features/demo/engine/types'
import type {
  CameraGpsFix,
  CaptureMethod,
  CaseStatus,
  DuplicateMode,
  GpsCoordinates,
  GpsSource,
  ChapterId,
  DemoCase,
  DemoLocation,
  FormFieldId,
  FormOverrides,
  FormStepId,
  LaunchableId,
  LocationForm,
  MediaItem,
  MediaKind,
  ModalId,
  NoteSection,
  NoteSectionId,
  OcrProof,
  Profile,
  ScopeEntry,
  SyncResult,
  TimeOffsetData,
  UserProfile,
} from '@/features/demo/engine/types'
import { DEFAULT_USER_PROFILE } from '@/features/demo/engine/logic/user-profile'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { CHAPTERS, type TabView } from '@/features/demo/engine/content/screens'
import { assertCaseNumberFree } from '@/features/demo/engine/logic/case-number'
import { getFieldGroupMembers, getFormField, getStepFields, isFieldAlwaysOn, isStepMustStay } from '@/features/demo/engine/content/form-customization'
import { stepHasVisibleField } from '@/features/demo/engine/logic/form-visibility'
import {
  calculateCorrectedTimeRange,
  calculateTimeDifference,
  isDvrTimeCorrect,
  roundTo5Min,
} from '@/features/demo/engine/logic/time'
import type { IncidentLocationPatch } from '@/features/demo/engine/logic/incident-location'
import type { MappedImport } from '@/features/demo/engine/logic/import'
import {
  assembleNotesString,
  extractNotesRelevantData,
  freshSectionContent,
  reconcileSections,
} from '@/features/demo/engine/logic/notes'
import { cloneScopesWithNewIds, maxIdSeq, mediaBucket, setPath } from '@/features/demo/engine/store/helpers'

// ---- Inputs --------------------------------------------------------------
export interface NewCaseInput {
  caseNumber: string
  displayName: string
  unit: string
  oicName?: string
  oicBadge?: string
  vcName?: string
  vcBadge?: string
  incidentBusinessName?: string
  incidentStreetAddress?: string
  incidentCity?: string
  incidentCoordinates?: { lat: number; lng: number; source: (typeof COORD_SOURCES)[number] }
  notes?: string
}

/**
 * The editable half of a case — every `NewCaseInput` field EXCEPT the number. The payload of
 * `updateCase` (the New Case modal's `mode="edit"` submit; phone `NewCaseModal` edit mode,
 * ui-mapping 11 § NewCaseModal).
 *
 * Derived by subtraction from the CREATE input, which is a structural port of the phone's own
 * edit call site: `handleEditSubmit` destructures the number off the full create payload and
 * forwards the rest — `const { caseNumber: _caseNumber, ...updates } = input`
 * (`app/(tabs)/home.tsx:184-188`). So the edit payload is TOTAL, not a patch: whatever the
 * form holds is what the case becomes, which is what makes clearing a field work.
 *
 * P3.1 proposed `Partial<Omit<DemoCase, …>>` instead — a faithful port of the phone's *service*
 * signature (`UpdateCaseInput`, types/index.ts:239-251, every key optional, only defined keys
 * written). Reconciled onto this one at the P3 assembly: partiality is meaningful on the phone
 * because a SQL writer builds its SET list from the present keys, and meaningless here where
 * the writer spreads onto the record either way; a partial type would invite a caller to send
 * `{ displayName }` and silently keep the rest, which the total writer below would NOT honour.
 * P3.1's contributions were kept — the unknown-id guard on the writer, and the compile-time
 * probe in `crud-actions.test.ts` pinning the invariants below.
 *
 * The case's invariants are unreachable through this type, each owned elsewhere:
 * - `id` — identity;
 * - `caseNumber` — immutable after create. `directory_name` (the evidence folder on disk) is
 *   derived from it at creation and the rename path isn't wired, so the phone locks the field
 *   (`editable={!isEdit}`, helper "Case number cannot be changed") and warns at create time;
 * - `status` — owned by `completeCase` (the Completion screen) and `setCaseStatus` (every
 *   other move), exactly as the phone routes every status move through its own service
 *   function (`case-service.ts:571-583`);
 * - `createdLabel` / `locationIds` — derived bookkeeping (`addLocation` / `deleteLocation`).
 */
export type CaseEdits = Omit<NewCaseInput, 'caseNumber'>

export interface NewLocationInput {
  locationName: string
  businessName?: string
  streetAddress?: string
  city?: string
  requesterName?: string
  requesterBadge?: string
  requesterPhone?: string
  requesterEmail?: string
  locationContact?: string
  locationPhone?: string
  /** Coordinates the location is created with. Still no MANUAL entry (a DVR always has a real
   *  street address, so the modal offers no lat/lng inputs), but the source is the full
   *  `GpsSource` since P3.4: the New Location modal now carries a real multi-sample GPS capture
   *  (`'gps'`) alongside the address pick (`'geocoded'`), so a fix no longer has to wait for the
   *  Submission screen to be reachable. `accuracyM` is carried through as given — absent unless
   *  the source measured one (Mapbox rooftop, phone mapbox-service.ts:246-247; or a real fix). */
  gps?: GpsCoordinates & { source: GpsSource }
}

/**
 * Address/contact payload for `duplicateToNewAddress` — the fields the visitor enters (or
 * edits) on the create-location card. Requester fields are intentionally absent: they ALWAYS
 * come from the source location (phone `NewAddressOverrides`,
 * `duplicate-location-service.ts:31-40`, same rule and the same reason — the card never
 * shows them, so a card-sourced value could only ever be a stale copy).
 */
export interface NewAddressOverrides {
  locationName: string
  businessName?: string
  streetAddress?: string
  city?: string
  locationContact?: string
  locationPhone?: string
  /** The full `GpsSource`, same as `NewLocationInput.gps` above. P3.5 narrowed this to
   *  `Exclude<GpsSource, 'gps'>` because the card it was written against inherited deferred
   *  §24's `onCaptureGps={() => undefined}` no-op, so an address pick was the only way a
   *  coordinate could arrive. P3.4 replaced that no-op with the real multi-sample capture and
   *  the card mounts the same `NewLocationModal`, so `'gps'` is now reachable here — see
   *  §52.4. Widened at the P3 assembly; narrowing it again would silently drop real fixes. */
  gps?: GpsCoordinates & { source: GpsSource }
}

// ---- State ---------------------------------------------------------------
/** The in-progress time-offset capture, before `calculateOffset` commits it to a location. */
export interface CaptureState {
  dvrDateTime: string
  actualDateTime: string
  sync: SyncResult | null
  method: CaptureMethod
  ocr: OcrProof | null
  dvrAppliesDST: boolean
}

/** Everything the phone can display: wizard chapters, launch-only screens, and the tab bar's
 *  destinations. The tab-only ones (Map, Export) are destinations, NOT guided chapters — they
 *  never become `currentChapter`, since `setView` only promotes a `ChapterId`. Sourced from the
 *  `TAB_VIEWS` registry, so a tab added there is displayable by construction. */
export type AppView = ChapterId | LaunchableId | TabView

export interface DemoState {
  /** The active FORM profile — which screens and fields the wizard shows out of the box.
   *  Nothing to do with the analyst's user profile (Settings → User Profile). */
  profile: Profile
  /**
   * The visitor's sparse deviations from that profile's defaults (P7.3). Together with
   * `profile` this satisfies `FormVisibility` structurally, which is why every resolver call
   * site can pass the state itself and allocate nothing.
   */
  formOverrides: FormOverrides
  /**
   * The ANALYST's profile (P7.2) — not to be confused with `profile`/`formOverrides` above,
   * which are the FORM profile and its overrides. Held in the store rather than in bridge state
   * (where the cosmetic Settings values live, deferred §80c) for two reasons: it is real data
   * the visitor typed, and it has a downstream consumer — Completion's `completedBy` autofill,
   * which carries the name into the Case Notes PDF header. That makes it snapshot state (v7),
   * so it survives a refresh.
   */
  userProfile: UserProfile
  cases: DemoCase[]
  locations: DemoLocation[]
  currentCaseId: string | null
  currentLocationId: string | null
  view: AppView
  modal: ModalId | null
  drawerOpen: boolean
  /** The chapter the app flow is on — set by chapter navigation (setView) and reset, but
   *  never by launch/closeLaunch: a launch screen (OCR) returns to it on close, and the
   *  rail narration stays anchored to it on non-chapter views (Map, launchables). */
  currentChapter: ChapterId
  capture: CaptureState
  /** Everything the visitor has seen this session — view ids, launchable ids, and modal
   *  ids, recorded by setView/launch/openModal. The exploration manifest derives its lit
   *  state from this (engine/content/explore.ts + selectExploreStatus). Tab-scoped: it
   *  persists across a refresh with the rest of the snapshot (P0.4) but dies with the
   *  tab; reset() starts the record over. Keyed by the recordable id space, not
   *  bare string, so registry typos are compile errors (review M1). */
  visited: Readonly<Partial<Record<AppView | ModalId, true>>>
}

export interface DemoActions {
  reset(): void
  /**
   * Settings → Form Fields (P7.3). Stamp a profile: set it active and CLEAR every override, so
   * "apply a profile" means the same thing here as it does on the phone — a fresh start from
   * that profile's defaults, not a layer on top of the last one.
   */
  applyFormProfile(profile: Profile): void
  /**
   * Toggle a whole screen. A TRUE no-op for a must-stay step (the resolver forces those visible
   * anyway, so persisting the override would only be a misleading record).
   *
   * Re-enabling a screen additionally guarantees it has something to show: first by clearing its
   * field overrides back to the profile's defaults, then — if the profile itself hides every
   * field on it — by forcing them on. Without that, switching Cameras back on under `canvas`
   * lands the visitor on a screen with no inputs at all.
   */
  setFormStepVisible(id: FormStepId, on: boolean): void
  /**
   * Toggle one field. A TRUE no-op for an always-on field. Grouped fields (the two GPS blocks)
   * move together, and turning off the LAST visible field of a removable screen also hides the
   * screen — one-way: only the explicit screen toggle brings it back.
   */
  setFormFieldVisible(id: FormFieldId, on: boolean): void
  /** THROWS `DuplicateCaseNumberError` when `caseNumber` (trimmed, case-sensitive) is
   *  already in use — the demo's write-boundary stand-in for the phone's UNIQUE column.
   *  Callers that surface a user-facing form (the New Case modal) must catch it; see
   *  engine/logic/case-number.ts for why the rule lives at this boundary. */
  createCase(input: NewCaseInput): string
  /** Overwrite a case's editable fields (everything but the number — see `CaseEdits`).
   *  Unknown ids are a TRUE no-op: the guard is an early return, not a `.map` that misses,
   *  so no fresh `cases` array wakes every subscriber and triggers a snapshot write (P3.1).
   *  Deliberately does NOT touch the case/location selection pair:
   *  editing a case from the dashboard must not move the wizard off the location the visitor
   *  had open (R-19's invariant is about which case OWNS the current location, and this
   *  action changes no ownership). */
  updateCase(caseId: string, edits: CaseEdits): void
  /** "Complete & Save" (R-1, location-scoped gate): stamps the CURRENT location's
   *  `form.completed` and turns the case's cards green (`status: 'complete'` — G4's payoff).
   *  The Completion screen's confirmation gate reads the location flag, never the case status.
   *  PRECONDITION (R-32 guard rail): `caseId` must be the case OWNING the current location —
   *  callers derive it from `location.caseId` (the bridge does), never from a separately
   *  tracked case selection. The correlated-pair signature (`completeLocation(locationId)`)
   *  is the deferred stronger shape — see deferred.md §29 addendum. */
  completeCase(caseId: string): void
  /**
   * Case-level status change — the dashboard's Case Actions Sheet (P3.2): Complete Case →
   * 'complete', Archive Case → 'archived', Reopen Case → 'draft' (the phone's three
   * one-line services over `updateCase({ status })`, `case-service.ts:573-583`).
   *
   * DELIBERATELY NOT `completeCase` above: that action is the Completion SCREEN's, and it
   * additionally stamps the open location's `form.completed` under the R-32 precondition
   * that `caseId` owns the current location. The dashboard acts on a case the visitor
   * merely long-pressed — it has no location context and must not invent one, so it only
   * moves the status. A case marked complete from the dashboard therefore leaves its
   * locations' own completion gates untouched, exactly as on the phone.
   *
   * THE single case-status writer (P3 assembly, closing deferred §49b ∧ §48g). P3.1 shipped
   * `archiveCase`/`reopenCase` as named one-liners over the phone's three services and P3.2
   * shipped this; the two were reconciled onto this one. §49b's own trigger ("fold into
   * P3.1's `updateCase`") is refuted by P3.1's type design — `UpdateCaseInput` OMITS
   * `status` on purpose, and its `@ts-expect-error` probe pins that omission, so folding the
   * status in would delete the invariant. Named wrappers lost instead: they had no call site
   * outside their own unit test, `complete` would have needed a fourth (the name is taken),
   * and one writer typed on `CaseStatus` cannot silently miss a status the enum later gains.
   */
  setCaseStatus(caseId: string, status: CaseStatus): void
  /** Incident-location-only edit, from the map's incident detail card (matrix row 23).
   *  The patch type is DERIVED from `DemoCase` (see `IncidentLocationPatch`), so this action
   *  structurally CANNOT touch the case number, OIC/VC, notes or status — full-record editing
   *  stays with the New Case modal in edit mode, exactly as on the phone. A no-op for an
   *  unknown id, like every other case-keyed writer here. */
  updateIncidentLocation(caseId: string, patch: IncidentLocationPatch): void
  /** Delete a case and every location under it (the phone's ON DELETE CASCADE,
   *  `case-service.ts:551`). Repairs the selection pair — see the R-19 note at the impl. */
  deleteCase(caseId: string): void
  /** Delete one location. Repairs the selection pair — see the R-19 note at the impl. */
  deleteLocation(locationId: string): void
  addLocation(caseId: string, input: NewLocationInput): string
  /**
   * P3.5 — "Duplicate Location [with Scopes]": a sibling of `sourceLocationId` in the SAME
   * case, carrying every submission-level field (address, contact, coordinates, all five
   * requester fields) and, in `'with-scopes'` mode, a clone of the requested scopes with
   * fresh ids. Everything DVR-specific starts blank — time offset, extracted scopes, DVR
   * info, cameras, export, notes, media, completion (phone `duplicateLocation`,
   * `duplicate-location-service.ts:59-122`).
   *
   * Returns the new location's id, or `null` when the source no longer exists or the name is
   * blank — the two `ValidationError`s the phone service throws for the same inputs. The
   * caller surfaces them (the demo bridge shows the phone's "Location not found." notice);
   * they are backstops, since the chooser resolves the source at open time and disables both
   * duplicate buttons on a blank/taken name.
   *
   * Deliberately does NOT move the selection pair: the phone stays on the Cases list after a
   * duplicate (no `router.navigate`), so nothing here may reassign the open location.
   */
  duplicateLocation(sourceLocationId: string, locationName: string, mode: DuplicateMode): string | null
  /**
   * P3.5 — "New Location w/ Sub Info [+ Scopes]": an INDEPENDENT location at a new address
   * in the same case. Address/contact/name/coordinates come from `overrides` (the card); the
   * five requester fields ALWAYS come from the source (phone `duplicateToNewAddress`,
   * `duplicate-location-service.ts:150-208`, incl. its mandatory street address — the whole
   * point of the flow is a new address).
   *
   * Returns `null` for the phone's three `ValidationError` cases: source gone, blank name,
   * blank street address. Like `duplicateLocation`, leaves the selection pair alone — the
   * bridge opens the result explicitly (the phone navigates to the wizard afterwards).
   */
  duplicateToNewAddress(
    sourceLocationId: string,
    overrides: NewAddressOverrides,
    mode: DuplicateMode,
  ): string | null
  switchLocation(locationId: string): void
  updateField(path: string, value: unknown): void
  /** Commit a per-camera GPS fix (P3.7). Addressed BY CAMERA ID, never by row index —
   *  a capture runs for up to 120 s (`PRECISE_GPS_CONFIG`) and the row list is editable
   *  throughout, so an index resolved before the await can point at a different camera, or
   *  past the end, by the time the fix lands. A camera the current location no longer has is
   *  a no-op: a removed row must not be resurrected, and a fix must never be misattributed. */
  setCameraGps(cameraId: string, gps: CameraGpsFix): void
  setView(view: AppView): void
  openModal(modal: ModalId): void
  closeModal(): void
  setDrawerOpen(open: boolean): void
  launch(screen: LaunchableId): void
  closeLaunch(): void
  calculateOffset(): void
  generateExtractedScopes(): void
  /** Flow A (phone parity): reconcile stored sections against current wizard data —
   *  un-edited sections silently pick up fresh output; edited ones are never clobbered.
   *  Writes only when something changed (a clean pass performs ZERO writes). */
  reconcileNotes(): void
  /** Flow B: a section block committed (blur/unmount) with replaced text. Empty text
   *  is an explicit deletion. `generatedContent` stays frozen (staleness baseline). */
  commitNoteSection(sectionId: NoteSectionId, text: string): void
  /** Flow C: user annotation for a section; never flips `manuallyEdited`. */
  commitNoteAddendum(sectionId: NoteSectionId, text: string): void
  /** Flow D: the ONLY path that clears `manuallyEdited` — rebuilds the section fresh.
   *  The addendum survives. */
  resetNoteSection(sectionId: NoteSectionId): void
  /** Flow E1, footer "Write my own notes…": one atomic write — free text seeded per
   *  mode, every section deleted (content '', manuallyEdited, addendum dropped);
   *  `generatedContent` kept so deleted+stale restore rows still work. */
  scrapAllNotes(mode: ScrapAllMode): void
  /** Flow E2, banner "Restore": every section rebuilt fresh, addenda preserved;
   *  'clear' also empties the free-text tail. */
  restoreAllNotes(mode: RestoreAllMode): void
  /** Free-text tail commit — no-op when unchanged (clean blurs never write). */
  commitNotesFreeText(text: string): void
  applyImport(patch: MappedImport): void
  /** R-23: the bucket is DERIVED from the item, never passed alongside it. The old
   *  `(kind, item)` pair let `kind !== item.kind` compile, and the end state of that mismatch
   *  is a library row filed under one tab and deleted from another — an undeletable capture. */
  addMedia(item: MediaItem): void
  /** Identified by the item itself, for the same reason. */
  deleteMedia(item: Pick<MediaItem, 'kind' | 'id'>): void
  /**
   * Shallow-merge a patch into the analyst profile — the phone's `updateProfile`
   * (`user-profile-store.ts:38-39`), same semantics: absent keys are left alone.
   *
   * The Save button is the ONLY caller. The editor keeps a local draft and commits the whole
   * (trimmed) record in one call, so closing without saving leaves nothing behind, exactly as on
   * the phone. A `Partial` rather than a whole `UserProfile` because that is the phone's shape
   * and because the will-say feature will want to write single fields.
   *
   * Deliberately NOT reachable through `updateField`: that path is location-scoped
   * (`form.*` on the open location) and silently no-ops with no location open — which is the
   * normal state of the Settings sheet.
   */
  updateUserProfile(patch: Partial<UserProfile>): void
}

/** Footer "Write my own notes…" modes: seed the free text from the current assembled
 *  notes, or start blank (phone Flow E1). */
export type ScrapAllMode = 'current' | 'blank'
/** Banner "Restore" modes: keep or clear the free-text tail (phone Flow E2). */
export type RestoreAllMode = 'keep' | 'clear'

export type DemoStore = StoreApi<DemoState & DemoActions>

/**
 * The refresh-surviving subset of DemoState (P0.4, owner decision D2): everything the visitor
 * built (cases, locations, forms), their selection, their wizard position, the in-progress
 * time-offset capture, and the exploration record. Deliberately EXCLUDED as ephemeral chrome:
 * `modal` (its input fields live in DemoExperience-local useState and would rehydrate blank)
 * and `drawerOpen` — both boot fresh. See engine/store/persistence.ts for the snapshot format.
 */
export type PersistedState = Pick<
  DemoState,
  | 'profile'
  | 'formOverrides'
  | 'userProfile'
  | 'cases'
  | 'locations'
  | 'currentCaseId'
  | 'currentLocationId'
  | 'view'
  | 'currentChapter'
  | 'capture'
  | 'visited'
>

export function blankCapture(): CaptureState {
  return { dvrDateTime: '', actualDateTime: '', sync: null, method: 'manual', ocr: null, dvrAppliesDST: false }
}

/** No deviations from the active profile — the boot state, and what `applyFormProfile` returns
 *  to. A fresh object each call: the maps are written by copy in every action, and a shared
 *  literal would make an accidental in-place write invisible. */
export function blankFormOverrides(): FormOverrides {
  return { steps: {}, fields: {} }
}

/** The empty boot: the visitor creates everything (owner decision — no seed data). */
export function initialState(): DemoState {
  return {
    profile: 'forensic',
    formOverrides: blankFormOverrides(),
    userProfile: { ...DEFAULT_USER_PROFILE },
    cases: [],
    locations: [],
    currentCaseId: null,
    currentLocationId: null,
    view: 'cases',
    modal: null,
    drawerOpen: false,
    currentChapter: 'cases',
    capture: blankCapture(),
    visited: { cases: true }, // you boot there — it counts
  }
}

/** Idempotent visit record — returns the same object when already visited (render economy).
 *  The identity guard is pinned by reference in store.test.ts (review M2). */
const visit = (
  v: DemoState['visited'],
  id: AppView | ModalId,
): DemoState['visited'] => (v[id] ? v : { ...v, [id]: true })

/** True when a view value is a chapter (not a launch-only screen like OCR/media, nor the Map tab).
 *  Keeps `currentChapter` on the last real chapter so the rail/narration never break on the Map view. */
/**
 * The passthrough branch's canonicality guard, matching `applyTimeOffset` / `roundTo5Min`:
 * a bound that isn't canonical `'YYYY-MM-DD HH:MM:SS'` — including empty, i.e. an unset bound —
 * THROWS, so `generateExtractedScopes`'s per-entry isolation counts it as dropped and flags
 * `extractedScopesPartial`. Without this the D10 passthrough would be the one path that carries
 * "not-a-date" onto the extracted-scope screen and from there onto a forensic document, which is
 * exactly the G8 regression `roundTo5Min` was hardened against (deferred §15).
 */
function requireCanonicalTime(value: string): string {
  if (!value || isNaN(new Date(value.replace(' ', 'T') + 'Z').getTime())) {
    throw new Error('Unable to parse date value')
  }
  return value
}

/**
 * POSITIVE check against the chapter registry, matching `persistence.ts`'s own `isChapterId`.
 *
 * It used to be the negative `v !== 'map' && !LAUNCHABLE.includes(v)`, which silently treated
 * every FUTURE non-chapter view as a chapter: P5.2's Export tab promoted itself to
 * `currentChapter` on the first `setView('export')`, which is the value `closeLaunch()` returns
 * to and the key the rail's chapter narration is looked up by — i.e. a launchable closed from
 * the Export tab would have landed back on it, and `NARRATION[currentChapter]` would have been
 * `undefined`. Asking the registry can't rot that way.
 */
const isChapterId = (v: AppView): v is ChapterId => (CHAPTERS as readonly string[]).includes(v)

/**
 * The form a duplicated location starts life with (P3.5): blank everywhere, except that
 * `'with-scopes'` carries a clone of the source's REQUESTED scopes with fresh ids.
 *
 * Everything else is deliberately left blank, matching the phone service: the extracted
 * scopes, time offset, DVR info, cameras, export block, notes, media and completion state all
 * describe a device the duplicate has not been to yet. Carrying any of it forward would put
 * another DVR's measurements into a court document.
 */
function duplicatedForm(
  source: DemoLocation,
  mode: DuplicateMode,
  nextScopeId: () => string,
): LocationForm {
  return {
    ...blankLocationForm(),
    scopes: mode === 'with-scopes' ? cloneScopesWithNewIds(source.form.scopes, nextScopeId) : [],
  }
}

/**
 * Create the demo store — empty by default (the owner's empty-boot decision), or rehydrated
 * from a validated sessionStorage snapshot (P0.4). `initial` must come from `loadSnapshot`
 * (shape-guarded); the id counter is seeded past every rehydrated id so post-refresh ids
 * never collide with restored ones.
 */
export function createDemoStore(initial?: PersistedState): DemoStore {
  let seq = initial ? maxIdSeq(initial) : 0
  const nextId = (prefix: string) => `${prefix}${++seq}`

  return createStore<DemoState & DemoActions>((set, get) => ({
    ...initialState(),
    ...initial,

    /**
     * Start over: back to the empty boot — with the SETTINGS FAMILY carried across.
     *
     * The phone cannot reset any of it: both live in their own AsyncStorage stores precisely
     * because they are app-level config rather than case data (`user-profile/README.md` — "kept
     * separate from the SQLite-backed case data"; `form-customization/README.md:12-13` — "device-
     * level config — never case data"), and there is no `resetProfile()` on either store despite
     * the docs claiming one. "Start over" here means the visitor's CASES go.
     *
     * ONE rule for the three of them (review R-13 / ledger A3): `userProfile` was decided on
     * P7.2's branch and `profile`/`formOverrides` on P7.3's, and the two answers disagreed for
     * no reason either branch could see. Who the analyst is and which form this deployment runs
     * are the same kind of fact — neither is something a fresh sandbox should make them re-enter,
     * and the form profile is a configuration OF the wizard rather than a thing the wizard holds.
     * The tab still forgets all three: the snapshot is per-tab and dies with it, and the
     * "Start fresh" escape hatch clears the snapshot before it resets.
     */
    reset: () =>
      set({
        ...initialState(),
        userProfile: get().userProfile,
        profile: get().profile,
        formOverrides: get().formOverrides,
      }),

    // ---- Form customization (P7.3) --------------------------------------------------------
    applyFormProfile: (profile) => set({ profile, formOverrides: blankFormOverrides() }),

    setFormStepVisible: (id, on) => {
      // Must-stay steps are visible regardless, so refuse to record a contradicting override.
      // An early return rather than a write that the resolver then ignores: a no-op must be a
      // real no-op, or the pane's toggle appears to take and the snapshot grows a lie.
      if (isStepMustStay(id)) return
      set((s) => {
        const steps = { ...s.formOverrides.steps, [id]: on }

        // The symmetric inverse of the field-trim auto-hide below: a screen that is ON must
        // always have at least one visible field, or the visitor lands on a blank form. First
        // clear its field overrides (back to the profile's defaults); if the PROFILE hides
        // every field on it — canvas + cameras is exactly this case — force them on. Fires only
        // when nothing would otherwise show, so a deliberate partial trim is never wiped.
        if (on) {
          const fields = getStepFields(id)
          if (fields.length > 0 && !stepHasVisibleField(id, { ...s, formOverrides: { ...s.formOverrides, steps } })) {
            const cleared = { ...s.formOverrides.fields }
            for (const f of fields) delete cleared[f.id]
            let next: FormOverrides = { steps, fields: cleared }
            if (!stepHasVisibleField(id, { ...s, formOverrides: next })) {
              const forced = { ...cleared }
              for (const f of fields) forced[f.id] = true
              next = { steps, fields: forced }
            }
            return { formOverrides: next }
          }
        }

        return { formOverrides: { steps, fields: s.formOverrides.fields } }
      })
    },

    setFormFieldVisible: (id, on) => {
      // Always-on fields cannot be hidden — same reason as above.
      if (isFieldAlwaysOn(id)) return
      set((s) => {
        // Grouped fields (the two GPS blocks) are ONE decision — a coordinate without its
        // accuracy or its provenance is not a smaller form, it is an unlabelled one.
        const fields = { ...s.formOverrides.fields }
        for (const m of getFieldGroupMembers(id)) fields[m.id] = on

        // Auto-hide cascade, one-way: turning off the last visible field of a REMOVABLE screen
        // hides the screen too, so the wizard never shows an empty step and the pane's screen
        // toggle visibly flips with it. Must-stay screens are exempt — their always-on fields
        // keep them populated. Re-showing is always the explicit screen toggle, never automatic.
        if (!on) {
          const screen = getFormField(id)?.screen
          if (screen && !isStepMustStay(screen)) {
            const next: FormOverrides = { steps: s.formOverrides.steps, fields }
            if (!stepHasVisibleField(screen, { ...s, formOverrides: next })) {
              return { formOverrides: { steps: { ...s.formOverrides.steps, [screen]: false }, fields } }
            }
          }
        }

        return { formOverrides: { steps: s.formOverrides.steps, fields } }
      })
    },

    createCase: (input) => {
      // The write boundary refuses a number that is already in use — the demo's stand-in for
      // the phone's `cases.case_number … UNIQUE` column, which is what makes the phone's
      // `DuplicateCaseNumberError` reach the New Case banner. Checked BEFORE `nextId` so a
      // rejected create never burns an id (ids are the persistence seq's contract).
      assertCaseNumberFree(get().cases, input.caseNumber)
      const id = nextId('c')
      const c: DemoCase = {
        id,
        caseNumber: input.caseNumber,
        displayName: input.displayName,
        unit: input.unit,
        oicName: input.oicName ?? '',
        oicBadge: input.oicBadge ?? '',
        vcName: input.vcName ?? '',
        vcBadge: input.vcBadge ?? '',
        incidentBusinessName: input.incidentBusinessName ?? '',
        incidentStreetAddress: input.incidentStreetAddress ?? '',
        incidentCity: input.incidentCity ?? '',
        incidentCoordinates: input.incidentCoordinates,
        notes: input.notes ?? '',
        status: 'draft',
        createdLabel: 'Just now',
        locationIds: [],
      }
      // Selection-pair invariant (R-19): a new case has no locations yet, so the previous
      // case's location must not stay "current" — createCase clears it; addLocation and
      // switchLocation set both halves. No action leaves the pair pointing across cases.
      set((s) => ({ cases: [c, ...s.cases], currentCaseId: id, currentLocationId: null }))
      return id
    },

    updateCase: (caseId, edits) => {
      // Unknown id is a genuine no-op (P3.1): a bare `.map` would still allocate a new
      // `cases` array, waking every subscriber and triggering a snapshot write for nothing.
      if (!get().cases.some((c) => c.id === caseId)) return
      set((s) => ({
        cases: s.cases.map((c) =>
          c.id === caseId
            ? {
                ...c,
                displayName: edits.displayName,
                unit: edits.unit,
                oicName: edits.oicName ?? '',
                oicBadge: edits.oicBadge ?? '',
                vcName: edits.vcName ?? '',
                vcBadge: edits.vcBadge ?? '',
                incidentBusinessName: edits.incidentBusinessName ?? '',
                incidentStreetAddress: edits.incidentStreetAddress ?? '',
                incidentCity: edits.incidentCity ?? '',
                // Assigned unconditionally, so clearing the coordinates in the form CLEARS
                // them on the case. A conditional spread would make removal impossible.
                incidentCoordinates: edits.incidentCoordinates,
                notes: edits.notes ?? '',
              }
            : c,
        ),
      }))
    },

    completeCase: (caseId) =>
      set((s) => ({
        cases: s.cases.map((c) => (c.id === caseId ? { ...c, status: 'complete' as const } : c)),
        // Stamp ONLY the location whose Completion screen was submitted — sibling locations
        // of the same case stay un-completed (their gate must keep showing the review form).
        locations: s.locations.map((l) =>
          l.id === s.currentLocationId && l.caseId === caseId
            ? { ...l, form: { ...l.form, completed: true } }
            : l,
        ),
      })),

    setCaseStatus: (caseId, status) => {
      // No-op when the case is gone or already in that status — house rule: a write that
      // changes nothing performs no write, so subscribers don't re-render on a repeat tap.
      //
      // The early return has to happen OUTSIDE `set`: returning `{}` from the updater is not a
      // no-op to zustand, which `Object.assign`s it onto a FRESH state object — every selector
      // re-runs and the persistence subscriber writes a snapshot, for a tap that changed
      // nothing. P3.2's own test only pinned `cases` by reference, so it passed either way;
      // P3.1's stronger whole-state assertion is what caught it at the assembly merge.
      const current = get().cases.find((c) => c.id === caseId)
      if (!current || current.status === status) return
      set((s) => ({ cases: s.cases.map((c) => (c.id === caseId ? { ...c, status } : c)) }))
    },
    updateIncidentLocation: (caseId, patch) => {
      // The unknown-id guard this action's own doc already claimed. It was the only P3-added
      // case-keyed writer without it, so a `.map` that matched nothing still allocated a fresh
      // `cases` array and state object: every selector re-runs and the persistence subscriber
      // writes a snapshot for a write that changed nothing — verbatim the §56b defect the
      // assembly fixed one function up and missed here (review R-4).
      if (!get().cases.some((c) => c.id === caseId)) return
      set((s) => ({
        cases: s.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)),
      }))
    },

    /**
     * Delete a case and everything under it — the phone's `DELETE FROM cases` riding SQLite's
     * ON DELETE CASCADE (`case-service.ts:548-552`).
     *
     * SELECTION REPAIR (R-19: "the open location OWNS the case"). Deleting a case can strand
     * the selection pair in two ways, and the repair below is written as a DERIVATION rather
     * than a pair of conditional clears so the post-state is coherent by construction:
     * `currentCaseId` is read off the surviving open location when there is one, and only
     * falls back to its previous value when that value still resolves. The phone repairs the
     * same thing one layer up, in the route (`cases.tsx:632-637`: clear location AND case when
     * the open location belongs to the doomed case) — the demo does it inside the writer, so
     * no future caller can forget it.
     *
     * `capture` follows the location it belongs to. It is the in-progress calibration for the
     * OPEN location (every `switchLocation` blanks it) — and `addLocation` deliberately does
     * not, so leaving a dead capture behind would surface the deleted DVR's clock reading on
     * the next location the visitor creates.
     */
    deleteCase: (caseId) => {
      if (!get().cases.some((c) => c.id === caseId)) return
      set((s) => {
        const locations = s.locations.filter((l) => l.caseId !== caseId)
        const openLocation = locations.find((l) => l.id === s.currentLocationId) ?? null
        return {
          cases: s.cases.filter((c) => c.id !== caseId),
          locations,
          currentLocationId: openLocation?.id ?? null,
          currentCaseId: openLocation
            ? openLocation.caseId
            : s.currentCaseId === caseId
              ? null
              : s.currentCaseId,
          ...(openLocation === null && s.currentLocationId !== null ? { capture: blankCapture() } : {}),
        }
      })
    },

    /**
     * Delete one location, unlinking it from its case's `locationIds`.
     *
     * SELECTION REPAIR (R-19): only the location half moves. `currentCaseId` is deliberately
     * KEPT — the case still exists, and "case selected, no location open" is the same coherent
     * pair `createCase` leaves behind. Phone parity: its location-delete branch clears only the
     * location (`cases.tsx:651-654`), unlike the case branch right above it which clears both.
     * `capture` follows the location, for the reason spelled out on `deleteCase`.
     */
    deleteLocation: (locationId) => {
      const loc = get().locations.find((l) => l.id === locationId)
      if (!loc) return
      set((s) => ({
        locations: s.locations.filter((l) => l.id !== locationId),
        cases: s.cases.map((c) =>
          c.id === loc.caseId
            ? { ...c, locationIds: c.locationIds.filter((id) => id !== locationId) }
            : c,
        ),
        ...(s.currentLocationId === locationId
          ? { currentLocationId: null, capture: blankCapture() }
          : {}),
      }))
    },

    addLocation: (caseId, input) => {
      const id = nextId('l')
      const loc: DemoLocation = {
        id,
        caseId,
        locationName: input.locationName,
        businessName: input.businessName ?? '',
        streetAddress: input.streetAddress ?? '',
        city: input.city ?? '',
        requesterName: input.requesterName ?? '',
        requesterBadge: input.requesterBadge ?? '',
        requesterUnit: '',
        requesterPhone: input.requesterPhone ?? '',
        requesterEmail: input.requesterEmail ?? '',
        locationContact: input.locationContact ?? '',
        locationPhone: input.locationPhone ?? '',
        gps: input.gps ? { ...input.gps } : undefined,
        form: blankLocationForm(),
      }
      set((s) => ({
        locations: [...s.locations, loc],
        cases: s.cases.map((c) => (c.id === caseId ? { ...c, locationIds: [...c.locationIds, id] } : c)),
        // Both halves together (R-19): "Add Location" targets ANY expanded case (targetCaseId),
        // so the case selection must follow the location or the pair goes incoherent.
        currentLocationId: id,
        currentCaseId: caseId,
      }))
      return id
    },

    duplicateLocation: (sourceLocationId, locationName, mode) => {
      const source = get().locations.find((l) => l.id === sourceLocationId)
      if (!source) return null // phone: ValidationError('Source location not found: …')
      const trimmed = locationName.trim()
      if (!trimmed) return null // phone: ValidationError('Location name is required')
      const id = nextId('l')
      // Spread, not a field list: every submission-level field travels (address, contact,
      // coordinates, ALL FIVE requester fields — the phone's BUG-010 was exactly a hand-written
      // list that dropped requesterPhone/requesterEmail). Only identity, name and form differ.
      const loc: DemoLocation = {
        ...source,
        id,
        locationName: trimmed,
        gps: source.gps ? { ...source.gps } : undefined,
        form: duplicatedForm(source, mode, () => nextId('sc')),
      }
      set((s) => ({
        locations: [...s.locations, loc],
        cases: s.cases.map((c) =>
          c.id === source.caseId ? { ...c, locationIds: [...c.locationIds, id] } : c,
        ),
        // No selection write (R-19 stays satisfied by not touching the pair): the phone
        // returns to the Cases list after a duplicate, so the open location must not move.
      }))
      return id
    },

    duplicateToNewAddress: (sourceLocationId, overrides, mode) => {
      const source = get().locations.find((l) => l.id === sourceLocationId)
      if (!source) return null // phone: ValidationError('Source location not found: …')
      const trimmed = overrides.locationName.trim()
      if (!trimmed) return null // phone: ValidationError('Location name is required')
      if (!overrides.streetAddress?.trim()) return null // phone: ValidationError('Street address is required')
      const id = nextId('l')
      const loc: DemoLocation = {
        id,
        caseId: source.caseId,
        locationName: trimmed,
        // Address + contact: the card's values, never the source's — this is a different scene.
        businessName: overrides.businessName ?? '',
        streetAddress: overrides.streetAddress,
        city: overrides.city ?? '',
        locationContact: overrides.locationContact ?? '',
        locationPhone: overrides.locationPhone ?? '',
        gps: overrides.gps ? { ...overrides.gps } : undefined,
        // Requester block: ALWAYS the source's (the card never shows these fields).
        requesterName: source.requesterName,
        requesterBadge: source.requesterBadge,
        requesterUnit: source.requesterUnit,
        requesterPhone: source.requesterPhone,
        requesterEmail: source.requesterEmail,
        form: duplicatedForm(source, mode, () => nextId('sc')),
      }
      set((s) => ({
        locations: [...s.locations, loc],
        cases: s.cases.map((c) =>
          c.id === source.caseId ? { ...c, locationIds: [...c.locationIds, id] } : c,
        ),
      }))
      return id
    },

    switchLocation: (locationId) => {
      const loc = get().locations.find((l) => l.id === locationId)
      if (!loc) return
      set({ currentLocationId: locationId, currentCaseId: loc.caseId, capture: blankCapture() })
    },

    updateField: (path, value) => {
      if (path.startsWith('capture.')) {
        const key = path.slice('capture.'.length)
        set((s) => ({ capture: setPath(s.capture, key, value) }))
        return
      }
      const id = get().currentLocationId
      if (!id) return
      set((s) => ({ locations: s.locations.map((l) => (l.id === id ? setPath(l, path, value) : l)) }))
    },

    setCameraGps: (cameraId, gps) => {
      const id = get().currentLocationId
      if (!id) return
      const loc = get().locations.find((l) => l.id === id)
      // The identity guard (the R-1/R-32 discipline applied to a dynamic row list). Both
      // dropped writes are silent by design: an operator who removed the row, or left for
      // another location, has already said what should happen to that reading. Camera ids are
      // globally unique (`uiSeq`, seeded past every rehydrated id), so "not in the OPEN
      // location" also covers "belongs to a location the visitor has since switched away from".
      if (!loc || !loc.form.cameras.some((c) => c.id === cameraId)) return
      set((s) => ({
        locations: s.locations.map((l) =>
          l.id === id
            ? { ...l, form: { ...l.form, cameras: l.form.cameras.map((c) => (c.id === cameraId ? { ...c, gps } : c)) } }
            : l,
        ),
      }))
    },

    setView: (view) =>
      set((s) =>
        isChapterId(view)
          ? { view, currentChapter: view, visited: visit(s.visited, view) }
          : { view, visited: visit(s.visited, view) },
      ),
    openModal: (modal) => set((s) => ({ modal, visited: visit(s.visited, modal) })),
    closeModal: () => set({ modal: null }),
    setDrawerOpen: (open) => set({ drawerOpen: open }),

    launch: (screen) => set((s) => ({ view: screen, visited: visit(s.visited, screen) })),
    closeLaunch: () => set((s) => ({ view: s.currentChapter })),

    calculateOffset: () => {
      const s = get()
      const id = s.currentLocationId
      if (!id) return
      const { dvrDateTime, actualDateTime, sync, method, ocr, dvrAppliesDST } = s.capture
      if (!dvrDateTime || !actualDateTime) return
      const diff = calculateTimeDifference(dvrDateTime, actualDateTime)
      const timeOffset: TimeOffsetData = {
        dvrDateTime,
        actualDateTime,
        differenceMs: diff.differenceMs,
        formattedDifference: diff.formattedDifference,
        direction: diff.direction,
        isDvrAhead: diff.isDvrAhead,
        isCorrect: isDvrTimeCorrect(diff),
        dvrAppliesDST,
        sync,
        captureMethod: method,
        ocr: ocr ?? undefined,
      }
      set((st) => ({
        locations: st.locations.map((l) => (l.id === id ? { ...l, form: { ...l.form, timeOffset } } : l)),
      }))
    },

    generateExtractedScopes: () => {
      const s = get()
      const id = s.currentLocationId
      if (!id) return
      const loc = s.locations.find((l) => l.id === id)
      if (!loc || !loc.form.timeOffset) return
      const off = loc.form.timeOffset // TimeOffsetData is a structural TimeDifference superset
      // Per-entry isolation: a scope whose times aren't canonical yet (e.g. free-text
      // import frames the requested-scope screen hasn't normalised) is skipped, not allowed
      // to throw out of the action or abandon the scopes already computed.
      const extracted: ScopeEntry[] = []
      let dropped = 0
      for (const sc of loc.form.scopes) {
        try {
          // D10 (owner ruling): the extracted window is derived DIFFERENTLY per time domain,
          // because the two kinds of request mean different things on the ground.
          //
          // REAL-TIME request (`isActualTime === true`) — the requester named a real-world
          // window and has no idea what the DVR's clock reads. Map it onto the DVR timeline
          // with the measured offset, then pad OUTWARD to the 5-minute marks — start back, end
          // forward — so the export cannot clip the moment of interest. That padding is the
          // whole point of the rounding: it is deliberate slack on a converted estimate.
          //
          // DVR-TIME request (`isActualTime === false`) — the requester stood at the device,
          // read its clock, and asked for exactly those times. What comes back is normally
          // exactly what was asked for, so the window passes through UNTOUCHED: no offset, no
          // rounding. Neither has any business here. Widening a window the requester specified
          // against the DVR's own clock invents scope they did not ask for, and the offset is
          // INFORMATIONAL for this kind of request — it tells the reader what real-world time
          // the DVR window corresponds to, which the Time-Offset screen shows separately
          // (`selectAdjustedScopes`), exactly as the phone does.
          //
          // The old unconditional branch was wrong twice over for DVR-time scopes:
          // `calculateCorrectedTimeRange` converts DVR→real for that input (the offset applied
          // in the REVERSE of the intended direction), and the real-domain result was then
          // stamped back as `isActualTime: false` and rounded. `isActualTime: false` below is
          // now honest on both paths — the passthrough values already are DVR-domain.
          let startDateTime: string
          let endDateTime: string
          if (sc.isActualTime) {
            const corrected = calculateCorrectedTimeRange(
              { startDateTime: sc.startDateTime, endDateTime: sc.endDateTime },
              off,
              sc.isActualTime,
            )
            startDateTime = roundTo5Min(corrected.startDateTime, 'down')
            endDateTime = roundTo5Min(corrected.endDateTime, 'up')
          } else {
            startDateTime = requireCanonicalTime(sc.startDateTime)
            endDateTime = requireCanonicalTime(sc.endDateTime)
          }
          extracted.push({
            id: nextId('es'),
            startDateTime,
            endDateTime,
            isActualTime: false,
            cameras: sc.cameras,
          })
        } catch {
          // A scope whose times aren't canonical yet (e.g. free-text import frames the
          // requested-scope screen hasn't normalised) is skipped — but counted + surfaced
          // below (warn + extractedScopesPartial), never silently dropped from the record.
          dropped++
        }
      }
      if (dropped > 0 && process.env.NODE_ENV !== 'production') {
        console.warn(`[demo] generateExtractedScopes skipped ${dropped} non-canonical scope(s)`)
      }
      set((st) => ({
        locations: st.locations.map((l) =>
          l.id === id
            ? { ...l, form: { ...l.form, extractedScopes: extracted, extractedScopesPartial: dropped > 0 } }
            : l,
        ),
      }))
    },

    // ---- Notes (P2.1 — the phone's seven-section generator; flows A–E2) ----------
    // Every action reads the CURRENT location fresh at call time and no-ops when
    // nothing changed, so clean blurs and unmount flushes never write (phone parity:
    // "every callback reads getState() fresh; every one no-ops when nothing changed").

    reconcileNotes: () => {
      const s = get()
      const id = s.currentLocationId
      if (!id) return
      const loc = s.locations.find((l) => l.id === id)
      if (!loc) return
      const { sections, changed } = reconcileSections(
        extractNotesRelevantData(loc),
        loc.form.notesSections,
      )
      // Phone Flow A gate: `changed || sections were never generated` — otherwise a
      // clean focus performs zero writes (reference preservation upstream makes this
      // exact, not heuristic).
      if (!changed && loc.form.notesSections.length > 0) return
      set((st) => ({
        locations: st.locations.map((l) =>
          l.id === id ? { ...l, form: { ...l.form, notesSections: sections } } : l,
        ),
      }))
    },

    commitNoteSection: (sectionId, text) => {
      const s = get()
      const id = s.currentLocationId
      if (!id) return
      const loc = s.locations.find((l) => l.id === id)
      const stored = loc?.form.notesSections.find((sec) => sec.id === sectionId)
      if (!stored || stored.content === text) return
      set((st) => ({
        locations: st.locations.map((l) =>
          l.id === id
            ? {
                ...l,
                form: {
                  ...l.form,
                  notesSections: l.form.notesSections.map((sec) =>
                    // generatedContent untouched — the frozen staleness baseline.
                    sec.id === sectionId ? { ...sec, content: text, manuallyEdited: true } : sec,
                  ),
                },
              }
            : l,
        ),
      }))
    },

    commitNoteAddendum: (sectionId, text) => {
      const s = get()
      const id = s.currentLocationId
      if (!id) return
      const loc = s.locations.find((l) => l.id === id)
      const stored = loc?.form.notesSections.find((sec) => sec.id === sectionId)
      if (!stored || (stored.userAddendum ?? '') === text) return
      set((st) => ({
        locations: st.locations.map((l) =>
          l.id === id
            ? {
                ...l,
                form: {
                  ...l.form,
                  notesSections: l.form.notesSections.map((sec) =>
                    // NEVER sets manuallyEdited — an annotation is not a takeover.
                    sec.id === sectionId ? { ...sec, userAddendum: text || undefined } : sec,
                  ),
                },
              }
            : l,
        ),
      }))
    },

    resetNoteSection: (sectionId) => {
      const s = get()
      const id = s.currentLocationId
      if (!id) return
      const loc = s.locations.find((l) => l.id === id)
      const stored = loc?.form.notesSections.find((sec) => sec.id === sectionId)
      if (!loc || !stored) return
      const fresh = freshSectionContent(sectionId, extractNotesRelevantData(loc))
      set((st) => ({
        locations: st.locations.map((l) =>
          l.id === id
            ? {
                ...l,
                form: {
                  ...l.form,
                  notesSections: l.form.notesSections.map((sec) =>
                    sec.id === sectionId
                      ? {
                          id: sec.id,
                          content: fresh,
                          generatedContent: fresh,
                          manuallyEdited: false, // the ONLY path that clears it
                          ...(sec.userAddendum !== undefined
                            ? { userAddendum: sec.userAddendum } // addendum survives reset
                            : {}),
                        }
                      : sec,
                  ),
                },
              }
            : l,
        ),
      }))
    },

    scrapAllNotes: (mode) => {
      const s = get()
      const id = s.currentLocationId
      if (!id) return
      const loc = s.locations.find((l) => l.id === id)
      if (!loc) return
      const notesFreeText =
        mode === 'current'
          ? assembleNotesString(loc.form.notesSections, loc.form.notesFreeText)
          : ''
      // ONE atomic write. generatedContent kept as the frozen baseline so
      // deleted+stale restore rows still work; addenda are dropped (phone E1).
      const notesSections: NoteSection[] = loc.form.notesSections.map((sec) => ({
        id: sec.id,
        content: '',
        generatedContent: sec.generatedContent,
        manuallyEdited: true,
      }))
      set((st) => ({
        locations: st.locations.map((l) =>
          l.id === id ? { ...l, form: { ...l.form, notesSections, notesFreeText } } : l,
        ),
      }))
    },

    restoreAllNotes: (mode) => {
      const s = get()
      const id = s.currentLocationId
      if (!id) return
      const loc = s.locations.find((l) => l.id === id)
      if (!loc) return
      const fd = extractNotesRelevantData(loc)
      const notesSections: NoteSection[] = loc.form.notesSections.map((sec) => {
        const fresh = freshSectionContent(sec.id, fd)
        return {
          id: sec.id,
          content: fresh,
          generatedContent: fresh,
          manuallyEdited: false,
          ...(sec.userAddendum !== undefined ? { userAddendum: sec.userAddendum } : {}), // preserved
        }
      })
      set((st) => ({
        locations: st.locations.map((l) =>
          l.id === id
            ? {
                ...l,
                form: {
                  ...l.form,
                  notesSections,
                  ...(mode === 'clear' ? { notesFreeText: '' } : {}),
                },
              }
            : l,
        ),
      }))
    },

    commitNotesFreeText: (text) => {
      const s = get()
      const id = s.currentLocationId
      if (!id) return
      const loc = s.locations.find((l) => l.id === id)
      if (!loc || loc.form.notesFreeText === text) return
      set((st) => ({
        locations: st.locations.map((l) =>
          l.id === id ? { ...l, form: { ...l.form, notesFreeText: text } } : l,
        ),
      }))
    },

    applyImport: (patch) => {
      const id = get().currentLocationId
      if (!id) return
      set((s) => ({
        locations: s.locations.map((l) => {
          if (l.id !== id) return l
          return {
            ...l,
            requesterName: patch.requesterName || l.requesterName,
            requesterBadge: patch.requesterBadgeNumber || l.requesterBadge,
            requesterPhone: patch.requesterPhone || l.requesterPhone,
            requesterEmail: patch.requesterEmail || l.requesterEmail,
            businessName: patch.businessName || l.businessName,
            streetAddress: patch.streetAddress || l.streetAddress,
            city: patch.city || l.city,
            locationContact: patch.locationContact || l.locationContact,
            locationPhone: patch.locationPhone || l.locationPhone,
            form: {
              ...l.form,
              dvr: {
                ...l.form.dvr,
                dvrTypeBrand: patch._import.dvrTypeBrand || l.form.dvr.dvrTypeBrand,
                dvrUsername: patch._import.dvrUsername || l.form.dvr.dvrUsername,
                dvrPassword: patch._import.dvrPassword || l.form.dvr.dvrPassword,
                totalDvrRetention: patch._import.totalDvrRetention || l.form.dvr.totalDvrRetention,
              },
              scopes: patch._import.timeFrames.length
                ? patch._import.timeFrames.map((tf) => ({
                    id: nextId('sc'),
                    startDateTime: tf.startDateTime,
                    endDateTime: tf.endDateTime,
                    isActualTime: tf.isActualTime,
                    cameras: tf.cameras,
                  }))
                : l.form.scopes,
            },
          }
        }),
      }))
      // Event-scoped breadcrumb (§15 / R-27 / R-33): a post-offset import is the one path
      // that creates non-canonical adjusted rows without passing through Calculate (whose
      // generateExtractedScopes already warns). Warned HERE — once per import event — so the
      // render-scoped selector can stay silent instead of repeating per keystroke.
      if (process.env.NODE_ENV !== 'production') {
        const loc = get().locations.find((l) => l.id === id)
        const off = loc?.form.timeOffset
        if (off && patch._import.timeFrames.length) {
          let dropped = 0
          for (const sc of loc.form.scopes) {
            try {
              calculateCorrectedTimeRange({ startDateTime: sc.startDateTime, endDateTime: sc.endDateTime }, off, sc.isActualTime)
            } catch {
              dropped++
            }
          }
          if (dropped > 0) {
            console.warn(`[demo] applyImport: ${dropped} imported time frame(s) aren't canonical yet — adjusted times stay blank until corrected`)
          }
        }
      }
    },

    addMedia: (item) => {
      const id = get().currentLocationId
      if (!id) return
      const bucket = mediaBucket(item.kind)
      set((s) => ({
        locations: s.locations.map((l) =>
          l.id === id
            ? { ...l, form: { ...l.form, media: { ...l.form.media, [bucket]: [...l.form.media[bucket], item] } } }
            : l,
        ),
      }))
    },

    deleteMedia: ({ kind, id: mediaId }) => {
      const id = get().currentLocationId
      if (!id) return
      const bucket = mediaBucket(kind)
      set((s) => ({
        locations: s.locations.map((l) =>
          l.id === id
            ? {
                ...l,
                form: {
                  ...l.form,
                  media: { ...l.form.media, [bucket]: l.form.media[bucket].filter((m) => m.id !== mediaId) },
                },
              }
            : l,
        ),
      }))
    },

    updateUserProfile: (patch) =>
      set((s) => ({ userProfile: { ...s.userProfile, ...patch } })),
  }))
}
