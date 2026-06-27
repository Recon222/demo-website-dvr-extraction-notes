import { describe, it, expect } from 'vitest'
import { TOUR_CHAPTERS } from '@/lib/demo/content/screens'
import { NARRATION, MODAL_NARRATION } from '@/lib/demo/content/narration'
import { SEED_CASE, SEED_LOCATION, SAMPLE_REQUEST_DOC } from '@/lib/demo/content/seed'
import { FORENSIC, getProfile } from '@/lib/demo/content/profiles'

describe('narration', () => {
  it('has non-empty copy for every tour chapter', () => {
    for (const id of TOUR_CHAPTERS) {
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
    for (const id of TOUR_CHAPTERS) {
      expect(NARRATION[id].eyebrow).not.toMatch(/^\s*\d/)
    }
  })

  it('has modal/launch-screen copy for newCase, newLocation, import and ocr', () => {
    for (const id of ['newCase', 'newLocation', 'import', 'ocr'] as const) {
      const n = MODAL_NARRATION[id]
      expect(n, `modal narration missing for "${id}"`).toBeTruthy()
      expect(n!.title.length).toBeGreaterThan(0)
      expect(n!.paras.length).toBeGreaterThan(0)
    }
  })
})

describe('seed', () => {
  it('marks the seed case and location as demo seed data', () => {
    expect(SEED_CASE.isSeed).toBe(true)
    expect(SEED_LOCATION.isSeed).toBe(true)
    expect(SEED_LOCATION.caseId).toBe(SEED_CASE.id)
    expect(SEED_CASE.locationIds).toContain(SEED_LOCATION.id)
  })

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
