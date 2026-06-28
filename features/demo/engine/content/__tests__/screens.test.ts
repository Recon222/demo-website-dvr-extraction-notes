import { describe, it, expect } from 'vitest'
import {
  TOUR_CHAPTERS,
  WIZARD_SCREENS,
  LAUNCHABLE,
  DRAWER_DEFS,
  chapterNumber,
  wizardNumber,
  nextChapter,
  prevChapter,
} from '@/features/demo/engine/content/screens'

// These registries are the single source of truth for ordering and numbering.
// They exist to kill the prototype's nav-numbering bug (hand-typed, colliding step
// numbers) and to keep OCR/media launch-only — so the invariants are pinned here.
describe('flow registries', () => {
  it('numbers chapters sequentially from 1 with no duplicates', () => {
    const nums = TOUR_CHAPTERS.map(chapterNumber)
    expect(nums).toEqual(TOUR_CHAPTERS.map((_, i) => i + 1))
    expect(new Set(nums).size).toBe(nums.length)
  })

  it('numbers the 10 wizard screens 1..10 with no duplicates', () => {
    const nums = WIZARD_SCREENS.map(wizardNumber)
    expect(WIZARD_SCREENS.length).toBe(10)
    expect(nums).toEqual(WIZARD_SCREENS.map((_, i) => i + 1))
    expect(new Set(nums).size).toBe(nums.length)
  })

  it('keeps OCR/media launch-only (never in the Next/Back flow)', () => {
    expect(LAUNCHABLE).toContain('ocr')
    for (const id of ['ocr', 'mediaCapture', 'audioRecording'] as const) {
      expect(TOUR_CHAPTERS).not.toContain(id)
      expect(WIZARD_SCREENS).not.toContain(id)
    }
  })

  it('walks the chapter order without wrapping', () => {
    expect(prevChapter(TOUR_CHAPTERS[0])).toBeNull()
    expect(nextChapter(TOUR_CHAPTERS[TOUR_CHAPTERS.length - 1])).toBeNull()
    expect(nextChapter(TOUR_CHAPTERS[0])).toBe(TOUR_CHAPTERS[1])
    expect(prevChapter(TOUR_CHAPTERS[1])).toBe(TOUR_CHAPTERS[0])
  })

  it('has a DRAWER_DEFS entry, in order, for every wizard screen', () => {
    expect(DRAWER_DEFS.map((d) => d.id)).toEqual([...WIZARD_SCREENS])
    for (const d of DRAWER_DEFS) {
      expect(d.label.length).toBeGreaterThan(0)
      expect(d.icon.length).toBeGreaterThan(0)
    }
  })
})
