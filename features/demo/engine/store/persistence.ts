import { z } from 'zod'

import type {
  AppView,
  CaptureState,
  DemoState,
  DemoStore,
  PersistedState,
} from '@/features/demo/engine/store/create-store'
import type {
  ArrivalDeparture,
  CameraEntry,
  ChapterId,
  DemoCase,
  DemoLocation,
  DvrInformation,
  ExportInformation,
  LaunchableId,
  LocationForm,
  MediaItem,
  ModalId,
  NoteSection,
  OcrProof,
  ScopeEntry,
  SyncResult,
  TimeOffsetData,
} from '@/features/demo/engine/types'
import {
  CAPTURE_METHODS,
  CASE_STATUSES,
  COORD_SOURCES,
  GPS_SOURCES,
  MEDIA_KINDS,
  NOTE_SECTION_IDS,
  OFFSET_DIRECTIONS,
  PROFILES,
  SYNC_METHODS,
} from '@/features/demo/engine/types'
import { CHAPTERS, LAUNCHABLE, WIZARD_SCREENS } from '@/features/demo/engine/content/screens'

/**
 * sessionStorage persistence for the demo store (P0.4, owner decision D2).
 *
 * A page refresh used to destroy everything the visitor built (gap G1 — the demo boots empty
 * and asks them to build a case by hand). This module mirrors the store into an INJECTED
 * Storage-like backend — `window.sessionStorage` in the app, a fake in tests — debounced on
 * change, and rehydrates it at store creation behind a strict shape guard. sessionStorage is
 * per-tab, so the owner's "a fresh visitor boots empty" decision is preserved: the snapshot
 * survives refresh but dies with the tab, and no visitor ever inherits a stranger's case.
 *
 * Failure policy: persistence is best-effort, boot is sacred. Any read/parse/version/shape
 * problem silently discards the snapshot (and removes it) and the demo boots empty; any write
 * problem (quota, security) is swallowed. Nothing in here may ever throw into the demo.
 */

// ---- Tuning ---------------------------------------------------------------

/** KILL SWITCH — flip to `false` to disable ALL demo persistence (both save and load). */
export const PERSISTENCE_ENABLED = true

/** Bump `SNAPSHOT_VERSION` (and the key's suffix with it) on any incompatible
 *  `PersistedState` shape change: older snapshots are then discarded silently at boot.
 *  v2: `LocationForm.completed` (R-1 — location-scoped completion gate).
 *  v3: `GpsCoordinates.accuracyM` optional (P2.3 — a coordinate whose accuracy nobody
 *      measured no longer carries a fabricated `0`).
 *  v4: sectioned notes — `notesText`/`notesEdited` → `notesSections`/`notesFreeText`
 *      (P2.1, the phone notes-generator port; pre-release = free wipe). v3 and v4 landed
 *      in the same phase from parallel branches — v4 is the union of both shapes. */
export const SNAPSHOT_VERSION = 4
export const SNAPSHOT_KEY = 'dvr-demo-state-v4'

/** Serialize debounce: rapid store changes (typing) collapse into one write. */
export const SAVE_DEBOUNCE_MS = 250

// ---- Injected backend -----------------------------------------------------

/** The injected storage backend — structurally satisfied by `window.sessionStorage`.
 *  Injection keeps the engine pure and lets tests run against an in-memory fake. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

// ---- Snapshot schema (the shape guard) ------------------------------------
// Three compile-time devices keep this guard honest (R-4), each closing one drift direction:
//
// 1. `z.ZodType<DomainType>` annotations — a schema whose OUTPUT no longer satisfies the
//    domain type (e.g. a missing required field) is a compile error.
// 2. `satisfies FullShape<DomainType>` on each shape literal — the shape must NAME every key
//    of the domain type, required AND optional. Without this, a forgotten optional would
//    compile ((a) is satisfied by a subset) and strip-mode `z.object` would silently drop
//    the field on rehydrate.
// 3. Closed unions come from the domain's own `as const` tuples (`z.enum(MEDIA_KINDS)` etc.,
//    engine/types) — a schema enum can't drift narrower than its union because they are the
//    same value. Likewise APP_VIEWS is exhaustive over AppView by construction (EXTRA_VIEWS).
//
// NOT enforced at compile time (R-30):
// - cross-field invariants and referential integrity — the load path handles selection
//   integrity explicitly;
// - field WIDENING: `z.ZodType` output is covariant, so a schema NARROWER than a widened
//   domain field still assigns (adding `| null`, growing a non-tuple union, `string | number`
//   — all compile silently). Runtime consequence is the wipe path: this build writes the
//   widened value, its own schema rejects it next boot, `discard()`. Only device 3's shared
//   tuples close widening, and only for tuple-backed unions — which is why NEW closed unions
//   MUST be declared as `as const` tuples in `engine/types` and consumed here via
//   `z.enum(TUPLE)`, never re-typed by hand. (The maximal round-trip fixture is the runtime
//   net for a populated widening.)
// `z.object` strips unknown keys, so a forward snapshot with extra fields still parses
// (same version).

/** Every key of T — required and optional alike — must appear in the shape (device 2). */
type FullShape<T> = { [K in keyof Required<T>]-?: z.ZodType<Required<T>[K] | undefined> }

/** Input-agnostic `FullShape` (R-28): same key-exhaustiveness guarantee — an omitted key
 *  (even a future optional) is a compile error — with the schema's INPUT type left `unknown`,
 *  so it also fits shapes whose fields refine from a wider input (`view`/`currentChapter` are
 *  `z.string().refine(<type guard>)`: their `_input` is `string`, which `FullShape`'s default
 *  `Input = Output` rejects). With `unknown` Input, devices 1 and 2 compose on every shape in
 *  this file (R-39). */
type FullShapeIn<T> = {
  [K in keyof Required<T>]-?: z.ZodType<Required<T>[K] | undefined, z.ZodTypeDef, unknown>
}

const scopeEntrySchema: z.ZodType<ScopeEntry> = z.object({
  id: z.string(),
  startDateTime: z.string(),
  endDateTime: z.string(),
  isActualTime: z.boolean(),
  cameras: z.string(),
} satisfies FullShape<ScopeEntry>)

const arrivalDepartureSchema: z.ZodType<ArrivalDeparture> = z.object({
  id: z.string(),
  arrival: z.string(),
  departure: z.string(),
} satisfies FullShape<ArrivalDeparture>)

const syncResultSchema: z.ZodType<SyncResult> = z.object({
  method: z.enum(SYNC_METHODS),
  server: z.string(),
  offsetMs: z.number(),
  uncertaintyMs: z.number(),
  rttMs: z.number().optional(),
  traceability: z.string().optional(),
  timestamp: z.number().optional(),
  stratum: z.number().optional(),
} satisfies FullShape<SyncResult>)

const ocrProofSchema: z.ZodType<OcrProof> = z.object({
  rawText: z.string(),
  cleanedText: z.string(),
  parsedDateTime: z.string(),
  confidence: z.number(),
  imageDataUrl: z.string().optional(),
} satisfies FullShape<OcrProof>)

const timeOffsetSchema: z.ZodType<TimeOffsetData> = z.object({
  dvrDateTime: z.string(),
  actualDateTime: z.string(),
  differenceMs: z.number(),
  formattedDifference: z.string(),
  direction: z.enum(OFFSET_DIRECTIONS),
  isDvrAhead: z.boolean(),
  isCorrect: z.boolean(),
  dvrAppliesDST: z.boolean(),
  sync: syncResultSchema.nullable(),
  captureMethod: z.enum(CAPTURE_METHODS),
  ocr: ocrProofSchema.optional(),
} satisfies FullShape<TimeOffsetData>)

const cameraEntrySchema: z.ZodType<CameraEntry> = z.object({
  id: z.string(),
  cameraName: z.string(),
  resolution: z.string(),
  recordingFps: z.string(),
  gps: z
    .object({ lat: z.number(), lng: z.number(), accuracyM: z.number().optional() } satisfies FullShape<
      NonNullable<CameraEntry['gps']>
    >)
    .optional(),
} satisfies FullShape<CameraEntry>)

const dvrInformationSchema: z.ZodType<DvrInformation> = z.object({
  dvrLocation: z.string(),
  dvrTypeBrand: z.string(),
  serialModelNumber: z.string(),
  dvrUsername: z.string(),
  dvrPassword: z.string(),
  numberOfChannels: z.string(),
  activeCameras: z.string(),
  recordingSchedule: z.string(),
  resolution: z.string(),
  recordingFps: z.string(),
  firstRecordedDate: z.string(),
  totalDvrRetention: z.string(),
} satisfies FullShape<DvrInformation>)

const exportInformationSchema: z.ZodType<ExportInformation> = z.object({
  exportMedia: z.string(),
  fileType: z.string(),
  sizeGb: z.string(),
  mediaPlayerIncluded: z.boolean(),
  mediaProvidedVia: z.string(),
} satisfies FullShape<ExportInformation>)

const mediaItemSchema: z.ZodType<MediaItem> = z.object({
  id: z.string(),
  kind: z.enum(MEDIA_KINDS),
  url: z.string(),
  poster: z.string().optional(),
  filename: z.string(),
  caption: z.string(),
  capturedAt: z.string(),
  durationSec: z.number().optional(),
  sample: z.boolean().optional(),
} satisfies FullShape<MediaItem>)

const noteSectionSchema: z.ZodType<NoteSection> = z.object({
  id: z.enum(NOTE_SECTION_IDS), // device 3: the domain's own tuple, never re-typed by hand
  content: z.string(),
  generatedContent: z.string(),
  userAddendum: z.string().optional(),
  manuallyEdited: z.boolean(),
} satisfies FullShape<NoteSection>)

const locationFormSchema: z.ZodType<LocationForm> = z.object({
  scopes: z.array(scopeEntrySchema),
  extractedScopes: z.array(scopeEntrySchema),
  extractedScopesPartial: z.boolean(),
  arrivalDepartures: z.array(arrivalDepartureSchema),
  timeOffset: timeOffsetSchema.nullable(),
  dvr: dvrInformationSchema,
  cameras: z.array(cameraEntrySchema),
  export: exportInformationSchema,
  notesSections: z.array(noteSectionSchema),
  notesFreeText: z.string(),
  dateTimeCompleted: z.string(),
  completedBy: z.string(),
  completed: z.boolean(),
  media: z.object({
    photos: z.array(mediaItemSchema),
    videos: z.array(mediaItemSchema),
    audios: z.array(mediaItemSchema),
  } satisfies FullShape<LocationForm['media']>),
} satisfies FullShape<LocationForm>)

const demoCaseSchema: z.ZodType<DemoCase> = z.object({
  id: z.string(),
  caseNumber: z.string(),
  displayName: z.string(),
  unit: z.string(),
  oicName: z.string(),
  oicBadge: z.string(),
  vcName: z.string(),
  vcBadge: z.string(),
  incidentBusinessName: z.string(),
  incidentStreetAddress: z.string(),
  incidentCity: z.string(),
  incidentCoordinates: z
    .object({ lat: z.number(), lng: z.number(), source: z.enum(COORD_SOURCES) } satisfies FullShape<
      NonNullable<DemoCase['incidentCoordinates']>
    >)
    .optional(),
  notes: z.string(),
  status: z.enum(CASE_STATUSES),
  createdLabel: z.string(),
  locationIds: z.array(z.string()),
} satisfies FullShape<DemoCase>)

const demoLocationSchema: z.ZodType<DemoLocation> = z.object({
  id: z.string(),
  caseId: z.string(),
  locationName: z.string(),
  businessName: z.string(),
  streetAddress: z.string(),
  city: z.string(),
  requesterName: z.string(),
  requesterBadge: z.string(),
  requesterUnit: z.string(),
  requesterPhone: z.string(),
  requesterEmail: z.string(),
  locationContact: z.string(),
  locationPhone: z.string(),
  gps: z
    .object({
      lat: z.number(),
      lng: z.number(),
      accuracyM: z.number().optional(),
      source: z.enum(GPS_SOURCES),
    } satisfies FullShape<NonNullable<DemoLocation['gps']>>)
    .optional(),
  form: locationFormSchema,
} satisfies FullShape<DemoLocation>)

const captureSchema: z.ZodType<CaptureState> = z.object({
  dvrDateTime: z.string(),
  actualDateTime: z.string(),
  sync: syncResultSchema.nullable(),
  method: z.enum(CAPTURE_METHODS),
  ocr: ocrProofSchema.nullable(),
  dvrAppliesDST: z.boolean(),
} satisfies FullShape<CaptureState>)

// View / visited id spaces come from the runtime registries (CHAPTERS/LAUNCHABLE), never a
// hand-typed list — an unknown value means the snapshot predates/postdates this build.
// EXTRA_VIEWS is exhaustive by construction (device 3 / R-4c): an AppView variant that is
// neither a chapter nor a launchable MUST be listed here or this line stops compiling —
// without it, this build would write a view its own loader then rejects (a full wipe).
const EXTRA_VIEWS: Record<Exclude<AppView, ChapterId | LaunchableId>, true> = { map: true }
const APP_VIEWS: readonly AppView[] = [
  ...CHAPTERS,
  ...LAUNCHABLE,
  ...(Object.keys(EXTRA_VIEWS) as Array<Exclude<AppView, ChapterId | LaunchableId>>),
]
const isAppView = (v: string): v is AppView => (APP_VIEWS as readonly string[]).includes(v)
const isChapterId = (v: string): v is ChapterId => (CHAPTERS as readonly string[]).includes(v)
/** Exhaustive by construction: gains/losses on `ModalId` are compile errors here. */
const MODAL_IDS: Record<ModalId, true> = { newCase: true, newLocation: true, import: true, mediaLibrary: true }
/** Own-property check, not `in` (R-7): `in` walks the prototype chain, so a hand-edited
 *  snapshot with `"toString": true` would pass the guard and defeat the documented
 *  "unknown visited keys are dropped" contract. */
const isVisitId = (v: string): v is AppView | ModalId =>
  isAppView(v) || Object.prototype.hasOwnProperty.call(MODAL_IDS, v)

// Device 1 (R-39): the Input-agnostic annotation — FullShapeIn alone enforces key presence,
// not required-ness, so a required future field declared `.optional()` would pass device 2
// silently; the output annotation catches exactly that (probe-verified TS2322).
const persistedStateSchema: z.ZodType<PersistedState, z.ZodTypeDef, unknown> = z.object({
  profile: z.enum(PROFILES),
  cases: z.array(demoCaseSchema),
  locations: z.array(demoLocationSchema),
  currentCaseId: z.string().nullable(),
  currentLocationId: z.string().nullable(),
  view: z.string().refine(isAppView),
  currentChapter: z.string().refine(isChapterId),
  capture: captureSchema,
  visited: z.record(z.string(), z.literal(true)),
} satisfies FullShapeIn<PersistedState>)

const envelopeSchema = z.object({ version: z.number(), state: z.unknown() })

// ---- Snapshot write side --------------------------------------------------

/** Explicit pick of the persisted subset — action functions and the ephemeral chrome
 *  (`modal`, `drawerOpen`) can never leak into the serialized snapshot. */
export function snapshotOf(s: DemoState): PersistedState {
  return {
    profile: s.profile,
    cases: s.cases,
    locations: s.locations,
    currentCaseId: s.currentCaseId,
    currentLocationId: s.currentLocationId,
    view: s.view,
    currentChapter: s.currentChapter,
    capture: s.capture,
    visited: s.visited,
  }
}

// ---- Load side ------------------------------------------------------------

/**
 * Read + validate this tab's snapshot. Returns the rehydratable state, or `null` for ANY
 * problem — missing, unparseable, wrong version, wrong shape, storage unavailable, kill
 * switch off. A discarded snapshot is also removed so it isn't re-parsed every boot.
 *
 * Three deliberate load-time adjustments:
 * - a launch-only view (OCR/media) restores to `currentChapter` instead — launch screens
 *   depend on ephemeral UI state a refresh cannot restore, and `closeLaunch` would land
 *   there anyway ('map' and chapters restore as-is);
 * - `visited` keys this build doesn't know are dropped (the registry may lead or lag);
 * - selection integrity (R-15): a `currentCaseId`/`currentLocationId` that resolves to no
 *   entity is dropped, and a wizard view/chapter left without a resolvable location restores
 *   to 'cases' — otherwise the visitor rehydrates into a wizard where `updateField` is a
 *   silent no-op (typing stores nothing, warns nothing).
 */
export function loadSnapshot(
  storage: StorageLike | null,
  opts: { enabled?: boolean } = {},
): PersistedState | null {
  const enabled = opts.enabled ?? PERSISTENCE_ENABLED
  if (!enabled || !storage) return null

  let raw: string | null = null
  try {
    raw = storage.getItem(SNAPSHOT_KEY)
  } catch {
    return null // storage unreadable — boot empty
  }
  if (raw === null) return null

  const discard = (): null => {
    try {
      storage.removeItem(SNAPSHOT_KEY)
    } catch {
      // removal is best-effort too
    }
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return discard()
  }
  const envelope = envelopeSchema.safeParse(parsed)
  if (!envelope.success || envelope.data.version !== SNAPSHOT_VERSION) return discard()
  const result = persistedStateSchema.safeParse(envelope.data.state)
  if (!result.success) return discard()

  const d = result.data
  // The type-guard refinements in the schema already narrow these — no casts (R-18): if
  // isAppView/isChapterId ever degrade to plain boolean predicates, these lines stop
  // compiling instead of silently asserting an unvalidated string.
  const currentChapter: ChapterId = d.currentChapter
  const view: AppView = d.view
  const visited: Partial<Record<AppView | ModalId, true>> = {}
  for (const key of Object.keys(d.visited)) {
    if (isVisitId(key)) visited[key] = true
  }

  // Selection integrity (R-15): dangling ids pass the shape guard but rehydrate a wizard
  // where updateField silently no-ops. Drop what doesn't resolve; if that leaves a wizard
  // view/chapter with no location, restore to 'cases' instead of a dead form.
  //
  // Pair coherence (R-32): rehydration is the one construction path that ingests state the
  // engine didn't produce, so it must obey the same law as every store action (R-19: "no
  // writer leaves the pair pointing across cases"). When a location is open, IT owns the
  // case — currentCaseId is derived from it, never trusted independently, so a snapshot
  // pairing case B with case A's location can't misattribute an OCC number in the PDF header.
  // An ORPHANED open location (its caseId resolving to no case — P1 review R-9) is dropped
  // with its case: the restored pair is fully coherent or fully empty, never half-live (a
  // caseless wizard would render '—' OCC headers and let Complete & Save stamp a location
  // while greening nothing).
  const caseIds = new Set(d.cases.map((c) => c.id))
  const openLocation =
    d.currentLocationId !== null
      ? d.locations.find((l) => l.id === d.currentLocationId && caseIds.has(l.caseId))
      : undefined
  const currentLocationId = openLocation ? openLocation.id : null
  const currentCaseId = openLocation
    ? openLocation.caseId
    : d.currentCaseId !== null && caseIds.has(d.currentCaseId)
      ? d.currentCaseId
      : null
  const isWizardScreen = (v: string): boolean => (WIZARD_SCREENS as readonly string[]).includes(v)
  let restoredChapter: ChapterId = currentChapter
  let restoredView: AppView = (LAUNCHABLE as readonly string[]).includes(view) ? currentChapter : view
  if (currentLocationId === null) {
    if (isWizardScreen(restoredChapter)) restoredChapter = 'cases'
    if (isWizardScreen(restoredView)) restoredView = restoredChapter
  }

  return {
    profile: d.profile,
    cases: d.cases,
    locations: d.locations,
    currentCaseId,
    currentLocationId,
    view: restoredView,
    currentChapter: restoredChapter,
    capture: d.capture,
    visited,
  }
}

/**
 * Remove this tab's snapshot. The escape hatch for a state-driven render throw (review
 * R-24): the route error net's unmount flushes the throwing state as the NEWEST snapshot,
 * so a plain reset() rebuilds it forever — "Start fresh" clears the snapshot first.
 * Pure/injected like every storage entry point here; null storage is a no-op; a throwing
 * removeItem is swallowed with the R-14 dev breadcrumb (best-effort — worst case the
 * visitor is no worse off than before the clear).
 */
export function clearSnapshot(storage: StorageLike | null): void {
  if (!storage) return
  try {
    storage.removeItem(SNAPSHOT_KEY)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[demo] snapshot clear failed — a refresh may restore the state you tried to discard', e)
    }
  }
}

// ---- Save side ------------------------------------------------------------

export interface PersistenceHandle {
  /** Write any pending (debounced) snapshot NOW — the UI wires this to `pagehide`, because a
   *  refresh rarely waits out the debounce and refresh is the whole point of persisting. */
  flush(): void
  /** Unsubscribe from the store, flushing any pending write first. */
  dispose(): void
  /**
   * Is this handle actually mirroring the store into storage RIGHT NOW?
   *
   * False when there was nothing to mirror into at wiring time (no/blocked storage, or the
   * kill switch) — that is the `NOOP_HANDLE`, a total no-op — and false again from the moment
   * a write fails, because the failure path deliberately CLEARS the snapshot (see `save`
   * below), so a refresh would boot empty. It returns to true if a later write lands: this
   * tracks reality, it is not a latch.
   *
   * Exists because write failures are deliberately invisible to the visitor (the policy in
   * this module's header) — which is correct right up until the UI makes a persistence
   * PROMISE. Any surface that tells the visitor their work will survive a refresh must gate
   * that sentence on this (parity plan §4 honesty rule; review R-2). Never assume a wired
   * handle is a working one.
   */
  isLive(): boolean
}

const NOOP_HANDLE: PersistenceHandle = {
  flush: () => undefined,
  dispose: () => undefined,
  isLive: () => false,
}

/**
 * Subscribe to the store and mirror it into `storage` (debounced). Returns a handle whose
 * `dispose` unsubscribes (flushing first). Write failures (quota, security) never surface to
 * the VISITOR — but they are not silent (R-14/R-26): a dev-gated `console.warn` carries the
 * cause, and the stale snapshot is cleared so a later refresh boots honestly empty instead of
 * silently restoring pre-failure work. Do not delete that breadcrumb as noise.
 */
export function persistDemoStore(
  store: DemoStore,
  storage: StorageLike | null,
  opts: { debounceMs?: number; enabled?: boolean } = {},
): PersistenceHandle {
  const enabled = opts.enabled ?? PERSISTENCE_ENABLED
  if (!enabled || !storage) return NOOP_HANDLE
  const debounceMs = opts.debounceMs ?? SAVE_DEBOUNCE_MS

  let timer: ReturnType<typeof setTimeout> | null = null
  // Tracks whether the LAST write attempt landed. Starts false: nothing has been stored yet,
  // so nothing can be promised yet (see `isLive`).
  let live = false
  const save = () => {
    timer = null
    try {
      storage.setItem(
        SNAPSHOT_KEY,
        JSON.stringify({ version: SNAPSHOT_VERSION, state: snapshotOf(store.getState()) }),
      )
      live = true
    } catch (e) {
      // The snapshot is about to be cleared, so this tab can no longer promise refresh
      // survival — say so to anyone who asks (R-2), independently of the dev breadcrumb.
      live = false
      // Best-effort — a full/blocked storage must never break the demo — but not silent
      // (R-14): leaving the PREVIOUS snapshot in place would make a later refresh silently
      // restore stale work as current. Clear it so a refresh boots empty (honest), and leave
      // a dev breadcrumb per the repo convention — WITH the cause (R-26): quota-exceeded vs
      // storage-blocked need different responses, and the per-keystroke re-warn loop is only
      // diagnosable when the line says why.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[demo] snapshot write failed — clearing the stale snapshot; this tab will boot empty on refresh', e)
      }
      try {
        storage.removeItem(SNAPSHOT_KEY)
      } catch {
        // removal is best-effort too
      }
    }
  }
  const flush = () => {
    if (timer !== null) {
      clearTimeout(timer)
      save()
    }
  }
  const unsubscribe = store.subscribe(() => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(save, debounceMs)
  })
  return {
    flush,
    dispose: () => {
      unsubscribe()
      flush()
    },
    isLive: () => live,
  }
}
