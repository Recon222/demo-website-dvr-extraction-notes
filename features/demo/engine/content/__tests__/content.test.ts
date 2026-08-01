import { describe, it, expect } from 'vitest'
import { CHAPTERS, TAB_VIEWS, isTabOnlyView } from '@/features/demo/engine/content/screens'
import { NARRATION, MODAL_NARRATION, TAB_NARRATION } from '@/features/demo/engine/content/narration'
import { SAMPLE_REQUEST_DOC } from '@/features/demo/engine/content/seed'
import { SETTINGS_CATEGORY_IDS } from '@/features/demo/engine/content/settings-catalog'
import { SWITCHABLE_FORM_FIELDS } from '@/features/demo/engine/content/form-customization'
import {
  DEFAULT_PROFILE,
  PROFILE_BLURBS,
  PROFILE_DEFAULTS,
  PROFILE_LABELS,
  describeProfile,
} from '@/features/demo/engine/content/profiles'
import { ALWAYS_ON_FIELDS, FORM_FIELDS, FORM_STEPS } from '@/features/demo/engine/content/form-customization'
import { PROFILES, type Profile } from '@/features/demo/engine/types'

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

  it('quotes the Settings registries rather than hand-typed counts (R-5)', () => {
    // The paragraph shipped "Eleven categories … 57 form fields" over a surface rendering ten
    // and fifty. Both numbers are now read from the registries the pane itself renders, so this
    // pin fails the moment a category or a switchable field is added or removed WITHOUT the
    // copy following — which is the whole failure mode, since prose has no other gate.
    const para = MODAL_NARRATION.settings!.paras[0]
    expect(SETTINGS_CATEGORY_IDS).toHaveLength(10)
    expect(SWITCHABLE_FORM_FIELDS).toHaveLength(50)
    expect(para).toContain('Ten categories')
    expect(para).toContain(`${SWITCHABLE_FORM_FIELDS.length} form fields`)
    // The two stale literals must never come back.
    expect(para).not.toContain('Eleven categories')
    expect(para).not.toContain('57 form fields')
  })

  it('the splash chapter says whose biometric gate it is describing (P8.1)', () => {
    // This copy was written while the chapter was unreachable. P8.1 put it on screen beside a
    // simulated scanner, so the two lines that read as first-person claims had to name the phone:
    // the demo's honesty rule does not let a browser tab imply an authentication happened.
    expect(NARRATION.splash.paras[0]).toMatch(/^On the phone, every session starts behind Face ID\./)
    expect(NARRATION.splash.tip).toContain('simulated scan')
    expect(NARRATION.splash.tip).toContain('nothing is authenticated here')
    expect(NARRATION.splash.tip).not.toMatch(/to authenticate\.$/)
  })

  it('carries copy for exactly the tab destinations that are NOT chapters (Map, Export)', () => {
    // Since R-27 the KEY SPACE is closed by the type: `Record<TabOnlyView, ChapterNarration>`
    // makes a missing tab-only entry and a chapter/launchable entry — which the bridge would
    // let shadow that chapter's own copy, since it consults this record first — both compile
    // errors. What is left for runtime is that the copy is real.
    const tabOnly = TAB_VIEWS.filter(isTabOnlyView)
    expect(tabOnly.length).toBeGreaterThan(0)
    expect(Object.keys(TAB_NARRATION).sort()).toEqual([...tabOnly].sort())
    for (const id of tabOnly) {
      const n = TAB_NARRATION[id]
      expect(n.eyebrow.length).toBeGreaterThan(0)
      expect(n.title.length).toBeGreaterThan(0)
      expect(n.paras.length).toBeGreaterThan(0)
    }
    // The chapters among the tabs keep their own copy in NARRATION, unshadowed.
    for (const id of TAB_VIEWS.filter((v) => !isTabOnlyView(v))) {
      expect(CHAPTERS, `tab "${id}" is neither a chapter nor tab-only`).toContain(id)
    }
  })
})

describe('seed content (the sample request survives as the live-import fallback)', () => {
  it('carries the occurrence number in the sample request document', () => {
    expect(SAMPLE_REQUEST_DOC).toContain('PR25-0098213')
  })
})

describe('profiles', () => {
  it('covers all three profiles with total default maps', () => {
    expect([...PROFILES]).toEqual(['forensic', 'limited', 'canvas'])
    for (const id of PROFILES) {
      const d = PROFILE_DEFAULTS[id]
      expect(Object.keys(d.steps).sort()).toEqual(FORM_STEPS.map((s) => s.id).sort())
      expect(Object.keys(d.fields).sort()).toEqual(FORM_FIELDS.map((f) => f.id).sort())
      expect(PROFILE_LABELS[id].length).toBeGreaterThan(0)
      expect(PROFILE_BLURBS[id].length).toBeGreaterThan(0)
    }
    expect(DEFAULT_PROFILE).toBe('forensic')
  })

  it('ships forensic and limited identical, and canvas reduced by the phone off-lists', () => {
    expect(PROFILE_DEFAULTS.limited).toEqual(PROFILE_DEFAULTS.forensic)
    expect(Object.values(PROFILE_DEFAULTS.forensic.steps).every(Boolean)).toBe(true)
    expect(Object.values(PROFILE_DEFAULTS.forensic.fields).every(Boolean)).toBe(true)

    const offSteps = FORM_STEPS.filter((s) => !PROFILE_DEFAULTS.canvas.steps[s.id]).map((s) => s.id)
    expect(offSteps).toEqual(['cameras'])
    const offFields = FORM_FIELDS.filter((f) => !PROFILE_DEFAULTS.canvas.fields[f.id]).map((f) => f.id)
    expect(offFields).toEqual([
      'submission.requesterName',
      'submission.requesterBadgeNumber',
      'submission.requesterUnit',
      'submission.requesterPhone',
      'submission.requesterEmail',
      'dvr.dvrLocation',
      'dvr.serialModelNumber',
      'dvr.numberOfChannels',
      'dvr.activeCameras',
      'dvr.recordingSchedule',
      'dvr.resolution',
      'dvr.recordingFps',
      'camera.cameraName',
      'camera.resolution',
      'camera.recordingFps',
      'camera.latitude',
      'camera.longitude',
      'camera.coordinateAccuracy',
      'camera.coordinateSource',
      'camera.coordinateCapturedAt',
    ])
  })

  it('never lets a profile default hide a mandatory field', () => {
    for (const id of PROFILES) {
      for (const field of Array.from(ALWAYS_ON_FIELDS)) {
        expect(PROFILE_DEFAULTS[id].fields[field], `${id} hides mandatory "${field}"`).toBe(true)
      }
    }
  })

  it('falls back to the default profile when asked about one that is not in the universe', () => {
    // Same defence-in-depth as the resolver's `profileDefaultsFor` (pinned in
    // form-visibility.test.ts): a throw here would throw inside the settings pane's render.
    expect(describeProfile('nope' as Profile)).toEqual(describeProfile(DEFAULT_PROFILE))
    expect(describeProfile('nope' as Profile)).toEqual({ steps: 0, fields: 0 })
  })

  it('describes each profile by COUNTING its defaults, never by its blurb', () => {
    // The reduction line the pane renders. `limited` is the reason it exists: the phone's blurb
    // calls it "lightly reduced" while its defaults drop nothing — the derived count says 0/0.
    expect(describeProfile('forensic')).toEqual({ steps: 0, fields: 0 })
    expect(describeProfile('limited')).toEqual({ steps: 0, fields: 0 })
    // Canvas: 1 screen, and 12 fields — the 20 off-list ids MINUS the 8 that live on the screen
    // it already hides, counted once as the screen rather than twice.
    expect(describeProfile('canvas')).toEqual({ steps: 1, fields: 12 })
  })
})
