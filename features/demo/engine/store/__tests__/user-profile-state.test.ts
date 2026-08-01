import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { freshStore, newCaseInput } from './test-utils'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { DEFAULT_USER_PROFILE } from '@/features/demo/engine/logic/user-profile'
import {
  SAVE_DEBOUNCE_MS,
  SNAPSHOT_KEY,
  SNAPSHOT_VERSION,
  loadSnapshot,
  persistDemoStore,
  snapshotOf,
  type StorageLike,
} from '@/features/demo/engine/store/persistence'

/**
 * The analyst profile as STORE state (P7.2): the write action, and the v7 snapshot contract.
 *
 * The profile is the first thing this feature persists that is neither case data nor chrome, so
 * what is pinned here is the boundary: it survives a refresh, it is not reachable through the
 * location-scoped `updateField`, and a v6 snapshot (which cannot carry one) is discarded rather
 * than rehydrated half-formed.
 */

class FakeStorage implements StorageLike {
  map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

const FILLED = {
  name: 'K. Vasilyev',
  badgeNumber: '4471',
  timeInFieldStart: '2016-03-01 00:00:00',
  timeAtAgencyStart: '2019-11-04 00:00:00',
  currentAgency: 'Peel Regional Police',
  unitName: 'Forensic Video Unit',
  qualifications: 'Adobe certified; FVA member',
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('updateUserProfile', () => {
  it('boots empty — every field, no case data required', () => {
    expect(freshStore().getState().userProfile).toEqual(DEFAULT_USER_PROFILE)
  })

  it('shallow-merges a patch, leaving absent keys alone (phone updateProfile)', () => {
    const store = freshStore()
    store.getState().updateUserProfile({ name: 'K. Vasilyev', badgeNumber: '4471' })
    store.getState().updateUserProfile({ unitName: 'Forensic Video Unit' })

    expect(store.getState().userProfile).toEqual({
      ...DEFAULT_USER_PROFILE,
      name: 'K. Vasilyev',
      badgeNumber: '4471',
      unitName: 'Forensic Video Unit',
    })
  })

  it('writes a NEW object, so a subscriber actually sees the change', () => {
    const store = freshStore()
    const before = store.getState().userProfile
    store.getState().updateUserProfile({ name: 'K. Vasilyev' })
    expect(store.getState().userProfile).not.toBe(before)
  })

  it('needs no open location — the whole point of not routing it through updateField', () => {
    const store = freshStore()
    expect(store.getState().currentLocationId).toBeNull()
    store.getState().updateUserProfile({ name: 'K. Vasilyev' })
    expect(store.getState().userProfile.name).toBe('K. Vasilyev')
  })

  it('is not case data: it survives reset(), which wipes everything else', () => {
    const store = freshStore()
    store.getState().createCase(newCaseInput())
    store.getState().updateUserProfile(FILLED)

    store.getState().reset()

    expect(store.getState().cases).toEqual([])
    expect(store.getState().currentCaseId).toBeNull()
    // The phone cannot reset identity at all — it lives outside the case database.
    expect(store.getState().userProfile).toEqual(FILLED)
  })
})

describe('the profile in the v7 snapshot', () => {
  it('round-trips every field through a save + rehydrate [P7.2 fixture]', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    store.getState().updateUserProfile(FILLED)

    const handle = persistDemoStore(store, storage)
    store.getState().setDrawerOpen(false) // poke: schedule a save
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS)
    handle.dispose()

    const rehydrated = createDemoStore(loadSnapshot(storage) ?? undefined)
    expect(rehydrated.getState().userProfile).toEqual(FILLED)
  })

  it('is part of snapshotOf — the explicit pick carries it', () => {
    const store = freshStore()
    store.getState().updateUserProfile({ name: 'K. Vasilyev' })
    expect(snapshotOf(store.getState()).userProfile.name).toBe('K. Vasilyev')
  })

  it('discards a v6 snapshot rather than rehydrating a profile-less state', () => {
    // The version bump is what makes this discard attributable: `userProfile` is a REQUIRED
    // member, so a v6 payload fails the shape guard anyway — but as "corrupt snapshot", with no
    // clue why. Written as the pre-v7 envelope a real v6 tab would have left behind.
    const storage = new FakeStorage()
    const store = freshStore()
    const { userProfile: _dropped, ...v6State } = snapshotOf(store.getState())
    storage.map.set(SNAPSHOT_KEY, JSON.stringify({ version: 6, state: v6State }))

    expect(loadSnapshot(storage)).toBeNull()
    expect(storage.map.has(SNAPSHOT_KEY)).toBe(false) // and removed, not re-parsed every boot
  })

  it('refuses a v7 payload that lost the profile MEMBER outright', () => {
    // The symmetric case to P7.3's `delete parsed.state.formOverrides` (persistence.test.ts):
    // both v7 members are required, and a payload missing either is discarded, not defaulted.
    const storage = new FakeStorage()
    const store = freshStore()
    store.getState().updateUserProfile(FILLED)
    const state = snapshotOf(store.getState()) as unknown as Record<string, unknown>
    delete state.userProfile
    storage.map.set(SNAPSHOT_KEY, JSON.stringify({ version: SNAPSHOT_VERSION, state }))

    expect(loadSnapshot(storage)).toBeNull()
  })

  it('refuses a v7 payload whose profile lost a field (the shape guard, not just the version)', () => {
    const storage = new FakeStorage()
    const store = freshStore()
    store.getState().updateUserProfile(FILLED)
    const state = snapshotOf(store.getState()) as unknown as { userProfile: Record<string, unknown> }
    delete state.userProfile.qualifications
    storage.map.set(SNAPSHOT_KEY, JSON.stringify({ version: SNAPSHOT_VERSION, state }))

    expect(loadSnapshot(storage)).toBeNull()
  })

  it('keeps the profile when the selection integrity repair drops a dangling location', () => {
    // The repair path rebuilds the returned state field by field; a member left out of that
    // literal would vanish on exactly the boots that need repairing and nowhere else.
    const storage = new FakeStorage()
    const store = freshStore()
    store.getState().updateUserProfile(FILLED)
    const state = snapshotOf(store.getState()) as unknown as Record<string, unknown>
    state.currentLocationId = 'l-does-not-exist'
    state.view = 'dvrInfo'
    state.currentChapter = 'dvrInfo'
    storage.map.set(SNAPSHOT_KEY, JSON.stringify({ version: SNAPSHOT_VERSION, state }))

    const loaded = loadSnapshot(storage)
    expect(loaded?.currentLocationId).toBeNull() // the repair fired…
    expect(loaded?.view).toBe('cases')
    expect(loaded?.userProfile).toEqual(FILLED) // …and did not eat the profile
  })
})
