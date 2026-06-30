import { createStore, type StoreApi } from 'zustand/vanilla'

import type {
  ChapterId,
  DemoCase,
  DemoLocation,
  DemoMode,
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
import { SEED_CASE, SEED_LOCATION, blankLocationForm } from '@/features/demo/engine/content/seed'
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

export interface DemoState {
  mode: DemoMode
  profile: Profile
  cases: DemoCase[]
  locations: DemoLocation[]
  currentCaseId: string | null
  currentLocationId: string | null
  view: ChapterId | LaunchableId
  modal: ModalId | null
  drawerOpen: boolean
  /** The chapter the tour is on — set by chapter navigation (setView) and store resets
   *  (seedGuided/reset), but never by launch/closeLaunch. The director keys beat-play on this
   *  so a launch can't restart the beat. */
  currentChapter: ChapterId
  capture: CaptureState
  auth: 'idle' | 'authorized'
}

export interface DemoActions {
  seedGuided(): void
  reset(): void
  createCase(input: NewCaseInput): string
  addLocation(caseId: string, input: NewLocationInput): string
  switchLocation(locationId: string): void
  updateField(path: string, value: unknown): void
  setView(view: ChapterId | LaunchableId): void
  setMode(mode: DemoMode): void
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

export function initialState(): DemoState {
  return {
    mode: 'guided',
    profile: 'forensic',
    cases: [],
    locations: [],
    currentCaseId: null,
    currentLocationId: null,
    view: 'splash',
    modal: null,
    drawerOpen: false,
    currentChapter: 'splash',
    capture: blankCapture(),
    auth: 'idle',
  }
}

const clone = <T>(v: T): T => structuredClone(v)

/** True when a view value is a chapter (not a launch-only screen like OCR/media). */
const isChapterId = (v: ChapterId | LaunchableId): v is ChapterId =>
  !(LAUNCHABLE as readonly string[]).includes(v)

export function createDemoStore(): DemoStore {
  let seq = 0
  const nextId = (prefix: string) => `${prefix}${++seq}`

  return createStore<DemoState & DemoActions>((set, get) => ({
    ...initialState(),

    seedGuided: () =>
      set({
        ...initialState(),
        mode: 'guided',
        cases: [clone(SEED_CASE)],
        locations: [clone(SEED_LOCATION)],
        currentCaseId: SEED_CASE.id,
        currentLocationId: SEED_LOCATION.id,
        view: 'splash',
      }),

    reset: () =>
      set((s) => ({
        mode: 'sandbox',
        cases: s.cases.filter((c) => !c.isSeed),
        locations: s.locations.filter((l) => !l.isSeed),
        currentCaseId: null,
        currentLocationId: null,
        view: 'cases',
        modal: null,
        drawerOpen: false,
        currentChapter: 'cases',
        capture: blankCapture(),
      })),

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
        isSeed: false,
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
        isSeed: false,
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

    setView: (view) => set(isChapterId(view) ? { view, currentChapter: view } : { view }),
    setMode: (mode) => set({ mode }),
    openModal: (modal) => set({ modal }),
    closeModal: () => set({ modal: null }),
    setDrawerOpen: (open) => set({ drawerOpen: open }),

    launch: (screen) => set({ view: screen }),
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
