import { describe, it, expect } from 'vitest'
import { freshStore, newCaseInput, newLocationInput } from './test-utils'
import { createDemoStore, type CaseEdits } from '@/features/demo/engine/store/create-store'
import {
  SNAPSHOT_VERSION,
  loadSnapshot,
  snapshotOf,
  type StorageLike,
} from '@/features/demo/engine/store/persistence'

/**
 * P3.1 — case/location CRUD (matrix rows 10 CRUD, 15).
 *
 * The load-bearing behaviour here is SELECTION REPAIR: every delete can strand the
 * `currentCaseId`/`currentLocationId` pair, and the R-19 law ("the open location OWNS the
 * case") has to hold after the write, not just before it. Each arm below is one way the pair
 * can be stranded.
 */

/** Two cases: A with two locations, B with one. Nothing selected beyond what the actions set. */
function twoCases() {
  const store = freshStore()
  const a = store.getState().createCase(newCaseInput({ caseNumber: 'PR25-A' }))
  const a1 = store.getState().addLocation(a, newLocationInput({ locationName: 'A1' }))
  const a2 = store.getState().addLocation(a, newLocationInput({ locationName: 'A2' }))
  const b = store.getState().createCase(newCaseInput({ caseNumber: 'PR25-B' }))
  const b1 = store.getState().addLocation(b, newLocationInput({ locationName: 'B1' }))
  return { store, a, a1, a2, b, b1 }
}

/** A complete edit payload. `CaseEdits` is TOTAL (see its doc): the edit form always submits
 *  every editable field, so a partial literal is a type error, not a partial write. */
function caseEdits(over: Partial<CaseEdits> = {}): CaseEdits {
  const { caseNumber: _caseNumber, ...rest } = newCaseInput()
  return { ...rest, ...over }
}

// ---- updateCase ------------------------------------------------------------

describe('updateCase', () => {
  it('patches the named case only, leaving siblings untouched', () => {
    const { store, a, b } = twoCases()
    store.getState().updateCase(
      a,
      caseEdits({
        displayName: 'Kim’s — B&E (amended)',
        unit: 'Major Crime',
        oicName: 'A. Okafor',
        oicBadge: '3318',
        incidentCity: 'Brampton',
        notes: 'Second DVR found in the back office',
      }),
    )
    const [, updated] = [0, store.getState().cases.find((c) => c.id === a)!]
    expect(updated.displayName).toBe('Kim’s — B&E (amended)')
    expect(updated.unit).toBe('Major Crime')
    expect(updated.oicName).toBe('A. Okafor')
    expect(updated.incidentCity).toBe('Brampton')
    expect(updated.notes).toBe('Second DVR found in the back office')
    expect(store.getState().cases.find((c) => c.id === b)!.displayName).toBe("Kim's Convenience — B&E")
  })

  it('leaves the case number, status and location links alone', () => {
    const { store, a } = twoCases()
    store.getState().setCaseStatus(a, 'archived')
    store.getState().updateCase(a, caseEdits({ displayName: 'renamed' }))
    const c = store.getState().cases.find((x) => x.id === a)!
    expect(c.caseNumber).toBe('PR25-A') // immutable after create (phone: editable={!isEdit})
    expect(c.status).toBe('archived') // only the status actions move this
    expect(c.locationIds).toHaveLength(2)
  })

  it('is a true no-op for an unknown id (no new state object, no subscriber wake)', () => {
    const { store } = twoCases()
    const before = store.getState()
    store.getState().updateCase('c-nope', caseEdits({ displayName: 'x' }))
    expect(store.getState()).toBe(before)
  })

  it('the edit payload cannot reach a case invariant', () => {
    // A COMPILE-TIME pin (`tsc --noEmit` is the gate that reads it): each `@ts-expect-error`
    // fails the typecheck the moment `CaseEdits` stops rejecting that key. Deliberately a type
    // probe rather than a store call — the writer spreads onto the record and would happily
    // write any of these at runtime, which is exactly why the door is closed in the TYPE.
    // Each literal spreads a VALID base so the only thing TS can object to is the extra key.
    const probe = (edits: CaseEdits) => edits
    const base = caseEdits()
    // @ts-expect-error caseNumber is immutable after create — CaseEdits omits it.
    probe({ ...base, caseNumber: 'PR25-RENAMED' })
    // @ts-expect-error status belongs to completeCase / setCaseStatus.
    probe({ ...base, status: 'archived' })
    // @ts-expect-error locationIds is derived bookkeeping (addLocation/deleteLocation).
    probe({ ...base, locationIds: [] })
    // @ts-expect-error id is identity.
    probe({ ...base, id: 'c9' })
    expect(probe(caseEdits({ displayName: 'ok' })).displayName).toBe('ok')
  })
})

// ---- archive / reopen ------------------------------------------------------

/**
 * P3.1 shipped `archiveCase`/`reopenCase`; P3.2 shipped `setCaseStatus(caseId, status)`. The P3
 * assembly kept ONE (see the note on `setCaseStatus`) — these arms are P3.1's semantics carried
 * over onto the survivor, so nothing this package pinned went out with the wrappers.
 */
describe('setCaseStatus — the archive / reopen semantics P3.1 pinned', () => {
  it('archives, then reopens to draft (phone reopenCase → CaseStatus.DRAFT)', () => {
    const { store, a } = twoCases()
    store.getState().setCaseStatus(a, 'archived')
    expect(store.getState().cases.find((c) => c.id === a)!.status).toBe('archived')
    store.getState().setCaseStatus(a, 'draft')
    expect(store.getState().cases.find((c) => c.id === a)!.status).toBe('draft')
  })

  it('reopens a COMPLETE case to draft (it does not restore a pre-archive status)', () => {
    const { store, a, a1 } = twoCases()
    store.getState().switchLocation(a1)
    store.getState().completeCase(a)
    expect(store.getState().cases.find((c) => c.id === a)!.status).toBe('complete')
    store.getState().setCaseStatus(a, 'draft')
    expect(store.getState().cases.find((c) => c.id === a)!.status).toBe('draft')
  })

  it('no-ops when the status is already there, and for an unknown id', () => {
    const { store, a } = twoCases()
    const draftState = store.getState()
    store.getState().setCaseStatus(a, 'draft') // already draft
    store.getState().setCaseStatus('c-nope', 'archived')
    store.getState().setCaseStatus('c-nope', 'draft')
    expect(store.getState()).toBe(draftState)
    store.getState().setCaseStatus(a, 'archived')
    const archived = store.getState()
    store.getState().setCaseStatus(a, 'archived')
    expect(store.getState()).toBe(archived)
  })

  it('does not touch the locations or the selection', () => {
    const { store, a, a1 } = twoCases()
    store.getState().switchLocation(a1)
    store.getState().setCaseStatus(a, 'archived')
    const s = store.getState()
    expect(s.locations).toHaveLength(3)
    expect(s.currentLocationId).toBe(a1)
    expect(s.currentCaseId).toBe(a)
  })
})

// ---- deleteCase ------------------------------------------------------------

describe('deleteCase', () => {
  it('removes the case and cascades to every location under it', () => {
    const { store, a, b, b1 } = twoCases()
    store.getState().deleteCase(a)
    const s = store.getState()
    expect(s.cases.map((c) => c.id)).toEqual([b])
    expect(s.locations.map((l) => l.id)).toEqual([b1])
  })

  it('repairs the pair when the OPEN location belonged to the deleted case', () => {
    const { store, a, a2 } = twoCases()
    store.getState().switchLocation(a2)
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().deleteCase(a)
    const s = store.getState()
    expect(s.currentLocationId).toBeNull()
    expect(s.currentCaseId).toBeNull()
    // capture is the OPEN location's in-progress calibration — it goes with it.
    expect(s.capture.dvrDateTime).toBe('')
  })

  it('leaves an open location in ANOTHER case alone, and re-derives its case', () => {
    const { store, a, b, b1 } = twoCases()
    store.getState().switchLocation(b1)
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().deleteCase(a)
    const s = store.getState()
    expect(s.currentLocationId).toBe(b1)
    expect(s.currentCaseId).toBe(b) // R-19: derived from the surviving open location
    expect(s.capture.dvrDateTime).toBe('2025-03-08 12:05:30') // untouched — its location lives
  })

  it('clears a case-only selection (no location open) when that case is deleted', () => {
    const { store } = twoCases()
    // createCase leaves the pair as { case: <new>, location: null } — the one legitimate
    // half-selected state (R-19 permits a selected case with nothing open).
    const c = store.getState().createCase(newCaseInput({ caseNumber: 'PR25-C' }))
    expect(store.getState().currentLocationId).toBeNull()
    expect(store.getState().currentCaseId).toBe(c)
    store.getState().deleteCase(c)
    expect(store.getState().currentCaseId).toBeNull()
    expect(store.getState().currentLocationId).toBeNull()
  })

  it('leaves an unrelated case-only selection alone', () => {
    const { store, a } = twoCases()
    const c = store.getState().createCase(newCaseInput({ caseNumber: 'PR25-C' }))
    store.getState().deleteCase(a)
    expect(store.getState().currentCaseId).toBe(c)
  })

  it('is a true no-op for an unknown id', () => {
    const { store } = twoCases()
    const before = store.getState()
    store.getState().deleteCase('c-nope')
    expect(store.getState()).toBe(before)
  })
})

// ---- deleteLocation --------------------------------------------------------

describe('deleteLocation', () => {
  it('removes the location and unlinks it from its case', () => {
    const { store, a, a1, a2 } = twoCases()
    store.getState().deleteLocation(a1)
    const s = store.getState()
    expect(s.locations.map((l) => l.id)).not.toContain(a1)
    expect(s.cases.find((c) => c.id === a)!.locationIds).toEqual([a2])
  })

  it('clears the location half but KEEPS the case when the open location is deleted', () => {
    const { store, a, a1 } = twoCases()
    store.getState().switchLocation(a1)
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().deleteLocation(a1)
    const s = store.getState()
    expect(s.currentLocationId).toBeNull()
    expect(s.currentCaseId).toBe(a) // the case survives — "case selected, no location open"
    expect(s.capture.dvrDateTime).toBe('')
  })

  it('leaves the selection and the capture alone when another location is deleted', () => {
    const { store, a, a1, a2 } = twoCases()
    store.getState().switchLocation(a1)
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().deleteLocation(a2)
    const s = store.getState()
    expect(s.currentLocationId).toBe(a1)
    expect(s.currentCaseId).toBe(a)
    expect(s.capture.dvrDateTime).toBe('2025-03-08 12:05:30')
  })

  it('does not leak the deleted location’s DVR reading into the next location created', () => {
    // addLocation (unlike switchLocation) does NOT blank the capture, so without the reset in
    // deleteLocation the Time-Offset screen would open pre-filled with a dead DVR's clock.
    const { store, a, a1 } = twoCases()
    store.getState().switchLocation(a1)
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().deleteLocation(a1)
    store.getState().addLocation(a, newLocationInput({ locationName: 'A3' }))
    expect(store.getState().capture.dvrDateTime).toBe('')
  })

  it('is a true no-op for an unknown id', () => {
    const { store } = twoCases()
    const before = store.getState()
    store.getState().deleteLocation('l-nope')
    expect(store.getState()).toBe(before)
  })
})

// ---- persistence -----------------------------------------------------------

describe('persisted shape (P3.1 adds no new PersistedState field)', () => {
  /** Snapshot → JSON → loadSnapshot, through the same envelope the app writes. */
  function roundTrip(store: ReturnType<typeof freshStore>) {
    const raw = JSON.stringify({ version: SNAPSHOT_VERSION, state: snapshotOf(store.getState()) })
    const storage: StorageLike = {
      getItem: () => raw,
      setItem: () => undefined,
      removeItem: () => undefined,
    }
    return loadSnapshot(storage)
  }

  it('an archived case and a post-delete selection round-trip at the CURRENT version', () => {
    // This is the evidence that P3.1 needs no SNAPSHOT_VERSION bump: 'archived' was already a
    // CASE_STATUSES member, and deleting only removes values — no key is added, removed, or
    // widened. If a future CRUD change does move the shape, this test fails at the guard.
    const { store, a, a1, b, b1 } = twoCases()
    store.getState().switchLocation(a1)
    store.getState().setCaseStatus(b, 'archived')
    store.getState().deleteCase(a) // clears the pair; leaves the archived case behind

    const restored = roundTrip(store)
    expect(restored).not.toBeNull()
    expect(restored!.cases).toHaveLength(1)
    expect(restored!.cases[0].status).toBe('archived')
    expect(restored!.locations.map((l) => l.id)).toEqual([b1]) // case B's location survives
    expect(restored!.currentCaseId).toBeNull()
    expect(restored!.currentLocationId).toBeNull()

    // …and rehydrating it produces a store that behaves (ids keep counting past the survivors).
    const rehydrated = createDemoStore(restored!)
    const fresh = rehydrated.getState().createCase(newCaseInput({ caseNumber: 'PR25-C' }))
    expect(rehydrated.getState().cases.some((c) => c.id === fresh)).toBe(true)
    expect(fresh).not.toBe(b)
  })

  it('a snapshot taken with the open location deleted restores to the Cases screen', () => {
    // loadSnapshot's own repair (R-15) and deleteLocation's agree: no open location means no
    // wizard screen. The store clears the pair in-session; the snapshot then can't restore a
    // dead form even if the visitor was mid-wizard when they deleted.
    const { store, a1 } = twoCases()
    store.getState().switchLocation(a1)
    store.getState().setView('dvrInfo')
    store.getState().deleteLocation(a1)

    const restored = roundTrip(store)
    expect(restored!.currentLocationId).toBeNull()
    expect(restored!.view).toBe('cases')
    expect(restored!.currentChapter).toBe('cases')
  })
})
