import { describe, it, expect } from 'vitest'
import { actionsForStatus, caseStatusSheetLabel } from '@/features/demo/engine/logic/case-actions'
import { assertNever } from '@/features/demo/engine/logic/assert-never'
import { CASE_STATUSES, type CaseStatus } from '@/features/demo/engine/types'

describe('actionsForStatus (phone CaseActionsSheet.tsx:51-61)', () => {
  it('DRAFT exposes Complete + Archive, never Reopen', () => {
    expect(actionsForStatus('draft')).toEqual({ canComplete: true, canReopen: false, canArchive: true })
  })

  it('COMPLETE exposes Reopen + Archive, never Complete', () => {
    expect(actionsForStatus('complete')).toEqual({ canComplete: false, canReopen: true, canArchive: true })
  })

  it('ARCHIVED exposes Reopen only — an archived case cannot be re-archived or completed', () => {
    expect(actionsForStatus('archived')).toEqual({ canComplete: false, canReopen: true, canArchive: false })
  })

  it('answers every CaseStatus in the union — a new status without a branch throws, not falls through', () => {
    for (const status of CASE_STATUSES) {
      expect(() => actionsForStatus(status)).not.toThrow()
    }
    // The `assertNever` default is the compile-time guard; at runtime it must FAIL LOUDLY
    // rather than hand back "Edit + Cancel only" for a status nobody decided on.
    expect(() => actionsForStatus('retired' as CaseStatus)).toThrow(/Unhandled case/)
  })
})

describe('caseStatusSheetLabel', () => {
  it('renders a draft as "Active" (phone CaseActionsSheet.tsx:133)', () => {
    expect(caseStatusSheetLabel('draft')).toBe('Active')
  })

  it('renders the RAW lowercase enum value for the other statuses — the phone quirk, lifted deliberately', () => {
    expect(caseStatusSheetLabel('complete')).toBe('complete')
    expect(caseStatusSheetLabel('archived')).toBe('archived')
  })
})

describe('assertNever', () => {
  it('throws with the offending value serialized', () => {
    expect(() => assertNever('nope' as never)).toThrow('Unhandled case: "nope"')
  })
})
