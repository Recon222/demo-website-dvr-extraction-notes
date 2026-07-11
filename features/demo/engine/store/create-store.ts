import { createStore, type StoreApi } from 'zustand/vanilla'

import type {
  ChapterId,
  DemoCase,
  DemoLocation,
  LaunchableId,
  MediaItem,
  MediaKind,
  ModalId,
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
import type { MappedImport } from '@/features/demo/engine/logic/import'
import { mediaBucket, setPath } from '@/features/demo/engine/store/helpers'

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
  incidentCoordinates?: { lat: number; lng: number; source: 'geocoded' | 'manual' }
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
  /** Geocoded coordinates from the address pick. Recovery locations are geocode-only (no manual
   *  entry — a DVR always has a street address). `accuracyM` is filled in by the store (0). */
  gps?: { lat: number; lng: number; source: 'geocoded' | 'manual' }
}

// ---- State ---------------------------------------------------------------
/** The in-progress time-offset capture, before `calculateOffset` commits it to a location. */
export interface CaptureState {
  dvrDateTime: string
  actualDateTime: string
  sync: SyncResult | null
  method: 'manual' | 'ocr'
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
   *  state from this (engine/content/explore.ts + selectExploreStatus). Session-only:
   *  a reload (or reset) starts the record over. Keyed by the recordable id space, not
   *  bare string, so registry typos are compile errors (review M1). */
  visited: Readonly<Partial<Record<AppView | ModalId, true>>>
}

export interface DemoActions {
  reset(): void
  createCase(input: NewCaseInput): string
  addLocation(caseId: string, input: NewLocationInput): string
  switchLocation(locationId: string): void
  updateField(path: string, value: unknown): void
  setView(view: AppView): void
  openModal(modal: ModalId): void
  closeModal(): void
  setDrawerOpen(open: boolean): void
  launch(screen: LaunchableId): void
  closeLaunch(): void
  calculateOffset(): void
  generateExtractedScopes(): void
  generateNotes(): void
  applyImport(patch: MappedImport): void
  addMedia(kind: MediaKind, item: MediaItem): void
  deleteMedia(kind: MediaKind, id: string): void
}

export type DemoStore = StoreApi<DemoState & DemoActions>

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
const isChapterId = (v: AppView): v is ChapterId =>
  v !== 'map' && !(LAUNCHABLE as readonly string[]).includes(v)

export function createDemoStore(): DemoStore {
  let seq = 0
  const nextId = (prefix: string) => `${prefix}${++seq}`

  return createStore<DemoState & DemoActions>((set, get) => ({
    ...initialState(),

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
      set((s) => ({ cases: [c, ...s.cases], currentCaseId: id }))
      return id
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
        gps: input.gps ? { ...input.gps, accuracyM: 0 } : undefined,
        form: blankLocationForm(),
      }
      set((s) => ({
        locations: [...s.locations, loc],
        cases: s.cases.map((c) => (c.id === caseId ? { ...c, locationIds: [...c.locationIds, id] } : c)),
        currentLocationId: id,
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
          const corrected = calculateCorrectedTimeRange(
            { startDateTime: sc.startDateTime, endDateTime: sc.endDateTime },
            off,
            sc.isActualTime,
          )
          extracted.push({
            id: nextId('es'),
            startDateTime: roundTo5Min(corrected.startDateTime, 'down'),
            endDateTime: roundTo5Min(corrected.endDateTime, 'up'),
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

    generateNotes: () => {
      const s = get()
      const id = s.currentLocationId
      if (!id) return
      const loc = s.locations.find((l) => l.id === id)
      if (!loc) return
      const caseObj = s.cases.find((c) => c.id === loc.caseId)
      const lines: string[] = [`Occurrence #: ${caseObj?.caseNumber ?? 'N/A'}`]
      const addr = [loc.businessName, loc.streetAddress, loc.city].filter(Boolean).join(', ')
      if (addr) lines.push(`Location: ${addr}`)
      if (loc.requesterName) lines.push(`Requested by: ${loc.requesterName}`)
      const off = loc.form.timeOffset
      if (off) {
        lines.push(
          `DVR time offset: ${
            off.isCorrect ? 'DVR time is correct' : `DVR is ${off.formattedDifference} ${off.direction} real time`
          }`,
        )
      }
      for (const sc of loc.form.scopes) {
        lines.push(
          `Requested scope: ${sc.startDateTime} → ${sc.endDateTime} (${sc.isActualTime ? 'real' : 'DVR'} time)${
            sc.cameras ? `, cameras ${sc.cameras}` : ''
          }`,
        )
      }
      const notesText = lines.join('\n')
      set((st) => ({
        locations: st.locations.map((l) =>
          l.id === id ? { ...l, form: { ...l.form, notesText, notesEdited: false } } : l,
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
