import { describe, it, expect } from 'vitest'
import { CHAPTERS, LAUNCHABLE, TAB_VIEWS } from '@/features/demo/engine/content/screens'
import { NARRATION, MODAL_NARRATION, TAB_NARRATION } from '@/features/demo/engine/content/narration'
import { SAMPLE_REQUEST_DOC } from '@/features/demo/engine/content/seed'
import { FORENSIC, getProfile } from '@/features/demo/engine/content/profiles'

describe('narration', () => {
  it('has non-empty copy for every tour chapter', () => {
    for (const id of CHAPTERS) {
      const n = NARRATION[id]
      expect(n, `narration missing for chapter "${id}"`).toBeTruthy()
      expect(n.eyebrow.length).toBeGreaterThan(0)
      expect(n.title.length).toBeGreaterThan(0)
      expect(n.paras.length).toBeGreaterThan(0)
    }
  })

  it('does not bake step numbers into the eyebrow (numbering is derived)', () => {
    // The prototype hard-coded "01 · …" into each eyebrow and they collided.
    // Numbering now comes from the registry, so eyebrows must be number-free.
    for (const id of CHAPTERS) {
      expect(NARRATION[id].eyebrow).not.toMatch(/^\s*\d/)
    }
  })

  it('has modal/launch-screen copy for every modal the bridge can open, plus ocr', () => {
    for (const id of ['newCase', 'newLocation', 'import', 'mediaLibrary', 'duplicateLocation', 'newAddressLocation', 'ocr'] as const) {
      const n = MODAL_NARRATION[id]
      expect(n, `modal narration missing for "${id}"`).toBeTruthy()
      expect(n!.title.length).toBeGreaterThan(0)
      expect(n!.paras.length).toBeGreaterThan(0)
    }
  })

  it('carries copy for exactly the tab destinations that are NOT chapters (Map, Export)', () => {
    // The bridge consults TAB_NARRATION BEFORE the chapter copy, so an entry here for a view
    // that is also a chapter would silently shadow that chapter's own narration. The keys are
    // therefore pinned to the tab-only destinations.
    const tabOnly = TAB_VIEWS.filter((v) => !(CHAPTERS as readonly string[]).includes(v))
    expect(Object.keys(TAB_NARRATION).sort()).toEqual([...tabOnly].sort())
    for (const id of tabOnly) {
      const n = TAB_NARRATION[id]
      expect(n, `tab narration missing for "${id}"`).toBeTruthy()
      expect(n!.eyebrow.length).toBeGreaterThan(0)
      expect(n!.title.length).toBeGreaterThan(0)
      expect(n!.paras.length).toBeGreaterThan(0)
    }
    // …and never for a launchable: those are keyed in MODAL_NARRATION and matched first.
    for (const id of LAUNCHABLE) expect(TAB_NARRATION[id]).toBeUndefined()
  })
})

describe('seed content (the sample request survives as the live-import fallback)', () => {
  it('carries the occurrence number in the sample request document', () => {
    expect(SAMPLE_REQUEST_DOC).toContain('PR25-0098213')
  })
})

describe('profiles', () => {
  it('forensic profile exposes all 10 wizard screens with nothing hidden', () => {
    expect(FORENSIC.id).toBe('forensic')
    expect(FORENSIC.wizardScreens.length).toBe(10)
    expect(FORENSIC.hiddenFields).toEqual([])
  })

  it('getProfile returns the forensic config for "forensic"', () => {
    expect(getProfile('forensic')).toBe(FORENSIC)
  })
})
