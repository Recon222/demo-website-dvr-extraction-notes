import { describe, it, expect } from 'vitest'
import type { CaseEdits } from '@/features/demo/engine/store/create-store'
import { freshStore, newCaseInput, newLocationInput } from '@/features/demo/engine/store/__tests__/test-utils'

/**
 * P3.3 / matrix row 12 — `updateCase`, the write half of the New Case sheet's edit mode.
 * The case number is absent from `CaseEdits` by construction, so its immutability is a type
 * error rather than a convention (see the type's doc comment).
 */
const edits = (o: Partial<CaseEdits> = {}): CaseEdits => ({
  displayName: 'Renamed',
  unit: 'Homicide',
  ...o,
})

describe('updateCase', () => {
  it('overwrites the editable fields', () => {
    const store = freshStore()
    const id = store.getState().createCase(newCaseInput())
    store.getState().updateCase(
      id,
      edits({ oicName: 'Sgt. Vance', oicBadge: '9001', incidentCity: 'Brampton', notes: 'reopened' }),
    )
    const c = store.getState().cases.find((x) => x.id === id)
    expect(c).toMatchObject({
      displayName: 'Renamed',
      unit: 'Homicide',
      oicName: 'Sgt. Vance',
      oicBadge: '9001',
      incidentCity: 'Brampton',
      notes: 'reopened',
    })
  })

  it('never changes the case number, status, creation label or locations', () => {
    const store = freshStore()
    const id = store.getState().createCase(newCaseInput({ caseNumber: 'PR25-1' }))
    store.getState().addLocation(id, newLocationInput())
    const before = store.getState().cases.find((x) => x.id === id)!
    store.getState().updateCase(id, edits())
    const after = store.getState().cases.find((x) => x.id === id)!
    expect(after.caseNumber).toBe('PR25-1')
    expect(after.status).toBe(before.status)
    expect(after.createdLabel).toBe(before.createdLabel)
    expect(after.locationIds).toEqual(before.locationIds)
  })

  it('blanks omitted optional fields rather than leaving stale values behind', () => {
    const store = freshStore()
    const id = store.getState().createCase(newCaseInput({ oicName: 'Det. McHugh', notes: 'first pass' }))
    store.getState().updateCase(id, edits()) // no oicName, no notes
    const c = store.getState().cases.find((x) => x.id === id)
    expect(c?.oicName).toBe('')
    expect(c?.notes).toBe('')
  })

  it('clears incident coordinates when the edit carries none', () => {
    const store = freshStore()
    const id = store
      .getState()
      .createCase(newCaseInput({ incidentCoordinates: { lat: 43.6, lng: -79.6, source: 'geocoded' } }))
    store.getState().updateCase(id, edits())
    expect(store.getState().cases.find((x) => x.id === id)?.incidentCoordinates).toBeUndefined()
  })

  it('leaves the case/location selection pair alone (R-19: no ownership changes here)', () => {
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput({ caseNumber: 'A' }))
    const b = store.getState().createCase(newCaseInput({ caseNumber: 'B' }))
    const locB = store.getState().addLocation(b, newLocationInput())
    store.getState().updateCase(a, edits()) // edit the OTHER case
    expect(store.getState().currentCaseId).toBe(b)
    expect(store.getState().currentLocationId).toBe(locB)
  })

  it('touches nothing but the target case', () => {
    const store = freshStore()
    const a = store.getState().createCase(newCaseInput({ caseNumber: 'A', displayName: 'Alpha' }))
    store.getState().createCase(newCaseInput({ caseNumber: 'B', displayName: 'Bravo' }))
    store.getState().updateCase(a, edits())
    expect(store.getState().cases.find((x) => x.caseNumber === 'B')?.displayName).toBe('Bravo')
  })

  it('is a no-op for an unknown id', () => {
    const store = freshStore()
    const id = store.getState().createCase(newCaseInput())
    const before = store.getState().cases
    store.getState().updateCase('c-nope', edits())
    expect(store.getState().cases.find((x) => x.id === id)?.displayName).toBe(before[0].displayName)
  })
})
