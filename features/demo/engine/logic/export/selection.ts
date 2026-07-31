/**
 * The Export Hub's selection state machine (parity P5.1, matrix rows 7/24).
 *
 * A PORT, not a re-derivation. The phone keeps this logic in two places — the frozen
 * `ExportSelection` contract (`src/features/case-management/export-hub/types.ts:21-41`) and the
 * Export tab route's four handlers (`app/(tabs)/export.tsx:51-166`) — and every rule below is
 * lifted from one of them, including the identity-preserving early returns (the phone's
 * `return current` arms exist so an unaffected selection never wakes a subscriber; they are
 * pinned here by reference).
 *
 * WHERE IT LIVES ON THE DEMO SIDE — ephemeral, never persisted. The phone declares the
 * selection "Tab-local (never persisted; the Map tab's `mapViewerCaseId` precedent)"
 * (`export.tsx:37-38`), and the demo already follows that precedent literally: its own
 * `mapViewerCaseId` is `useState` in `ui/DemoExperience.tsx:377`, outside `PersistedState`. So
 * the export selection is DemoExperience-local `useState` driven by these pure transitions —
 * it is NOT a store slice and NOT part of the sessionStorage snapshot. The prune rule below is
 * the proof: a selection that must be re-validated against live data every time the data
 * changes is state that only makes sense alongside that data, never state worth outliving it.
 *
 * Pure and React-free (`new-location-gate.ts` / `save-status.ts` house style): every function
 * takes the current selection and returns the next one. Nothing here reads a store.
 */

import { assertNever } from '@/features/demo/engine/logic/assert-never'

/**
 * The visitor's selection: one case at a time, non-empty id set. An empty set is represented
 * as a `null` selection, NEVER an empty Set (phone `types.ts:17-19`) — so "is anything
 * selected" is one null check at every call site instead of a size check some of them forget.
 *
 * `armedFullCase` records the operator's INTENT (phone PR-90 HIGH, operator decision): true
 * only when the case-level checkbox performed the select-all; ANY location-level toggle
 * produces false. It resolves the N=1 collision — where "all selected" and "exactly one
 * selected" are both true — by gesture: case checkbox → full-case export; location row → flat
 * location export.
 */
export interface ExportSelection {
  caseId: string
  locationIds: ReadonlySet<string>
  armedFullCase: boolean
}

/**
 * The minimum a case must expose for the selection machine: its id and its CURRENT location
 * ids. `DemoCase` satisfies this structurally (`engine/types/index.ts:339` — `locationIds` is
 * maintained by `addLocation` / `deleteLocation` / both duplicate actions), so the bridge can
 * pass the store's `cases` array straight through; a caller that would rather resolve from
 * `selectLocationsForCase` can pass that instead. Deliberately structural rather than
 * `DemoCase`: the machine has no business reading a case number or a status.
 */
export interface ExportSelectableCase {
  id: string
  locationIds: readonly string[]
}

/**
 * THE full-case predicate — the single source for the dispatch AND the footer copy (phone
 * `types.ts:33-41`, used by `export.tsx:158` and `ExportHub.tsx:124`). N>1 keeps the
 * promotion: hand-completing all N by rows still exports the full case (a "partial NofN" is
 * nonsense). At N=1 only the case-checkbox gesture (`armedFullCase`) promotes.
 */
export function isFullCaseSelection(
  selection: ExportSelection,
  totalLocationsInCase: number,
): boolean {
  return (
    selection.armedFullCase ||
    (selection.locationIds.size === totalLocationsInCase && totalLocationsInCase > 1)
  )
}

/**
 * A location row was toggled (phone `handleToggleLocation`, `export.tsx:77-96`).
 *
 * Two rules, both load-bearing:
 * - ONE-CASE RULE: a toggle in a different case silently REPLACES the selection — the footer's
 *   case number is the indicator (phone §8.5).
 * - ANY location-level toggle is per-location intent, so `armedFullCase` goes false even when
 *   the toggle happens to complete the set by hand.
 *
 * Emptying the set clears the selection to `null`, never an empty Set.
 */
export function toggleLocationSelection(
  current: ExportSelection | null,
  caseId: string,
  locationId: string,
): ExportSelection | null {
  if (!current || current.caseId !== caseId) {
    return { caseId, locationIds: new Set([locationId]), armedFullCase: false }
  }
  const next = new Set(current.locationIds)
  if (next.has(locationId)) {
    next.delete(locationId)
  } else {
    next.add(locationId)
  }
  return next.size === 0 ? null : { caseId, locationIds: next, armedFullCase: false }
}

/**
 * The case-level tri-state checkbox was toggled (phone `handleToggleCase`,
 * `export.tsx:98-116`): none/some → select all AND arm the full-case intent (replacing any
 * other case's selection); all → clear.
 *
 * A case that is not in the list, or that has no locations, is a TRUE no-op — the phone
 * returns before `setSelection` for both (`export.tsx:100`), so the current selection keeps
 * its identity. "No locations — nothing exportable" is a real card state on the phone
 * (`ExportCaseCard.tsx:195`) and arming it would produce a selection nothing could export.
 */
export function toggleCaseSelection(
  current: ExportSelection | null,
  cases: readonly ExportSelectableCase[],
  caseId: string,
): ExportSelection | null {
  const caseData = cases.find((candidate) => candidate.id === caseId)
  if (!caseData || caseData.locationIds.length === 0) return current

  const allIds = caseData.locationIds
  const allSelected =
    current?.caseId === caseId &&
    current.locationIds.size === allIds.length &&
    allIds.every((id) => current.locationIds.has(id))

  return allSelected ? null : { caseId, locationIds: new Set(allIds), armedFullCase: true }
}

/**
 * Re-validate the selection against the current case list (phone's prune effect,
 * `export.tsx:51-69`). Dropped locations leave the set; an emptied set — or a vanished case —
 * clears the selection entirely.
 *
 * `armedFullCase` survives ONLY while the selection still covers all of the armed case's
 * current locations; once a location appears or disappears underneath it, the "export the
 * whole case" intent no longer describes what is selected, and a stale `true` would promote a
 * genuinely partial selection to the canonical full-case artifact.
 *
 * Returns the SAME reference when nothing changed (phone `export.tsx:61-66`) — on the demo
 * side this runs in the bridge's render body, where a fresh object every pass would re-render
 * every card in the list for no reason.
 */
export function pruneSelection(
  current: ExportSelection | null,
  cases: readonly ExportSelectableCase[],
): ExportSelection | null {
  if (!current) return current
  const armedCase = cases.find((caseData) => caseData.id === current.caseId)
  if (!armedCase) return null

  const validIds = new Set(armedCase.locationIds)
  // `Array.from`, not a spread: the repo compiles with `target: es5` and no
  // `downlevelIteration`, so spreading a `ReadonlySet` is a compile error (TS2802).
  const kept = Array.from(current.locationIds).filter((id) => validIds.has(id))
  if (kept.length === 0) return null

  const armedFullCase = current.armedFullCase && kept.length === armedCase.locationIds.length
  if (kept.length === current.locationIds.size && armedFullCase === current.armedFullCase) {
    return current
  }
  return { caseId: current.caseId, locationIds: new Set(kept), armedFullCase }
}

// ---- Derived views ---------------------------------------------------------------------

/** The case-card checkbox's three states (phone `ExportCaseCard.tsx:82-83`, rendered as
 *  `value` + `indeterminate`). Named so the card maps state → props once. */
export const CASE_CHECKBOX_STATES = ['none', 'some', 'all'] as const
export type CaseCheckboxState = (typeof CASE_CHECKBOX_STATES)[number]

/**
 * How the selection touches ONE case card (phone `ExportCaseCard.tsx:74-83`). Counts only the
 * card's own locations, and only when the selection is armed on that card's case — the
 * one-case rule means every other card reads `'none'`.
 *
 * A case with no locations is `'none'`, never `'all'`: the phone's `allSelected` is gated on
 * `hasLocations` for exactly this reason (an empty case would otherwise render a ticked
 * "everything is selected" box over nothing).
 */
export function caseCheckboxState(
  selection: ExportSelection | null,
  caseData: ExportSelectableCase,
): CaseCheckboxState {
  if (caseData.locationIds.length === 0) return 'none'
  if (!selection || selection.caseId !== caseData.id) return 'none'
  const selectedCount = caseData.locationIds.reduce(
    (count, id) => count + (selection.locationIds.has(id) ? 1 : 0),
    0,
  )
  if (selectedCount === 0) return 'none'
  return selectedCount === caseData.locationIds.length ? 'all' : 'some'
}

/**
 * Which artifact the current selection maps to. `'full-case'` and `'subset'` are BOTH reachable
 * with every location ticked — the difference is the gesture that got there (see
 * `isFullCaseSelection`).
 */
export const EXPORT_ARTIFACT_KINDS = ['full-case', 'single-location', 'subset'] as const
export type ExportArtifactKind = (typeof EXPORT_ARTIFACT_KINDS)[number]

/**
 * Everything the footer renders plus the pipeline the CTA dispatches, from ONE decision.
 *
 * The phone derives these in two files from the same predicate and is explicit that the
 * artifact line is "a PASS-THROUGH of the same decision, never a third copy of the branch"
 * (`ExportHub.tsx:132-133`). Here they are literally one branch: the route cannot dispatch a
 * subset ZIP under a footer promising the canonical case artifact, because both read `kind`.
 */
export interface ExportSelectionPlan {
  kind: ExportArtifactKind
  /** The pipeline the CTA dispatches (phone `export.tsx:158-165`). */
  dispatch: 'case' | 'location' | 'case-subset'
  selectedCount: number
  totalInCase: number
  /** CTA label — phone `ExportHub.tsx:126-130`, verbatim. */
  ctaLabel: string
  /** Mono artifact descriptor above the CTA — phone `ExportHub.tsx:134-138`, verbatim. */
  artifactLine: string
  /** "k of N locations selected" — phone `ExportHub.tsx:144`, verbatim. */
  detailLine: string
}

const plural = (n: number): string => (n === 1 ? 'location' : 'locations')

export function resolveExportPlan(
  selection: ExportSelection,
  totalLocationsInCase: number,
): ExportSelectionPlan {
  const selectedCount = selection.locationIds.size
  const kind: ExportArtifactKind = isFullCaseSelection(selection, totalLocationsInCase)
    ? 'full-case'
    : selectedCount === 1
      ? 'single-location'
      : 'subset'

  const base = { kind, selectedCount, totalInCase: totalLocationsInCase } as const
  const detailLine = `${selectedCount} of ${totalLocationsInCase} ${plural(totalLocationsInCase)} selected`

  switch (kind) {
    case 'full-case':
      return {
        ...base,
        kind,
        dispatch: 'case',
        ctaLabel: `Export Full Case (${totalLocationsInCase} ${plural(totalLocationsInCase)})`,
        artifactLine: 'CASE ZIP · CANONICAL · INCLUDES CASE MAP',
        detailLine,
      }
    case 'single-location':
      return {
        ...base,
        kind,
        dispatch: 'location',
        ctaLabel: 'Export 1 Location',
        artifactLine: 'LOCATION ZIP · SINGLE LOCATION',
        detailLine,
      }
    case 'subset':
      return {
        ...base,
        kind,
        dispatch: 'case-subset',
        ctaLabel: `Export ${selectedCount} of ${totalLocationsInCase} Locations`,
        artifactLine: `SUBSET ZIP · PARTIAL · ${selectedCount} OF ${totalLocationsInCase}`,
        detailLine,
      }
    default:
      return assertNever(kind)
  }
}
