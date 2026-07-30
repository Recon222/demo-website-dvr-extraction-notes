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
  LocationForm,
  MediaItem,
  ModalId,
  OcrProof,
  ScopeEntry,
  SyncResult,
  TimeOffsetData,
} from '@/features/demo/engine/types'
import { CHAPTERS, LAUNCHABLE } from '@/features/demo/engine/content/screens'

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
 *  v2: `LocationForm.completed` (R-1 — location-scoped completion gate). */
export const SNAPSHOT_VERSION = 2
export const SNAPSHOT_KEY = 'dvr-demo-state-v2'

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
// Every schema is annotated `z.ZodType<DomainType>` so a drift between the domain types and
// this guard is a COMPILE error, not a stale snapshot silently passing validation. z.object
// strips unknown keys, so a forward snapshot with extra fields still parses (same version).

const scopeEntrySchema: z.ZodType<ScopeEntry> = z.object({
  id: z.string(),
  startDateTime: z.string(),
  endDateTime: z.string(),
  isActualTime: z.boolean(),
  cameras: z.string(),
})

const arrivalDepartureSchema: z.ZodType<ArrivalDeparture> = z.object({
  id: z.string(),
  arrival: z.string(),
  departure: z.string(),
})

const syncResultSchema: z.ZodType<SyncResult> = z.object({
  method: z.enum(['NTP', 'HTTP']),
  server: z.string(),
  offsetMs: z.number(),
  uncertaintyMs: z.number(),
  rttMs: z.number().optional(),
  traceability: z.string().optional(),
  timestamp: z.number().optional(),
  stratum: z.number().optional(),
})

const ocrProofSchema: z.ZodType<OcrProof> = z.object({
  rawText: z.string(),
  cleanedText: z.string(),
  parsedDateTime: z.string(),
  confidence: z.number(),
  imageDataUrl: z.string().optional(),
})

const timeOffsetSchema: z.ZodType<TimeOffsetData> = z.object({
  dvrDateTime: z.string(),
  actualDateTime: z.string(),
  differenceMs: z.number(),
  formattedDifference: z.string(),
  direction: z.enum(['AHEAD OF', 'BEHIND']),
  isDvrAhead: z.boolean(),
  isCorrect: z.boolean(),
  dvrAppliesDST: z.boolean(),
  sync: syncResultSchema.nullable(),
  captureMethod: z.enum(['manual', 'ocr']),
  ocr: ocrProofSchema.optional(),
})

const cameraEntrySchema: z.ZodType<CameraEntry> = z.object({
  id: z.string(),
  cameraName: z.string(),
  resolution: z.string(),
  recordingFps: z.string(),
  gps: z.object({ lat: z.number(), lng: z.number(), accuracyM: z.number() }).optional(),
})

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
})

const exportInformationSchema: z.ZodType<ExportInformation> = z.object({
  exportMedia: z.string(),
  fileType: z.string(),
  sizeGb: z.string(),
  mediaPlayerIncluded: z.boolean(),
  mediaProvidedVia: z.string(),
})

const mediaItemSchema: z.ZodType<MediaItem> = z.object({
  id: z.string(),
  kind: z.enum(['photo', 'video', 'audio']),
  url: z.string(),
  poster: z.string().optional(),
  filename: z.string(),
  caption: z.string(),
  capturedAt: z.string(),
  durationSec: z.number().optional(),
  sample: z.boolean().optional(),
})

const locationFormSchema: z.ZodType<LocationForm> = z.object({
  scopes: z.array(scopeEntrySchema),
  extractedScopes: z.array(scopeEntrySchema),
  extractedScopesPartial: z.boolean(),
  arrivalDepartures: z.array(arrivalDepartureSchema),
  timeOffset: timeOffsetSchema.nullable(),
  dvr: dvrInformationSchema,
  cameras: z.array(cameraEntrySchema),
  export: exportInformationSchema,
  notesText: z.string(),
  notesEdited: z.boolean(),
  dateTimeCompleted: z.string(),
  completedBy: z.string(),
  completed: z.boolean(),
  media: z.object({
    photos: z.array(mediaItemSchema),
    videos: z.array(mediaItemSchema),
    audios: z.array(mediaItemSchema),
  }),
})

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
    .object({ lat: z.number(), lng: z.number(), source: z.enum(['geocoded', 'manual']) })
    .optional(),
  notes: z.string(),
  status: z.enum(['draft', 'complete', 'archived']),
  createdLabel: z.string(),
  locationIds: z.array(z.string()),
})

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
      accuracyM: z.number(),
      source: z.enum(['gps', 'geocoded', 'manual']),
    })
    .optional(),
  form: locationFormSchema,
})

const captureSchema: z.ZodType<CaptureState> = z.object({
  dvrDateTime: z.string(),
  actualDateTime: z.string(),
  sync: syncResultSchema.nullable(),
  method: z.enum(['manual', 'ocr']),
  ocr: ocrProofSchema.nullable(),
  dvrAppliesDST: z.boolean(),
})

// View / visited id spaces come from the runtime registries (CHAPTERS/LAUNCHABLE), never a
// hand-typed list — an unknown value means the snapshot predates/postdates this build.
const APP_VIEWS: readonly string[] = [...CHAPTERS, ...LAUNCHABLE, 'map']
const isAppView = (v: string): v is AppView => APP_VIEWS.includes(v)
const isChapterId = (v: string): v is ChapterId => (CHAPTERS as readonly string[]).includes(v)
/** Exhaustive by construction: gains/losses on `ModalId` are compile errors here. */
const MODAL_IDS: Record<ModalId, true> = { newCase: true, newLocation: true, import: true, mediaLibrary: true }
const isVisitId = (v: string): v is AppView | ModalId => isAppView(v) || v in MODAL_IDS

const persistedStateSchema = z.object({
  profile: z.enum(['forensic', 'canvas']),
  cases: z.array(demoCaseSchema),
  locations: z.array(demoLocationSchema),
  currentCaseId: z.string().nullable(),
  currentLocationId: z.string().nullable(),
  view: z.string().refine(isAppView),
  currentChapter: z.string().refine(isChapterId),
  capture: captureSchema,
  visited: z.record(z.string(), z.literal(true)),
})

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
 * Two deliberate load-time adjustments:
 * - a launch-only view (OCR/media) restores to `currentChapter` instead — launch screens
 *   depend on ephemeral UI state a refresh cannot restore, and `closeLaunch` would land
 *   there anyway ('map' and chapters restore as-is);
 * - `visited` keys this build doesn't know are dropped (the registry may lead or lag).
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
  // The refinements above guarantee these narrowings.
  const currentChapter = d.currentChapter as ChapterId
  const view = d.view as AppView
  const visited: Partial<Record<AppView | ModalId, true>> = {}
  for (const key of Object.keys(d.visited)) {
    if (isVisitId(key)) visited[key] = true
  }
  return {
    profile: d.profile,
    cases: d.cases,
    locations: d.locations,
    currentCaseId: d.currentCaseId,
    currentLocationId: d.currentLocationId,
    view: (LAUNCHABLE as readonly string[]).includes(view) ? currentChapter : view,
    currentChapter,
    capture: d.capture,
    visited,
  }
}

// ---- Save side ------------------------------------------------------------

export interface PersistenceHandle {
  /** Write any pending (debounced) snapshot NOW — the UI wires this to `pagehide`, because a
   *  refresh rarely waits out the debounce and refresh is the whole point of persisting. */
  flush(): void
  /** Unsubscribe from the store, flushing any pending write first. */
  dispose(): void
}

const NOOP_HANDLE: PersistenceHandle = { flush: () => undefined, dispose: () => undefined }

/**
 * Subscribe to the store and mirror it into `storage` (debounced). Returns a handle whose
 * `dispose` unsubscribes (flushing first). Write failures (quota, security) are swallowed —
 * persistence must never surface in the demo.
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
  const save = () => {
    timer = null
    try {
      storage.setItem(
        SNAPSHOT_KEY,
        JSON.stringify({ version: SNAPSHOT_VERSION, state: snapshotOf(store.getState()) }),
      )
    } catch {
      // best-effort: a full/blocked storage must never break the demo
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
  }
}
