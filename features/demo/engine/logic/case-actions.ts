/**
 * The case status → action matrix behind the dashboard's Case Actions Sheet (parity P3.2,
 * matrix row 9). Port of the phone's `actionsForStatus` + status label
 * (`src/features/case-management/components/CaseActionsSheet.tsx:51-61, 133`).
 *
 * Engine-pure: no React, no DOM — the sheet component reads the booleans and renders.
 */

import { assertNever } from '@/features/demo/engine/logic/assert-never'
import type { CaseStatus } from '@/features/demo/engine/types'

/** Which status-specific actions a case exposes. Edit/Cancel are unconditional. */
export interface StatusActions {
  canComplete: boolean
  canReopen: boolean
  canArchive: boolean
}

/**
 * Single source of truth for the status→action matrix (phone CaseActionsSheet.tsx:51-61,
 * lifted verbatim including the phone's own rationale):
 *
 *   DRAFT    → Edit, Complete, Archive, Cancel
 *   COMPLETE → Edit, Reopen,   Archive, Cancel
 *   ARCHIVED → Edit, Reopen,            Cancel
 *
 * The exhaustive switch (with `assertNever` default) makes adding a CaseStatus a compile
 * error here until its action set is decided — parallel boolean expressions in the JSX
 * would instead let a new status silently fall through to "Edit + Cancel only".
 */
export function actionsForStatus(status: CaseStatus): StatusActions {
  switch (status) {
    case 'draft':
      return { canComplete: true, canReopen: false, canArchive: true }
    case 'complete':
      return { canComplete: false, canReopen: true, canArchive: true }
    case 'archived':
      return { canComplete: false, canReopen: true, canArchive: false }
    default:
      return assertNever(status)
  }
}

/**
 * The sheet header's `Status: {label}` value.
 *
 * VERBATIM PHONE QUIRK (CaseActionsSheet.tsx:133, called out in the phone's own ui-mapping
 * 01 §Case Actions Sheet): a draft reads `Active`, every other status renders its RAW enum
 * value — lowercase `complete` / `archived`, unlike the title-cased labels the status badges
 * use. The demo's CaseStatus strings are identical to the phone's, so lifting the expression
 * reproduces the phone's output character for character. Copied deliberately rather than
 * "fixed": copy parity is the contract, and the inconsistency is logged for the phone-repo
 * follow-up ledger instead of being silently diverged from here.
 */
export function caseStatusSheetLabel(status: CaseStatus): string {
  return status === 'draft' ? 'Active' : status
}
