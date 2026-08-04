import { describe, it, expect } from 'vitest'
import {
  CHAPTERS,
  WIZARD_SCREENS,
  LAUNCHABLE,
  DRAWER_DEFS,
  TAB_LABELS,
  TAB_VIEWS,
  isTabView,
  isTabOnlyView,
  chapterNumber,
  wizardNumber,
} from '@/features/demo/engine/content/screens'

// These registries are the single source of truth for ordering and numbering.
// They exist to kill the prototype's nav-numbering bug (hand-typed, colliding step
// numbers) and to keep OCR/media launch-only — so the invariants are pinned here.
describe('flow registries', () => {
  it('numbers chapters sequentially from 1 with no duplicates', () => {
    const nums = CHAPTERS.map(chapterNumber)
    expect(nums).toEqual(CHAPTERS.map((_, i) => i + 1))
    expect(new Set(nums).size).toBe(nums.length)
  })

  it('numbers the 10 wizard screens 1..10 with no duplicates', () => {
    const nums = WIZARD_SCREENS.map(wizardNumber)
    expect(WIZARD_SCREENS.length).toBe(10)
    expect(nums).toEqual(WIZARD_SCREENS.map((_, i) => i + 1))
    expect(new Set(nums).size).toBe(nums.length)
  })

  it('lists the four tabs in the phone\'s own order, each labelled', () => {
    // `app/(tabs)/_layout.tsx:26-66` — Dashboard, Cases, Map, Export, in that sequence.
    expect(TAB_VIEWS).toEqual(['dashboard', 'cases', 'map', 'export'])
    expect(Object.keys(TAB_LABELS).length).toBe(TAB_VIEWS.length)
    expect(TAB_VIEWS.map((t) => TAB_LABELS[t])).toEqual(['Dashboard', 'Cases', 'Map', 'Export'])
  })

  it('splits the tabs into chapters (Dashboard/Cases) and tab-only destinations (Map/Export)', () => {
    // The tab-only ones must never be reachable via Next/Back, and must never become a
    // `currentChapter` — the store's setView only promotes a ChapterId.
    for (const id of ['dashboard', 'cases'] as const) expect(CHAPTERS).toContain(id)
    for (const id of ['map', 'export'] as const) {
      expect(CHAPTERS).not.toContain(id)
      expect(WIZARD_SCREENS).not.toContain(id)
      expect(LAUNCHABLE).not.toContain(id)
    }
  })

  it('recognises exactly the registered tabs', () => {
    for (const id of TAB_VIEWS) expect(isTabView(id)).toBe(true)
    for (const id of ['submission', 'ocr', 'splash', 'nope']) expect(isTabView(id)).toBe(false)
  })

  it('narrows the tab-only destinations — a tab that is not also a chapter (R-27)', () => {
    // The key space `TAB_NARRATION` and `persistence.ts`'s EXTRA_VIEWS are both closed over.
    expect(TAB_VIEWS.filter(isTabOnlyView)).toEqual(['map', 'export'])
    for (const id of ['dashboard', 'cases']) expect(isTabOnlyView(id)).toBe(false)
    for (const id of ['submission', 'ocr', 'nope']) expect(isTabOnlyView(id)).toBe(false)
  })

  it('keeps OCR/media launch-only (never in the Next/Back flow)', () => {
    expect(LAUNCHABLE).toContain('ocr')
    for (const id of ['ocr', 'mediaCapture', 'audioRecording'] as const) {
      expect(CHAPTERS).not.toContain(id)
      expect(WIZARD_SCREENS).not.toContain(id)
    }
  })

  it('has a DRAWER_DEFS entry, in order, for every wizard screen', () => {
    expect(DRAWER_DEFS.map((d) => d.id)).toEqual([...WIZARD_SCREENS])
    for (const d of DRAWER_DEFS) {
      expect(d.label.length).toBeGreaterThan(0)
      expect(d.icon.length).toBeGreaterThan(0)
    }
  })
})
