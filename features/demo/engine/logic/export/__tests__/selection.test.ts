import { describe, it, expect } from 'vitest'

import {
  CASE_CHECKBOX_STATES,
  caseCheckboxState,
  isFullCaseSelection,
  pruneSelection,
  resolveExportPlan,
  toggleCaseSelection,
  toggleLocationSelection,
  type ExportSelectableCase,
  type ExportSelection,
} from '@/features/demo/engine/logic/export/selection'

const CASE_A: ExportSelectableCase = { id: 'case-a', locationIds: ['a1', 'a2', 'a3'] }
const CASE_B: ExportSelectableCase = { id: 'case-b', locationIds: ['b1', 'b2'] }
const CASE_SOLO: ExportSelectableCase = { id: 'case-solo', locationIds: ['s1'] }
const CASE_EMPTY: ExportSelectableCase = { id: 'case-empty', locationIds: [] }
const CASES = [CASE_A, CASE_B, CASE_SOLO, CASE_EMPTY]

const sel = (
  caseId: string,
  ids: readonly string[],
  armedFullCase = false,
): ExportSelection => ({ caseId, locationIds: new Set(ids), armedFullCase })

const ids = (s: ExportSelection | null): string[] => (s ? Array.from(s.locationIds).sort() : [])

describe('isFullCaseSelection — THE predicate both the footer and the dispatch read', () => {
  it('is true for the armed full-case intent at any N', () => {
    expect(isFullCaseSelection(sel('case-a', ['a1', 'a2', 'a3'], true), 3)).toBe(true)
    expect(isFullCaseSelection(sel('case-solo', ['s1'], true), 1)).toBe(true)
  })

  it('promotes a hand-completed set when N > 1 — a "partial NofN" is nonsense', () => {
    expect(isFullCaseSelection(sel('case-a', ['a1', 'a2', 'a3']), 3)).toBe(true)
  })

  it('does NOT promote at N = 1 without the case-checkbox gesture', () => {
    // The collision the intent flag exists to resolve: "all selected" and "exactly one
    // selected" are both true, and the gesture decides which artifact the visitor gets.
    expect(isFullCaseSelection(sel('case-solo', ['s1']), 1)).toBe(false)
  })

  it('is false for a genuine subset', () => {
    expect(isFullCaseSelection(sel('case-a', ['a1', 'a2']), 3)).toBe(false)
  })
})

describe('toggleLocationSelection — the location row gesture', () => {
  it('starts a selection from nothing, unarmed', () => {
    const next = toggleLocationSelection(null, 'case-a', 'a1')
    expect(next).toEqual({ caseId: 'case-a', locationIds: new Set(['a1']), armedFullCase: false })
  })

  it('adds to the set within the same case', () => {
    const next = toggleLocationSelection(sel('case-a', ['a1']), 'case-a', 'a2')
    expect(ids(next)).toEqual(['a1', 'a2'])
  })

  it('removes an already-selected id', () => {
    const next = toggleLocationSelection(sel('case-a', ['a1', 'a2']), 'case-a', 'a1')
    expect(ids(next)).toEqual(['a2'])
  })

  it('clears to null — never an empty Set — when the last id comes off', () => {
    expect(toggleLocationSelection(sel('case-a', ['a1']), 'case-a', 'a1')).toBeNull()
  })

  it('REPLACES the selection when the toggle lands in a different case (one-case rule)', () => {
    const next = toggleLocationSelection(sel('case-a', ['a1', 'a2'], true), 'case-b', 'b1')
    expect(next).toEqual({ caseId: 'case-b', locationIds: new Set(['b1']), armedFullCase: false })
  })

  it('disarms the full-case intent even when the row gesture COMPLETES the set by hand', () => {
    // Hand-completing all N still exports the full case at N>1 (isFullCaseSelection), but the
    // INTENT flag must record the gesture honestly — it is what decides the N=1 case.
    const next = toggleLocationSelection(sel('case-a', ['a1', 'a2'], true), 'case-a', 'a3')
    expect(next?.armedFullCase).toBe(false)
    expect(ids(next)).toEqual(['a1', 'a2', 'a3'])
  })
})

describe('toggleCaseSelection — the tri-state case checkbox', () => {
  it('selects every location and ARMS the full-case intent from nothing', () => {
    const next = toggleCaseSelection(null, CASES, 'case-a')
    expect(next).toEqual({
      caseId: 'case-a',
      locationIds: new Set(['a1', 'a2', 'a3']),
      armedFullCase: true,
    })
  })

  it('promotes a partial selection of the same case to all + armed', () => {
    const next = toggleCaseSelection(sel('case-a', ['a2']), CASES, 'case-a')
    expect(ids(next)).toEqual(['a1', 'a2', 'a3'])
    expect(next?.armedFullCase).toBe(true)
  })

  it('clears when every location of that case is already selected', () => {
    expect(toggleCaseSelection(sel('case-a', ['a1', 'a2', 'a3'], true), CASES, 'case-a')).toBeNull()
  })

  it('clears a hand-completed (unarmed) full set too — "all" is about the set, not the flag', () => {
    expect(toggleCaseSelection(sel('case-a', ['a1', 'a2', 'a3']), CASES, 'case-a')).toBeNull()
  })

  it('replaces another case wholesale', () => {
    const next = toggleCaseSelection(sel('case-a', ['a1']), CASES, 'case-b')
    expect(next?.caseId).toBe('case-b')
    expect(ids(next)).toEqual(['b1', 'b2'])
    expect(next?.armedFullCase).toBe(true)
  })

  it('is a TRUE no-op for a case with no locations — identity preserved', () => {
    const current = sel('case-a', ['a1'])
    expect(toggleCaseSelection(current, CASES, 'case-empty')).toBe(current)
    expect(toggleCaseSelection(null, CASES, 'case-empty')).toBeNull()
  })

  it('is a TRUE no-op for a case that is not in the list — identity preserved', () => {
    const current = sel('case-a', ['a1'])
    expect(toggleCaseSelection(current, CASES, 'case-gone')).toBe(current)
  })
})

describe('pruneSelection — re-validating against live data', () => {
  it('leaves a still-valid selection untouched BY REFERENCE', () => {
    const current = sel('case-a', ['a1', 'a2'])
    expect(pruneSelection(current, CASES)).toBe(current)
  })

  it('leaves an armed full selection untouched by reference', () => {
    const current = sel('case-a', ['a1', 'a2', 'a3'], true)
    expect(pruneSelection(current, CASES)).toBe(current)
  })

  it('passes a null selection straight through', () => {
    expect(pruneSelection(null, CASES)).toBeNull()
  })

  it('clears when the armed case has vanished', () => {
    expect(pruneSelection(sel('case-gone', ['x1']), CASES)).toBeNull()
  })

  it('drops ids the case no longer has', () => {
    const next = pruneSelection(sel('case-a', ['a1', 'a-deleted']), CASES)
    expect(ids(next)).toEqual(['a1'])
  })

  it('clears when every selected id is gone', () => {
    expect(pruneSelection(sel('case-a', ['a-deleted']), CASES)).toBeNull()
  })

  it('KEEPS the intent when the dropped ids were never the case\'s', () => {
    // The set shrinks, but what it loses is a ghost the case never had — the survivors still
    // cover every location of the armed case, so "export the whole case" still describes the
    // selection exactly. (The genuine disarm is the next test: the SET is intact and the CASE
    // grew underneath it.)
    const next = pruneSelection(sel('case-a', ['a1', 'a2', 'a3', 'a-deleted'], true), CASES)
    expect(ids(next)).toEqual(['a1', 'a2', 'a3'])
    expect(next?.armedFullCase).toBe(true)
  })

  it('DISARMS when a NEW location appeared under the armed case', () => {
    // The set is unchanged but no longer covers the case: a stale `true` here would promote a
    // genuinely partial selection to the canonical full-case artifact.
    const grown: ExportSelectableCase = { id: 'case-a', locationIds: ['a1', 'a2', 'a3', 'a4'] }
    const next = pruneSelection(sel('case-a', ['a1', 'a2', 'a3'], true), [grown])
    expect(next?.armedFullCase).toBe(false)
    expect(ids(next)).toEqual(['a1', 'a2', 'a3'])
  })

  it('returns a NEW object when only the armed flag changed', () => {
    const current = sel('case-a', ['a1', 'a2', 'a3'], true)
    const grown: ExportSelectableCase = { id: 'case-a', locationIds: ['a1', 'a2', 'a3', 'a4'] }
    expect(pruneSelection(current, [grown])).not.toBe(current)
  })

  it('never re-arms a selection the visitor made by hand', () => {
    const next = pruneSelection(sel('case-a', ['a1', 'a2', 'a3']), CASES)
    expect(next?.armedFullCase).toBe(false)
  })
})

describe('caseCheckboxState — per-card tri-state', () => {
  it('reads none for an unselected card', () => {
    expect(caseCheckboxState(null, CASE_A)).toBe('none')
  })

  it('reads none for every card except the armed one (one-case rule)', () => {
    expect(caseCheckboxState(sel('case-a', ['a1', 'a2', 'a3'], true), CASE_B)).toBe('none')
  })

  it('reads some for a partial selection', () => {
    expect(caseCheckboxState(sel('case-a', ['a1']), CASE_A)).toBe('some')
  })

  it('reads all when every location of the card is selected', () => {
    expect(caseCheckboxState(sel('case-a', ['a1', 'a2', 'a3']), CASE_A)).toBe('all')
  })

  it('reads none for a case with no locations — never a ticked box over nothing', () => {
    // The phone needs an explicit `hasLocations` gate here because its `allSelected` compares
    // the counts directly and `0 === 0` is true. This implementation answers the empty case on
    // the way past, via the zero check ORDERED AHEAD of the length comparison — so what keeps
    // the phone's bug closed is that ordering, and reversing the two returns reopens it.
    expect(caseCheckboxState(sel('case-empty', []), CASE_EMPTY)).toBe('none')
    // The armed-on-this-card path, where the ordering is what does the work.
    expect(caseCheckboxState(sel('case-empty', ['ghost']), CASE_EMPTY)).toBe('none')
  })

  it('ignores selected ids the card does not own', () => {
    expect(caseCheckboxState(sel('case-solo', ['s1', 'ghost']), CASE_SOLO)).toBe('all')
  })

  it('covers the whole declared union', () => {
    expect(CASE_CHECKBOX_STATES).toEqual(['none', 'some', 'all'])
  })
})

describe('resolveExportPlan — one branch feeding the footer AND the dispatch', () => {
  it('describes the canonical full-case artifact', () => {
    const plan = resolveExportPlan(sel('case-a', ['a1', 'a2', 'a3'], true), 3)
    expect(plan).toEqual({
      kind: 'full-case',
      dispatch: 'case',
      selectedCount: 3,
      totalInCase: 3,
      ctaLabel: 'Export Full Case (3 locations)',
      artifactLine: 'CASE ZIP · CANONICAL · INCLUDES CASE MAP',
      detailLine: '3 of 3 locations selected',
    })
  })

  it('singularises the full-case CTA and detail line at N = 1', () => {
    const plan = resolveExportPlan(sel('case-solo', ['s1'], true), 1)
    expect(plan.ctaLabel).toBe('Export Full Case (1 location)')
    expect(plan.detailLine).toBe('1 of 1 location selected')
  })

  it('describes the flat single-location artifact', () => {
    const plan = resolveExportPlan(sel('case-a', ['a2']), 3)
    expect(plan).toEqual({
      kind: 'single-location',
      dispatch: 'location',
      selectedCount: 1,
      totalInCase: 3,
      ctaLabel: 'Export 1 Location',
      artifactLine: 'LOCATION ZIP · SINGLE LOCATION',
      detailLine: '1 of 3 locations selected',
    })
  })

  it('describes the partial-declaring subset artifact', () => {
    const plan = resolveExportPlan(sel('case-a', ['a1', 'a2']), 3)
    expect(plan).toEqual({
      kind: 'subset',
      dispatch: 'case-subset',
      selectedCount: 2,
      totalInCase: 3,
      ctaLabel: 'Export 2 of 3 Locations',
      artifactLine: 'SUBSET ZIP · PARTIAL · 2 OF 3',
      detailLine: '2 of 3 locations selected',
    })
  })

  it('routes an N = 1 case-checkbox arm to the full case, not the flat location', () => {
    expect(resolveExportPlan(sel('case-solo', ['s1'], true), 1).dispatch).toBe('case')
    expect(resolveExportPlan(sel('case-solo', ['s1']), 1).dispatch).toBe('location')
  })

  it('promotes a hand-completed N > 1 set to the case pipeline', () => {
    const plan = resolveExportPlan(sel('case-a', ['a1', 'a2', 'a3']), 3)
    expect(plan.kind).toBe('full-case')
    expect(plan.artifactLine).toBe('CASE ZIP · CANONICAL · INCLUDES CASE MAP')
  })

  it('keeps the artifact line and the dispatch in lockstep on every kind', () => {
    // The invariant the phone spells out as "a PASS-THROUGH of the same decision, never a
    // third copy of the branch": no selection may promise one artifact and dispatch another.
    const cases: Array<[ExportSelection, number]> = [
      [sel('case-a', ['a1', 'a2', 'a3'], true), 3],
      [sel('case-a', ['a1']), 3],
      [sel('case-a', ['a1', 'a2']), 3],
      [sel('case-solo', ['s1']), 1],
      [sel('case-solo', ['s1'], true), 1],
    ]
    for (const [selection, total] of cases) {
      const plan = resolveExportPlan(selection, total)
      const expectedDispatch =
        plan.kind === 'full-case' ? 'case' : plan.kind === 'single-location' ? 'location' : 'case-subset'
      expect(plan.dispatch).toBe(expectedDispatch)
      expect(plan.kind === 'full-case').toBe(isFullCaseSelection(selection, total))
    }
  })
})
