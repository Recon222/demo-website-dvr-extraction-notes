import { describe, it, expect } from 'vitest'
import { DuplicateCaseNumberError } from '@/features/demo/engine/logic/case-number'
import { freshStore, newCaseInput } from '@/features/demo/engine/store/__tests__/test-utils'

/**
 * P3.3 / matrix row 11 — the store is the demo's write boundary for case-number uniqueness,
 * standing in for the phone's `cases.case_number … UNIQUE` column. Enforcing it here rather
 * than in the modal means no future caller (import, duplicate-location, a seeded fixture)
 * can quietly create a second case that shadows the first.
 */
describe('createCase — case-number uniqueness', () => {
  it('rejects a second case with the same number', () => {
    const store = freshStore()
    store.getState().createCase(newCaseInput({ caseNumber: 'PR25-1' }))
    expect(() => store.getState().createCase(newCaseInput({ caseNumber: 'PR25-1' }))).toThrow(
      DuplicateCaseNumberError,
    )
  })

  it('leaves the library untouched when it refuses', () => {
    const store = freshStore()
    const first = store.getState().createCase(newCaseInput({ caseNumber: 'PR25-1' }))
    expect(() => store.getState().createCase(newCaseInput({ caseNumber: 'PR25-1' }))).toThrow()
    expect(store.getState().cases).toHaveLength(1)
    expect(store.getState().currentCaseId).toBe(first)
  })

  it('does not burn an id on a refused create (ids stay dense for the persistence seq)', () => {
    const store = freshStore()
    store.getState().createCase(newCaseInput({ caseNumber: 'PR25-1' }))
    expect(() => store.getState().createCase(newCaseInput({ caseNumber: 'PR25-1' }))).toThrow()
    const next = store.getState().createCase(newCaseInput({ caseNumber: 'PR25-2' }))
    expect(next).toBe('c2')
  })

  it('compares trimmed, so a padded retype of the same number is still a duplicate', () => {
    const store = freshStore()
    store.getState().createCase(newCaseInput({ caseNumber: 'PR25-1' }))
    expect(() => store.getState().createCase(newCaseInput({ caseNumber: ' PR25-1 ' }))).toThrow(
      DuplicateCaseNumberError,
    )
  })

  it('accepts a different number', () => {
    const store = freshStore()
    store.getState().createCase(newCaseInput({ caseNumber: 'PR25-1' }))
    store.getState().createCase(newCaseInput({ caseNumber: 'PR25-2' }))
    expect(store.getState().cases.map((c) => c.caseNumber)).toEqual(['PR25-2', 'PR25-1'])
  })
})
