import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { freshStore, newCaseInput, newLocationInput } from './test-utils'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
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

  it('a throwing setItem is swallowed (quota) and later writes still try', () => {
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
    fail = false
    store.getState().setView('cases')
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(true)
    handle.dispose()
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
