import { describe, it, expect } from 'vitest'
import { storeWithLocation } from './test-utils'
import { selectCurrentLocation } from '@/features/demo/engine/store/selectors'
import type { DemoStore } from '@/features/demo/engine/store/create-store'

// The notes flows A–E2 (phone parity: notes screen callbacks + checkAndRegenerateNotes).
// Trigger mapping — A: reconcileNotes · B: commitNoteSection · C: commitNoteAddendum ·
// D: resetNoteSection · E1: scrapAllNotes · E2: restoreAllNotes · free text: commitNotesFreeText.

const sectionsOf = (store: DemoStore) =>
  selectCurrentLocation(store.getState())?.form.notesSections ?? []
const freeTextOf = (store: DemoStore) =>
  selectCurrentLocation(store.getState())?.form.notesFreeText ?? ''
const find = (store: DemoStore, id: string) => sectionsOf(store).find((s) => s.id === id)

/** A worked location: scopes + offset-free, retention set — enough for several formatters. */
function workedStore(): DemoStore {
  const store = storeWithLocation()
  store.getState().updateField('form.scopes', [
    { id: 's1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '3, 4, 7' },
  ])
  store.getState().updateField('form.dvr.totalDvrRetention', '35 days')
  return store
}

describe('Flow A — reconcileNotes', () => {
  it('first call fills all seven sections in registry order, un-edited', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    const sections = sectionsOf(store)
    expect(sections.map((s) => s.id)).toEqual([
      'address', 'timeOffset', 'scopes', 'retention', 'cameras', 'export', 'timeOnScene',
    ])
    expect(sections.every((s) => !s.manuallyEdited)).toBe(true)
    expect(find(store, 'retention')?.content).toBe('• DVR retention period: 35 days')
  })

  it('a clean second pass performs ZERO writes (locations array identity preserved)', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    const before = store.getState().locations
    store.getState().reconcileNotes()
    expect(store.getState().locations).toBe(before)
  })

  it('un-edited sections pick up fresh output when wizard data changes', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    store.getState().updateField('form.dvr.totalDvrRetention', '40 days')
    store.getState().reconcileNotes()
    const retention = find(store, 'retention')
    expect(retention?.content).toBe('• DVR retention period: 40 days')
    expect(retention?.generatedContent).toBe('• DVR retention period: 40 days')
  })

  it('a manually-edited section is NEVER clobbered by regeneration; its baseline stays frozen', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    store.getState().commitNoteSection('retention', 'my own retention wording')
    store.getState().updateField('form.dvr.totalDvrRetention', '40 days')
    store.getState().reconcileNotes()
    const retention = find(store, 'retention')
    expect(retention?.content).toBe('my own retention wording')
    expect(retention?.generatedContent).toBe('• DVR retention period: 35 days') // frozen
  })
})

describe('Flow B — commitNoteSection', () => {
  it('replaces content, sets manuallyEdited, freezes generatedContent', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    const baseline = find(store, 'address')?.generatedContent
    store.getState().commitNoteSection('address', 'my account')
    const address = find(store, 'address')
    expect(address?.content).toBe('my account')
    expect(address?.manuallyEdited).toBe(true)
    expect(address?.generatedContent).toBe(baseline)
  })

  it('no-ops on unchanged text and on a missing section (clean blurs never write)', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    const before = store.getState().locations
    store.getState().commitNoteSection('address', find(store, 'address')?.content ?? '')
    expect(store.getState().locations).toBe(before)
  })

  it('empty text is an explicit deletion (content "", still manuallyEdited)', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    store.getState().commitNoteSection('address', '')
    const address = find(store, 'address')
    expect(address?.content).toBe('')
    expect(address?.manuallyEdited).toBe(true)
  })
})

describe('Flow C — commitNoteAddendum', () => {
  it('sets the addendum WITHOUT flipping manuallyEdited; empty commit clears to undefined', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    store.getState().commitNoteAddendum('address', 'manager was present')
    expect(find(store, 'address')?.userAddendum).toBe('manager was present')
    expect(find(store, 'address')?.manuallyEdited).toBe(false)
    store.getState().commitNoteAddendum('address', '')
    expect(find(store, 'address')?.userAddendum).toBeUndefined()
  })

  it('no-ops when unchanged (treats undefined and "" as the same empty)', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    const before = store.getState().locations
    store.getState().commitNoteAddendum('address', '')
    expect(store.getState().locations).toBe(before)
  })
})

describe('Flow D — resetNoteSection', () => {
  it('the ONLY path that clears manuallyEdited: rebuilds fresh, keeps the addendum', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    store.getState().commitNoteSection('retention', 'edited away')
    store.getState().commitNoteAddendum('retention', 'a kept note')
    store.getState().updateField('form.dvr.totalDvrRetention', '40 days')
    store.getState().resetNoteSection('retention')
    const retention = find(store, 'retention')
    expect(retention?.content).toBe('• DVR retention period: 40 days') // CURRENT data, not the old baseline
    expect(retention?.generatedContent).toBe('• DVR retention period: 40 days')
    expect(retention?.manuallyEdited).toBe(false)
    expect(retention?.userAddendum).toBe('a kept note')
  })
})

describe('Flow E1 — scrapAllNotes ("Write my own notes…")', () => {
  it("'current' seeds free text from the assembled notes; every section deleted, addenda dropped, baselines kept", () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    store.getState().commitNoteAddendum('address', 'to be dropped')
    const assembledAddress = find(store, 'address')?.content ?? ''
    store.getState().scrapAllNotes('current')
    expect(freeTextOf(store)).toContain(assembledAddress)
    expect(freeTextOf(store)).toContain('to be dropped') // it was part of the assembly…
    for (const sec of sectionsOf(store)) {
      expect(sec.content).toBe('')
      expect(sec.manuallyEdited).toBe(true)
      expect(sec.userAddendum).toBeUndefined() // …but dropped from the sections
      // generatedContent kept as the frozen baseline so deleted+stale restore rows work
    }
    expect(find(store, 'address')?.generatedContent).toContain('• Attended')
  })

  it("'blank' starts the free text empty", () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    store.getState().commitNotesFreeText('pre-existing tail')
    store.getState().scrapAllNotes('blank')
    expect(freeTextOf(store)).toBe('')
    expect(sectionsOf(store).every((s) => s.manuallyEdited && s.content === '')).toBe(true)
  })
})

describe('Flow E2 — restoreAllNotes (banner "Restore")', () => {
  it("'keep' rebuilds every section fresh (addenda preserved) and leaves the free text", () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    store.getState().commitNoteAddendum('retention', 'kept through restore')
    store.getState().scrapAllNotes('current')
    store.getState().commitNoteAddendum('retention', 'kept through restore') // re-add after scrap dropped it
    const tail = freeTextOf(store)
    store.getState().restoreAllNotes('keep')
    expect(find(store, 'retention')?.content).toBe('• DVR retention period: 35 days')
    expect(find(store, 'retention')?.manuallyEdited).toBe(false)
    expect(find(store, 'retention')?.userAddendum).toBe('kept through restore')
    expect(freeTextOf(store)).toBe(tail)
  })

  it("'clear' also empties the free-text tail", () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    store.getState().scrapAllNotes('current')
    expect(freeTextOf(store)).not.toBe('')
    store.getState().restoreAllNotes('clear')
    expect(freeTextOf(store)).toBe('')
    expect(sectionsOf(store).every((s) => !s.manuallyEdited)).toBe(true)
  })
})

describe('free text — commitNotesFreeText', () => {
  it('writes changed text; no-ops on unchanged', () => {
    const store = workedStore()
    store.getState().commitNotesFreeText('observations')
    expect(freeTextOf(store)).toBe('observations')
    const before = store.getState().locations
    store.getState().commitNotesFreeText('observations')
    expect(store.getState().locations).toBe(before)
  })
})

describe('staleness journey (edit → data change → reset applies the CURRENT generation)', () => {
  it('generatedContent stays the comparison baseline while edited, then re-tracks after reset', () => {
    const store = workedStore()
    store.getState().reconcileNotes()
    store.getState().commitNoteSection('retention', 'authored')
    // regeneration happens (Flow A) with changed data — edited section untouched
    store.getState().updateField('form.dvr.totalDvrRetention', '40 days')
    store.getState().reconcileNotes()
    expect(find(store, 'retention')?.content).toBe('authored')
    // the reset applies TODAY's generation, not the frozen one
    store.getState().resetNoteSection('retention')
    expect(find(store, 'retention')?.content).toBe('• DVR retention period: 40 days')
    // and from here the section auto-tracks again
    store.getState().updateField('form.dvr.totalDvrRetention', '41 days')
    store.getState().reconcileNotes()
    expect(find(store, 'retention')?.content).toBe('• DVR retention period: 41 days')
  })
})
