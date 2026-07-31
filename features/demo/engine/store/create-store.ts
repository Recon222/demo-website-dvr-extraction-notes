import { createStore, type StoreApi } from 'zustand/vanilla'

import { COORD_SOURCES } from '@/features/demo/engine/types'
import type {
  CameraGpsFix,
  CaptureMethod,
  CaseStatus,
  GpsCoordinates,
  GpsSource,
  ChapterId,
  DemoCase,
  DemoLocation,
  LaunchableId,
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
} from '@/features/demo/engine/types'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { LAUNCHABLE } from '@/features/demo/engine/content/screens'
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
import { maxIdSeq, mediaBucket, setPath } from '@/features/demo/engine/store/helpers'

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

/** Everything the phone can display: wizard chapters, launch-only screens, and tab-only views (Map).
 *  'map' is a tab destination, NOT a guided chapter — it never becomes `currentChapter`. */
export type AppView = ChapterId | LaunchableId | 'map'

export interface DemoState {
  profile: Profile
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
  createCase(input: NewCaseInput): string
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
   * SEAM (P3.1, cases CRUD): if that package lands a general `updateCase`, this collapses
   * into it — keep the three call sites' semantics.
   */
  setCaseStatus(caseId: string, status: CaseStatus): void
  /** Incident-location-only edit, from the map's incident detail card (matrix row 23).
   *  The patch type is DERIVED from `DemoCase` (see `IncidentLocationPatch`), so this action
   *  structurally CANNOT touch the case number, OIC/VC, notes or status — full-record editing
   *  stays with the New Case modal in edit mode, exactly as on the phone. A no-op for an
   *  unknown id, like every other case-keyed writer here. */
  updateIncidentLocation(caseId: string, patch: IncidentLocationPatch): void
  addLocation(caseId: string, input: NewLocationInput): string
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
  addMedia(kind: MediaKind, item: MediaItem): void
  deleteMedia(kind: MediaKind, id: string): void
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

/** The empty boot: the visitor creates everything (owner decision — no seed data). */
export function initialState(): DemoState {
  return {
    profile: 'forensic',
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

const isChapterId = (v: AppView): v is ChapterId =>
  v !== 'map' && !(LAUNCHABLE as readonly string[]).includes(v)

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

    /** Start over: back to the empty boot. */
    reset: () => set(initialState()),

    createCase: (input) => {
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

    setCaseStatus: (caseId, status) =>
      set((s) => {
        // No-op when the case is gone or already in that status — house rule: a write that
        // changes nothing performs no write, so subscribers don't re-render on a repeat tap.
        const current = s.cases.find((c) => c.id === caseId)
        if (!current || current.status === status) return {}
        return { cases: s.cases.map((c) => (c.id === caseId ? { ...c, status } : c)) }
      }),
    updateIncidentLocation: (caseId, patch) =>
      set((s) => ({
        cases: s.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)),
      })),

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

    addMedia: (kind, item) => {
      const id = get().currentLocationId
      if (!id) return
      const bucket = mediaBucket(kind)
      set((s) => ({
        locations: s.locations.map((l) =>
          l.id === id
            ? { ...l, form: { ...l.form, media: { ...l.form.media, [bucket]: [...l.form.media[bucket], item] } } }
            : l,
        ),
      }))
    },

    deleteMedia: (kind, mediaId) => {
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
  }))
}
