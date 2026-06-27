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
} from '@/lib/demo/types'
import { SEED_CASE, SEED_LOCATION, blankLocationForm } from '@/lib/demo/content/seed'
import { LAUNCHABLE } from '@/lib/demo/content/screens'
import {
  calculateCorrectedTimeRange,
  calculateTimeDifference,
  isDvrTimeCorrect,
  roundTo5Min,
} from '@/lib/demo/logic/time'
import type { MappedImport } from '@/lib/demo/logic/import'
import { mediaBucket, setPath } from '@/lib/demo/store/helpers'

// ---- Inputs --------------------------------------------------------------
export interface NewCaseInput {
  caseNumber: string
  displayName: string
  unit: string
  oicName?: string
  oicBadge?: string
  vcName?: string
  vcBadge?: string
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
  /** Where to return after closing a launch-only screen (OCR/media). */
  launchReturnView: ChapterId | null
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
    launchReturnView: null,
    capture: blankCapture(),
    auth: 'idle',
  }
}

const clone = <T>(v: T): T => structuredClone(v)

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
        launchReturnView: null,
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
        requesterPhone: input.requesterPhone ?? '',
        requesterEmail: input.requesterEmail ?? '',
        locationContact: input.locationContact ?? '',
        locationPhone: input.locationPhone ?? '',
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

    setView: (view) => set({ view }),
    setMode: (mode) => set({ mode }),
    openModal: (modal) => set({ modal }),
    closeModal: () => set({ modal: null }),
    setDrawerOpen: (open) => set({ drawerOpen: open }),

    launch: (screen) =>
      set((s) => ({
        launchReturnView: LAUNCHABLE.includes(s.view as LaunchableId)
          ? s.launchReturnView
          : (s.view as ChapterId),
        view: screen,
      })),
    closeLaunch: () => set((s) => ({ view: s.launchReturnView ?? 'submission', launchReturnView: null })),

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
      const off = loc.form.timeOffset
      const diff = {
        differenceMs: off.differenceMs,
        formattedDifference: off.formattedDifference,
        direction: off.direction,
        isDvrAhead: off.isDvrAhead,
      }
      const extracted: ScopeEntry[] = loc.form.scopes.map((sc) => {
        const corrected = calculateCorrectedTimeRange(
          { startDateTime: sc.startDateTime, endDateTime: sc.endDateTime },
          diff,
          sc.isActualTime,
        )
        return {
          id: nextId('es'),
          startDateTime: roundTo5Min(corrected.startDateTime, 'down'),
          endDateTime: roundTo5Min(corrected.endDateTime, 'up'),
          isActualTime: false,
          cameras: sc.cameras,
        }
      })
      set((st) => ({
        locations: st.locations.map((l) =>
          l.id === id ? { ...l, form: { ...l.form, extractedScopes: extracted } } : l,
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
