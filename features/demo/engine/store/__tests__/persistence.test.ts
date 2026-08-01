import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { freshStore, newCaseInput, newLocationInput } from './test-utils'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { isMediaAvailable } from '@/features/demo/engine/logic/media/captured'
import {
  SAVE_DEBOUNCE_MS,
  SNAPSHOT_KEY,
  SNAPSHOT_VERSION,
  loadSnapshot,
  persistDemoStore,
  snapshotOf,
  type StorageLike,
} from '@/features/demo/engine/store/persistence'

/** In-memory StorageLike — tests never touch real sessionStorage. */
class FakeStorage implements StorageLike {
  map = new Map<string, string>()
  setCalls = 0
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.setCalls++
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

/** A store with a case + location and some real work done, ready to snapshot. */
function workedStore() {
  const store = freshStore()
  const caseId = store.getState().createCase(newCaseInput())
  store.getState().addLocation(caseId, newLocationInput())
  store.getState().updateField('form.dvr.dvrTypeBrand', 'Hikvision DS-7608')
  store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
  store.getState().setView('dvrInfo')
  return { store, caseId }
}

/** Persist `store` into `storage` and flush the debounce immediately. */
function saveNow(store: ReturnType<typeof freshStore>, storage: FakeStorage) {
  const handle = persistDemoStore(store, storage)
  store.getState().setDrawerOpen(store.getState().drawerOpen) // poke: schedule a save
  vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
  handle.dispose()
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('round-trip (refresh survival — G1/D2)', () => {
  it('a rehydrated store restores the visitor’s work, selection, and wizard position', () => {
    const storage = new FakeStorage()
    const { store, caseId } = workedStore()
    store.getState().completeCase(caseId)
    saveNow(store, storage)

    const snapshot = loadSnapshot(storage)
    expect(snapshot).not.toBeNull()
    const rehydrated = createDemoStore(snapshot ?? undefined)
    const s = rehydrated.getState()
    expect(s.cases).toEqual(store.getState().cases)
    expect(s.locations).toEqual(store.getState().locations)
    expect(s.currentCaseId).toBe(caseId)
    expect(s.currentLocationId).toBe(store.getState().currentLocationId)
    expect(s.view).toBe('dvrInfo')
    expect(s.currentChapter).toBe('dvrInfo')
    expect(s.capture.dvrDateTime).toBe('2025-03-08 12:05:30')
    expect(s.visited).toEqual(store.getState().visited)
    expect(s.cases[0]?.status).toBe('complete') // completeCase survives the refresh
  })

  it('ephemeral chrome (modal, drawerOpen) is NOT persisted — both boot fresh', () => {
    const storage = new FakeStorage()
    const { store } = workedStore()
    store.getState().openModal('newCase')
    store.getState().setDrawerOpen(true)
    saveNow(store, storage)

    const raw = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as { state?: Record<string, unknown> }
    expect(raw.state).not.toHaveProperty('modal')
    expect(raw.state).not.toHaveProperty('drawerOpen')

    const rehydrated = createDemoStore(loadSnapshot(storage) ?? undefined)
    expect(rehydrated.getState().modal).toBeNull()
    expect(rehydrated.getState().drawerOpen).toBe(false)
  })

  it('no action functions leak into the serialized snapshot', () => {
    const { store } = workedStore()
    const snap = snapshotOf(store.getState())
    for (const value of Object.values(snap)) {
      expect(typeof value).not.toBe('function')
    }
  })

  it('ids minted after rehydration never collide with restored ids', () => {
    const storage = new FakeStorage()
    const { store } = workedStore()
    saveNow(store, storage)

    const rehydrated = createDemoStore(loadSnapshot(storage) ?? undefined)
    const existing = new Set([
      ...rehydrated.getState().cases.map((c) => c.id),
      ...rehydrated.getState().locations.map((l) => l.id),
    ])
    const newCaseId = rehydrated.getState().createCase(newCaseInput({ caseNumber: 'POST-REFRESH' }))
    const newLocId = rehydrated.getState().addLocation(newCaseId, newLocationInput())
    expect(existing.has(newCaseId)).toBe(false)
    expect(existing.has(newLocId)).toBe(false)
  })

  it('a fresh tab (no snapshot) boots the empty sandbox', () => {
    expect(loadSnapshot(new FakeStorage())).toBeNull()
    expect(loadSnapshot(null)).toBeNull()
  })
})

describe('maximal round-trip (R-4b runtime pin)', () => {
  // Every optional in the persisted graph populated: DemoCase.incidentCoordinates,
  // DemoLocation.gps, CameraEntry.gps, MediaItem.poster/durationSec/sample, SyncResult's
  // four optionals, OcrProof.imageDataUrl, TimeOffsetData.ocr, capture.sync/ocr,
  // NoteSection.userAddendum (v3). The plain round-trip can't catch a silently-dropped
  // optional (newCaseInput fills 3 of 16 fields); this one fails on ANY dropped key.
  it('a state with every optional populated survives the round-trip in full', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    const caseId = store.getState().createCase({
      ...newCaseInput(),
      oicName: 'A. Okafor',
      oicBadge: '3318',
      vcName: 'M. Reyes',
      vcBadge: '5102',
      incidentBusinessName: 'Acme Mart',
      incidentStreetAddress: '5 King St',
      incidentCity: 'Brampton',
      incidentCoordinates: { lat: 43.6087, lng: -79.6505, source: 'geocoded' },
      notes: 'CCTV at rear',
    })
    store.getState().addLocation(caseId, {
      ...newLocationInput(),
      requesterName: 'L. McHugh',
      requesterBadge: '4471',
      requesterPhone: '905-555-0000',
      requesterEmail: 'lm@peel.ca',
      locationContact: 'S. Gill',
      locationPhone: '905-555-0001',
      gps: { lat: 43.61, lng: -79.65, source: 'manual' },
    })
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().updateField('capture.actualDateTime', '2025-03-08 12:00:00')
    store.getState().updateField('capture.method', 'ocr')
    store.getState().updateField('capture.dvrAppliesDST', true)
    store.getState().updateField('capture.sync', {
      method: 'NTP',
      server: 'time.nrc.ca',
      offsetMs: 12,
      uncertaintyMs: 4,
      rttMs: 18,
      traceability: 'NRC → stratum 2',
      timestamp: 1741456800000,
      stratum: 2,
    })
    store.getState().updateField('capture.ocr', {
      rawText: '2O25-O3-O8 12:O5:3O',
      cleanedText: '2025-03-08 12:05:30',
      parsedDateTime: '2025-03-08 12:05:30',
      confidence: 0.93,
      imageDataUrl: 'data:image/png;base64,AA==',
    })
    store.getState().calculateOffset() // commits sync + ocr (incl. imageDataUrl) into timeOffset
    store.getState().updateField('form.cameras', [
      {
        id: 'cam1',
        cameraName: 'Front door',
        resolution: '1080p',
        recordingFps: '15',
        // v5: the full five-key camera fix (P3.7) — `source`/`capturedAt` are required members,
        // so a schema that forgot either would drop them here and fail the whole-state diff.
        gps: { lat: 43.6, lng: -79.6, accuracyM: 4, source: 'gps', capturedAt: '2026-07-30T14:05:06.000Z' },
      },
    ])
    // Sectioned notes (v3): an edited section carrying the optional userAddendum,
    // plus the free-text tail — pins the deepest new optional through the round-trip.
    store.getState().reconcileNotes()
    store.getState().commitNoteSection('address', 'my own account of attendance')
    store.getState().commitNoteAddendum('address', 'manager was present')
    store.getState().commitNotesFreeText('additional observations')
    // v6: the media URLs here are BUNDLED SAMPLE paths, not `blob:` object URLs, precisely
    // so `url`/`poster` remain part of this maximal fixture. A live capture's blob URL is
    // deliberately stripped by `snapshotOf` — pinned separately below, so a regression there
    // can't hide behind this fixture's whole-state diff.
    store.getState().addMedia({
      id: 'm1',
      kind: 'photo',
      url: '/demo-media/sample-photo.jpg',
      poster: '/demo-media/sample-clip-poster.jpg',
      filename: 'IMG_1.jpg',
      caption: 'DVR rack',
      capturedAt: '2025-03-09 10:00:00',
      durationSec: 12,
      sample: true,
    })
    // v7 [P7.2 fixture addition]: the analyst profile, every field non-empty. It is a
    // top-level persisted member, so a schema or `snapshotOf` that forgot it fails the
    // whole-state diff below.
    store.getState().updateUserProfile({
      name: 'K. Vasilyev',
      badgeNumber: '4471',
      timeInFieldStart: '2016-03-01 00:00:00',
      timeAtAgencyStart: '2019-11-04 00:00:00',
      currentAgency: 'Peel Regional Police',
      unitName: 'Forensic Video Unit',
      qualifications: 'Adobe certified; FVA member',
    })
    // v7 (P7.3): a non-default form profile PLUS overrides in BOTH maps — the whole
    // `formOverrides` shape, so a schema that dropped either half fails the whole-state diff.
    // Applied AFTER the profile above: `applyFormProfile` clears the override maps, so the two
    // toggles must follow it or the fixture would persist an empty `formOverrides`.
    store.getState().applyFormProfile('canvas')
    store.getState().setFormFieldVisible('dvr.dvrUsername', false)
    store.getState().setFormStepVisible('arrivalDeparture', false)
    store.getState().completeCase(caseId)
    saveNow(store, storage)

    const rehydrated = createDemoStore(loadSnapshot(storage) ?? undefined)
    // The strongest pin: the FULL persisted subset must survive — any dropped key fails here.
    expect(snapshotOf(rehydrated.getState())).toEqual(snapshotOf(store.getState()))
    expect(rehydrated.getState().userProfile.qualifications).toBe('Adobe certified; FVA member')
    // Spot-check the deepest optionals (clearer failure messages than the whole-state diff).
    const loc = rehydrated.getState().locations[0]
    expect(loc.form.timeOffset?.ocr?.imageDataUrl).toBe('data:image/png;base64,AA==')
    expect(loc.form.timeOffset?.sync?.stratum).toBe(2)
    expect(loc.form.cameras[0].gps).toEqual({
      lat: 43.6,
      lng: -79.6,
      accuracyM: 4,
      source: 'gps',
      capturedAt: '2026-07-30T14:05:06.000Z',
    })
    expect(loc.form.media.photos[0].url).toBe('/demo-media/sample-photo.jpg')
    expect(loc.form.media.photos[0].poster).toBe('/demo-media/sample-clip-poster.jpg')
    const address = loc.form.notesSections.find((sec) => sec.id === 'address')
    expect(address?.content).toBe('my own account of attendance')
    expect(address?.userAddendum).toBe('manager was present')
    expect(address?.manuallyEdited).toBe(true)
    expect(address?.generatedContent).toContain('• Attended') // frozen baseline survives
    expect(loc.form.notesFreeText).toBe('additional observations')
    expect(rehydrated.getState().cases[0].incidentCoordinates).toEqual({ lat: 43.6087, lng: -79.6505, source: 'geocoded' })
    expect(rehydrated.getState().profile).toBe('canvas')
    expect(rehydrated.getState().formOverrides).toEqual({
      steps: { arrivalDeparture: false },
      fields: { 'dvr.dvrUsername': false },
    })
  })
})

describe('form-customization overrides (v7 — P7.3)', () => {
  it('drops override keys this build does not know instead of wiping the tab', () => {
    // The `visited` rule, applied to the two override maps: a settings preference from another
    // build is never worth a visitor's whole case. The KNOWN keys in the same blob survive.
    const storage = new FakeStorage()
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    store.getState().addLocation(caseId, newLocationInput())
    store.getState().setFormStepVisible('cameras', false)
    saveNow(store, storage)

    const parsed = JSON.parse(storage.getItem(SNAPSHOT_KEY)!)
    parsed.state.formOverrides.steps['someFutureStep'] = false
    parsed.state.formOverrides.fields['dvr.someFutureField'] = false
    parsed.state.formOverrides.fields['dvr.dvrUsername'] = false
    storage.setItem(SNAPSHOT_KEY, JSON.stringify(parsed))

    const loaded = loadSnapshot(storage)
    expect(loaded).not.toBeNull()
    expect(loaded!.cases).toHaveLength(1) // the case survived — no wipe
    expect(loaded!.formOverrides).toEqual({
      steps: { cameras: false },
      fields: { 'dvr.dvrUsername': false },
    })
  })

  it('discards a snapshot whose overrides are not booleans', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    saveNow(store, storage)
    const parsed = JSON.parse(storage.getItem(SNAPSHOT_KEY)!)
    parsed.state.formOverrides.steps['cameras'] = 'nope'
    storage.setItem(SNAPSHOT_KEY, JSON.stringify(parsed))
    expect(loadSnapshot(storage)).toBeNull()
  })

  it('discards a v6 snapshot outright — the key has no v6 form', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    saveNow(store, storage)
    const parsed = JSON.parse(storage.getItem(SNAPSHOT_KEY)!)
    delete parsed.state.formOverrides
    storage.setItem(SNAPSHOT_KEY, JSON.stringify(parsed))
    expect(loadSnapshot(storage)).toBeNull()
  })
})

describe('media bytes never persist (v6 — plan §5 P4.1 / D2)', () => {
  /** A store holding one live capture (blob URLs) and one bundled sample capture. */
  function storeWithMedia() {
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    store.getState().addLocation(caseId, newLocationInput())
    store.getState().addMedia({
      id: 'live',
      kind: 'photo',
      url: 'blob:http://localhost/live-photo',
      poster: 'blob:http://localhost/live-poster',
      filename: 'rack.jpg',
      caption: 'DVR rack',
      capturedAt: '2026-07-30 14:05:06',
    })
    store.getState().addMedia({
      id: 'sample',
      kind: 'video',
      url: '/demo-media/sample-clip.mp4',
      poster: '/demo-media/sample-clip-poster.jpg',
      filename: 'sample.mp4',
      caption: '',
      capturedAt: '2026-07-30 14:06:00',
      sample: true,
    })
    return store
  }

  it('strips a live capture down to its metadata — the snapshot never carries a blob URL', () => {
    const storage = new FakeStorage()
    saveNow(storeWithMedia(), storage)
    expect(storage.map.get(SNAPSHOT_KEY)).not.toContain('blob:')
  })

  it('rehydrates a live capture with no url, so it can render the honest expired notice', () => {
    const storage = new FakeStorage()
    saveNow(storeWithMedia(), storage)

    const photo = createDemoStore(loadSnapshot(storage) ?? undefined).getState().locations[0].form.media
      .photos[0]
    expect(photo.url).toBeUndefined()
    expect(photo.poster).toBeUndefined()
    // Everything the visitor typed survives — only the bytes are gone.
    expect(photo).toMatchObject({ id: 'live', filename: 'rack.jpg', caption: 'DVR rack' })
    expect(isMediaAvailable(photo)).toBe(false)
  })

  it('keeps a bundled sample capture intact — its URL is as valid after a refresh as before', () => {
    const storage = new FakeStorage()
    saveNow(storeWithMedia(), storage)

    const video = createDemoStore(loadSnapshot(storage) ?? undefined).getState().locations[0].form.media
      .videos[0]
    expect(video.url).toBe('/demo-media/sample-clip.mp4')
    expect(video.poster).toBe('/demo-media/sample-clip-poster.jpg')
    expect(isMediaAvailable(video)).toBe(true)
  })

  it('leaves the LIVE store untouched — stripping is a write-side concern only', () => {
    // The visitor is still looking at the photo they just took; only what goes into
    // sessionStorage is trimmed.
    const store = storeWithMedia()
    saveNow(store, new FakeStorage())
    expect(store.getState().locations[0].form.media.photos[0].url).toBe('blob:http://localhost/live-photo')
  })
})

describe('shape guard (never crash boot)', () => {
  const seeded = () => {
    const storage = new FakeStorage()
    const { store } = workedStore()
    saveNow(store, storage)
    return storage
  }

  it('corrupt JSON is discarded silently and removed', () => {
    const storage = seeded()
    storage.map.set(SNAPSHOT_KEY, '{not json!!')
    expect(loadSnapshot(storage)).toBeNull()
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(false)
  })

  it('a version mismatch is discarded and removed', () => {
    const storage = seeded()
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as { version: number }
    parsed.version = SNAPSHOT_VERSION + 1
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    expect(loadSnapshot(storage)).toBeNull()
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(false)
  })

  it('a shape mismatch (cases is not an array) is discarded and removed', () => {
    const storage = seeded()
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as { state: { cases: unknown } }
    parsed.state.cases = 'nope'
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    expect(loadSnapshot(storage)).toBeNull()
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(false)
  })

  it('a pre-v5 camera fix (no source/capturedAt) is rejected — which is why v5 bumped', () => {
    // The shape guard treats a partial camera fix as a foreign snapshot rather than
    // rehydrating a coordinate with no provenance and no capture time into a forensic form.
    // The version bump is what makes that discard attributable instead of mysterious.
    const storage = new FakeStorage()
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    store.getState().addLocation(caseId, newLocationInput())
    store.getState().updateField('form.cameras', [
      { id: 'cam1', cameraName: 'Front door', resolution: '', recordingFps: '' },
    ])
    saveNow(store, storage)

    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as {
      state: { locations: Array<{ form: { cameras: Array<Record<string, unknown>> } }> }
    }
    parsed.state.locations[0].form.cameras[0].gps = { lat: 43.6, lng: -79.6, accuracyM: 4 } // v4 shape
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))

    expect(loadSnapshot(storage)).toBeNull()
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(false)
  })

  it('an unknown view value is discarded (registry drift = different build)', () => {
    const storage = seeded()
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as { state: { view: string } }
    parsed.state.view = 'holodeck'
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    expect(loadSnapshot(storage)).toBeNull()
  })

  it('a throwing getItem yields null (boot empty, no crash)', () => {
    const storage = new FakeStorage()
    storage.getItem = () => {
      throw new Error('SecurityError')
    }
    expect(loadSnapshot(storage)).toBeNull()
  })

  it('a throwing removeItem during discard still yields null', () => {
    const storage = seeded()
    storage.map.set(SNAPSHOT_KEY, '{not json!!')
    storage.removeItem = () => {
      throw new Error('SecurityError')
    }
    expect(loadSnapshot(storage)).toBeNull()
  })

  it('unknown visited keys are dropped; known ones survive', () => {
    const storage = seeded()
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as {
      state: { visited: Record<string, true> }
    }
    parsed.state.visited = { cases: true, newCase: true, holodeck: true }
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    expect(loadSnapshot(storage)?.visited).toEqual({ cases: true, newCase: true })
  })

  it('the media-library modal id is REGISTERED, so its visit survives a rehydrate (P4.2)', () => {
    // Registry compliance, from the consumer's end: `MODAL_IDS` is `Record<ModalId, true>`, so
    // a missing entry is a compile error — but a compile-time device proves nothing about the
    // id the drawer's new row actually opens. An unregistered one would be dropped here
    // silently, exactly like `holodeck` above, and the exploration manifest would forget the
    // visitor ever opened the library.
    const storage = seeded()
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as {
      state: { visited: Record<string, true> }
    }
    parsed.state.visited = { mediaLibrary: true, holodeck: true }
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    expect(loadSnapshot(storage)?.visited).toEqual({ mediaLibrary: true })
  })

  it('Object.prototype key names in visited are dropped too — own-property guard, not `in` (R-7)', () => {
    const storage = seeded()
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as {
      state: { visited: Record<string, true> }
    }
    parsed.state.visited = { cases: true, toString: true, constructor: true, valueOf: true, hasOwnProperty: true } as const
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    expect(loadSnapshot(storage)?.visited).toEqual({ cases: true })
  })

  it('R-15: a dangling currentLocationId is dropped and a wizard view restores to cases, not a dead form', () => {
    const storage = new FakeStorage()
    const { store } = workedStore() // view/currentChapter: dvrInfo, with a real location
    saveNow(store, storage)
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as {
      state: { currentLocationId: string }
    }
    parsed.state.currentLocationId = 'ghost-location'
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    const snap = loadSnapshot(storage)
    expect(snap?.currentLocationId).toBeNull()
    expect(snap?.view).toBe('cases')
    expect(snap?.currentChapter).toBe('cases')
    expect(snap?.cases).toHaveLength(1) // the DATA survives — only the selection is repaired
    expect(snap?.locations).toHaveLength(1)
  })

  it('R-32: with a live location, a dangling currentCaseId is REPAIRED to the location\'s owner (not just dropped)', () => {
    const storage = new FakeStorage()
    const { store, caseId } = workedStore()
    store.getState().setView('cases')
    saveNow(store, storage)
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as {
      state: { currentCaseId: string }
    }
    parsed.state.currentCaseId = 'ghost-case'
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    const snap = loadSnapshot(storage)
    // R-19's law at the rehydration boundary: the open location owns the case. The old
    // pin here (null) blessed an OCC-less Completion header for a perfectly live location.
    expect(snap?.currentCaseId).toBe(caseId)
    expect(snap?.view).toBe('cases')
  })

  it('R-32: a snapshot pairing case B with case A\'s location rehydrates with A owning the selection', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    const caseA = store.getState().createCase(newCaseInput({ caseNumber: 'A' }))
    const locA = store.getState().addLocation(caseA, newLocationInput())
    const caseB = store.getState().createCase(newCaseInput({ caseNumber: 'B' }))
    store.getState().switchLocation(locA) // coherent at save time
    saveNow(store, storage)
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as {
      state: { currentCaseId: string }
    }
    parsed.state.currentCaseId = caseB // hand-tampered cross-case pair
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    const snap = loadSnapshot(storage)
    expect(snap?.currentLocationId).toBe(locA)
    expect(snap?.currentCaseId).toBe(caseA) // derived from the location — B never gets A's data under its OCC number
  })

  it('R-9: an ORPHANED open location (caseId resolving to no case) drops entirely — coherent pair or empty, never half-live', () => {
    const storage = new FakeStorage()
    const { store } = workedStore() // view/currentChapter: dvrInfo, one case + one location
    saveNow(store, storage)
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as {
      state: { locations: Array<{ caseId: string }> }
    }
    parsed.state.locations[0].caseId = 'ghost-case' // orphan the open location
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    const snap = loadSnapshot(storage)
    // Half-live rehydration ('—' OCC header, Complete & Save stamping a location while
    // greening nothing) must be impossible: the orphaned location drops and the wizard
    // falls back. The snapshot's own currentCaseId still resolves, so the fallback branch
    // keeps it — a case-only selection is a legal store state (createCase produces it).
    expect(snap?.currentLocationId).toBeNull()
    expect(snap?.currentCaseId).toBe(store.getState().currentCaseId)
    expect(snap?.view).toBe('cases')
    expect(snap?.currentChapter).toBe('cases')
    expect(snap?.locations).toHaveLength(1) // the DATA still survives — only the selection is repaired
  })

  it('R-32: with NO live location, a dangling currentCaseId still drops to null', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    store.getState().createCase(newCaseInput())
    saveNow(store, storage)
    const parsed = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as {
      state: { currentCaseId: string }
    }
    parsed.state.currentCaseId = 'ghost-case'
    storage.map.set(SNAPSHOT_KEY, JSON.stringify(parsed))
    expect(loadSnapshot(storage)?.currentCaseId).toBeNull()
  })

  it('R-15: a wizard view persisted with NO location at all (rail-jump) restores to cases', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    store.getState().setView('completion') // reachable via rail-jump with nothing open
    saveNow(store, storage)
    const snap = loadSnapshot(storage)
    expect(snap?.currentLocationId).toBeNull()
    expect(snap?.view).toBe('cases')
    expect(snap?.currentChapter).toBe('cases')
  })

  it('R-15: a valid selection passes through untouched', () => {
    const storage = new FakeStorage()
    const { store } = workedStore()
    saveNow(store, storage)
    const snap = loadSnapshot(storage)
    expect(snap?.currentLocationId).toBe(store.getState().currentLocationId)
    expect(snap?.currentCaseId).toBe(store.getState().currentCaseId)
    expect(snap?.view).toBe('dvrInfo')
  })

  it('a launch-only view restores to currentChapter (launch screens depend on ephemeral UI state)', () => {
    const storage = new FakeStorage()
    const { store } = workedStore()
    store.getState().setView('timeOffset')
    store.getState().launch('ocr')
    saveNow(store, storage)
    const snapshot = loadSnapshot(storage)
    expect(snapshot?.view).toBe('timeOffset')
    expect(snapshot?.currentChapter).toBe('timeOffset')
  })

  it('the map tab view restores as-is (its picker has a coherent empty state)', () => {
    const storage = new FakeStorage()
    const { store } = workedStore()
    store.getState().setView('map')
    saveNow(store, storage)
    expect(loadSnapshot(storage)?.view).toBe('map')
  })
})

describe('debounced save', () => {
  it('rapid changes collapse into one write after the debounce window', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    const handle = persistDemoStore(store, storage)
    store.getState().createCase(newCaseInput())
    store.getState().setView('dashboard')
    store.getState().setView('cases')
    expect(storage.setCalls).toBe(0) // nothing until the debounce elapses
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS - 1)
    expect(storage.setCalls).toBe(0)
    vi.advanceTimersByTime(1)
    expect(storage.setCalls).toBe(1)
    handle.dispose()
  })

  it('each change resets the debounce timer (trailing edge)', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    const handle = persistDemoStore(store, storage)
    store.getState().setView('dashboard')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS - 50)
    store.getState().setView('cases') // resets the window
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS - 50)
    expect(storage.setCalls).toBe(0)
    vi.advanceTimersByTime(50)
    expect(storage.setCalls).toBe(1)
    // the write reflects the LAST state
    const raw = JSON.parse(storage.map.get(SNAPSHOT_KEY) ?? '{}') as { state: { view: string } }
    expect(raw.state.view).toBe('cases')
    handle.dispose()
  })

  it('flush() writes a pending snapshot immediately; without pending it is a no-op', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    const handle = persistDemoStore(store, storage)
    handle.flush() // nothing pending — no write
    expect(storage.setCalls).toBe(0)
    store.getState().setView('dashboard')
    handle.flush() // pending — immediate write, no debounce wait
    expect(storage.setCalls).toBe(1)
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS * 2) // the cancelled timer must not double-write
    expect(storage.setCalls).toBe(1)
    handle.dispose()
  })

  it('dispose() flushes the pending write and unsubscribes', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    const handle = persistDemoStore(store, storage)
    store.getState().setView('dashboard')
    handle.dispose()
    expect(storage.setCalls).toBe(1) // flushed on dispose
    store.getState().setView('cases') // unsubscribed — no new schedule
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS * 2)
    expect(storage.setCalls).toBe(1)
  })

  it('a throwing setItem is swallowed (quota), breadcrumbed, and later writes still try', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const storage = new FakeStorage()
    let fail = true
    const realSet = storage.setItem.bind(storage)
    storage.setItem = (k, v) => {
      if (fail) throw new Error('QuotaExceededError')
      realSet(k, v)
    }
    const store = freshStore()
    const handle = persistDemoStore(store, storage)
    store.getState().setView('dashboard')
    expect(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)).not.toThrow()
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(false)
    // R-26: the breadcrumb carries the CAUSE — quota vs blocked must be distinguishable.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('snapshot write failed'),
      expect.objectContaining({ message: 'QuotaExceededError' }),
    )
    fail = false
    store.getState().setView('cases')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(true)
    handle.dispose()
    warn.mockRestore()
  })

  it('a failed write CLEARS the previous snapshot — a refresh boots empty, never restores stale work (R-14)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const storage = new FakeStorage()
    const { store } = workedStore()
    saveNow(store, storage) // a valid snapshot is in place
    expect(loadSnapshot(storage)).not.toBeNull()

    // Re-seed (loadSnapshot's success path doesn't consume it) and break the NEXT write.
    saveNow(store, storage)
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    const handle = persistDemoStore(store, storage)
    store.getState().updateField('form.dvr.dvrLocation', 'newer work the write lost')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    handle.dispose()

    // The stale (pre-edit) snapshot must NOT survive to be silently restored as current.
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(false)
    expect(loadSnapshot(storage)).toBeNull()
    warn.mockRestore()
  })

  it('a throwing removeItem during the write-failure cleanup is still swallowed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const storage = new FakeStorage()
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    storage.removeItem = () => {
      throw new Error('SecurityError')
    }
    const store = freshStore()
    const handle = persistDemoStore(store, storage)
    store.getState().setView('dashboard')
    expect(() => vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)).not.toThrow()
    handle.dispose()
    warn.mockRestore()
  })
})

describe('kill switch + disabled paths', () => {
  it('enabled:false disables saving (no subscription, no writes; handle is inert)', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    const handle = persistDemoStore(store, storage, { enabled: false })
    store.getState().createCase(newCaseInput())
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS * 2)
    expect(storage.setCalls).toBe(0)
    expect(() => {
      handle.flush()
      handle.dispose()
    }).not.toThrow()
  })

  it('enabled:false disables loading even when a valid snapshot exists', () => {
    const storage = new FakeStorage()
    const { store } = workedStore()
    saveNow(store, storage)
    expect(loadSnapshot(storage)).not.toBeNull() // sanity: snapshot is valid
    expect(loadSnapshot(storage, { enabled: false })).toBeNull()
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(true) // disabled load does NOT destroy data
  })

  it('a null storage backend disables persistence in both directions', () => {
    const store = freshStore()
    const handle = persistDemoStore(store, null)
    store.getState().setView('dashboard')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(() => handle.dispose()).not.toThrow()
    expect(loadSnapshot(null)).toBeNull()
  })
})

describe('isLive — the handle’s honesty signal (R-2)', () => {
  it('is false for a null backend: the NOOP handle must never claim to be storing anything', () => {
    const store = freshStore()
    const handle = persistDemoStore(store, null)
    expect(handle.isLive()).toBe(false)
    handle.dispose()
  })

  it('is false when persistence is switched off, even with a working backend', () => {
    const storage = new FakeStorage()
    const handle = persistDemoStore(freshStore(), storage, { enabled: false })
    expect(handle.isLive()).toBe(false)
    handle.dispose()
  })

  it('is true once a write has actually landed', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    const handle = persistDemoStore(store, storage)
    store.getState().setView('dashboard')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(true)
    expect(handle.isLive()).toBe(true)
    handle.dispose()
  })

  it('goes false the moment a write fails and the snapshot is cleared — the refresh promise is void', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const storage = new FakeStorage()
    const store = freshStore()
    const handle = persistDemoStore(store, storage)
    store.getState().setView('dashboard')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(handle.isLive()).toBe(true)

    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    store.getState().setView('cases')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)

    expect(storage.map.has(SNAPSHOT_KEY)).toBe(false) // cleared, per R-14
    expect(handle.isLive()).toBe(false) // …and the handle says so
    handle.dispose()
    warn.mockRestore()
  })

  it('recovers to true when a later write succeeds — the signal tracks reality, not a latch', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const storage = new FakeStorage()
    let fail = true
    const realSet = storage.setItem.bind(storage)
    storage.setItem = (k, v) => {
      if (fail) throw new Error('QuotaExceededError')
      realSet(k, v)
    }
    const store = freshStore()
    const handle = persistDemoStore(store, storage)
    store.getState().setView('dashboard')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(handle.isLive()).toBe(false)

    fail = false
    store.getState().setView('cases')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(handle.isLive()).toBe(true)
    handle.dispose()
    warn.mockRestore()
  })
})

/**
 * P4.2 / matrix row 80 — `saveState()` is the same fact `isLive()` reports, carrying WHY.
 * The drawer's status line needs the reason: `isLive()` collapses "never wired", "nothing
 * written yet" and "the write failed" into one `false`, and those want three different
 * sentences. `isLive()` is DERIVED from this, so the two can never disagree.
 */
describe('saveState — the reason behind isLive (row 80)', () => {
  it('is `unavailable` for the NOOP handle: never wired, so nothing was ever pending', () => {
    const handle = persistDemoStore(freshStore(), null)
    expect(handle.saveState()).toEqual({ kind: 'unavailable' })
    expect(handle.isLive()).toBe(false)
    handle.dispose()
  })

  it('is `pending` on a wired handle before the first write lands — NOT `unavailable`', () => {
    // The distinction this method exists for: a visitor who has not typed yet must not be
    // told their browser isn't storing the session.
    const handle = persistDemoStore(freshStore(), new FakeStorage())
    expect(handle.saveState()).toEqual({ kind: 'pending' })
    expect(handle.isLive()).toBe(false)
    handle.dispose()
  })

  it('is `saved` with the injected write timestamp once a write lands', () => {
    const store = freshStore()
    const handle = persistDemoStore(store, new FakeStorage(), { now: () => 1_700_000_000_000 })
    store.getState().setView('dashboard')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(handle.saveState()).toEqual({ kind: 'saved', at: 1_700_000_000_000 })
    expect(handle.isLive()).toBe(true)
    handle.dispose()
  })

  it('re-stamps `at` on every landed write, so recency tracks the LAST save', () => {
    let t = 1_000
    const store = freshStore()
    const handle = persistDemoStore(store, new FakeStorage(), { now: () => t })
    store.getState().setView('dashboard')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(handle.saveState()).toEqual({ kind: 'saved', at: 1_000 })

    t = 61_000
    store.getState().setView('cases')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(handle.saveState()).toEqual({ kind: 'saved', at: 61_000 })
    handle.dispose()
  })

  it('is `failed` — not `unavailable` — when a write throws and the snapshot is cleared', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const storage = new FakeStorage()
    const store = freshStore()
    const handle = persistDemoStore(store, storage)
    store.getState().setView('dashboard')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(handle.saveState().kind).toBe('saved')

    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    store.getState().setView('cases')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)

    expect(handle.saveState()).toEqual({ kind: 'failed' })
    expect(handle.isLive()).toBe(false)
    handle.dispose()
    warn.mockRestore()
  })

  it('defaults its clock to the host when no `now` is injected', () => {
    const store = freshStore()
    const handle = persistDemoStore(store, new FakeStorage())
    const before = Date.now()
    store.getState().setView('dashboard')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    const state = handle.saveState()
    expect(state.kind).toBe('saved')
    // Fake timers move Date.now() with the clock, so the stamp is the host time AT THE WRITE
    // (one debounce after the change) — not the wiring time, and not a hard-coded constant.
    if (state.kind === 'saved') {
      expect(state.at).toBe(Date.now())
      expect(state.at).toBe(before + SAVE_DEBOUNCE_MS)
    }
    handle.dispose()
  })
})
