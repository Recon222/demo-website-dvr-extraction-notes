import { describe, it, expect } from 'vitest'
import {
  getVisibleChapters,
  getVisibleFormSteps,
  isKnownFormField,
  isKnownFormStep,
  nextVisibleChapter,
  prevVisibleChapter,
  resolveFieldVisible,
  resolveStepVisible,
  stepHasVisibleField,
} from '@/features/demo/engine/logic/form-visibility'
import { CHAPTERS } from '@/features/demo/engine/content/screens'
import type { FormOverrides, FormVisibility, Profile } from '@/features/demo/engine/types'

const NO_OVERRIDES: FormOverrides = { steps: {}, fields: {} }
const vis = (profile: Profile = 'forensic', formOverrides: FormOverrides = NO_OVERRIDES): FormVisibility => ({
  profile,
  formOverrides,
})

describe('precedence: always-on > user override > profile default', () => {
  it('forces a mandatory field visible against an explicit off override', () => {
    const v = vis('forensic', { steps: {}, fields: { 'submission.occNumber': false } })
    expect(resolveFieldVisible('submission.occNumber', v)).toBe(true)
  })

  it('forces a must-stay step visible against an explicit off override', () => {
    const v = vis('forensic', { steps: { completion: false, submission: false }, fields: {} })
    expect(resolveStepVisible('completion', v)).toBe(true)
    expect(resolveStepVisible('submission', v)).toBe(true)
  })

  it('lets an override beat the profile default in BOTH directions', () => {
    // canvas hides the requester chain by default…
    expect(resolveFieldVisible('submission.requesterName', vis('canvas'))).toBe(false)
    // …an override switches it back on…
    expect(
      resolveFieldVisible('submission.requesterName', vis('canvas', { steps: {}, fields: { 'submission.requesterName': true } })),
    ).toBe(true)
    // …and switches a forensic default off.
    expect(
      resolveFieldVisible('submission.requesterName', vis('forensic', { steps: {}, fields: { 'submission.requesterName': false } })),
    ).toBe(false)
  })

  it('falls back to the profile default for an id nobody overrode', () => {
    expect(resolveFieldVisible('dvr.serialModelNumber', vis('forensic'))).toBe(true)
    expect(resolveFieldVisible('dvr.serialModelNumber', vis('canvas'))).toBe(false)
    expect(resolveStepVisible('cameras', vis('forensic'))).toBe(true)
    expect(resolveStepVisible('cameras', vis('canvas'))).toBe(false)
  })

  it('falls back to the default profile when the persisted one is out of universe', () => {
    // Defence in depth — the snapshot guard validates `profile`, but a throwing resolver would
    // throw inside every screen's render, not just the pane's.
    const rogue = { profile: 'nope' as Profile, formOverrides: NO_OVERRIDES }
    expect(resolveStepVisible('cameras', rogue)).toBe(true)
    expect(resolveFieldVisible('dvr.serialModelNumber', rogue)).toBe(true)
  })
})

describe('composition: a field is never visible on a hidden screen', () => {
  it('hides every camera field when the Cameras screen is off, override or not', () => {
    const v = vis('forensic', { steps: { cameras: false }, fields: { 'camera.cameraName': true } })
    expect(resolveStepVisible('cameras', v)).toBe(false)
    expect(resolveFieldVisible('camera.cameraName', v)).toBe(false)
    expect(resolveFieldVisible('camera.latitude', v)).toBe(false)
    expect(stepHasVisibleField('cameras', v)).toBe(false)
  })

  it('reports a screen with something left to show', () => {
    expect(stepHasVisibleField('dvrInfo', vis('canvas'))).toBe(true)
    expect(stepHasVisibleField('cameras', vis('canvas'))).toBe(false)
  })
})

describe('the visible step set', () => {
  it('is all ten linear steps under forensic and nine under canvas', () => {
    expect(getVisibleFormSteps(vis('forensic'))).toHaveLength(10)
    const canvas = getVisibleFormSteps(vis('canvas')).map((s) => s.id)
    expect(canvas).toHaveLength(9)
    expect(canvas).not.toContain('cameras')
  })

  it('never includes the two additive tools', () => {
    const ids = getVisibleFormSteps(vis('forensic')).map((s) => s.id)
    expect(ids).not.toContain('mediaCapture')
    expect(ids).not.toContain('audioRecording')
  })
})

describe('chapter navigation derived from the visible set', () => {
  it('skips a hidden screen going forward and back', () => {
    const v = vis('canvas')
    expect(nextVisibleChapter('dvrInfo', v)).toBe('exportInfo')
    expect(prevVisibleChapter('exportInfo', v)).toBe('dvrInfo')
  })

  it('leaves the pre-wizard chapters alone — Back from Submission is still Cases', () => {
    const v = vis('canvas', { steps: { arrivalDeparture: false }, fields: {} })
    expect(getVisibleChapters(v).slice(0, 3)).toEqual(['splash', 'dashboard', 'cases'])
    expect(prevVisibleChapter('submission', v)).toBe('cases')
    expect(nextVisibleChapter('cases', v)).toBe('submission')
  })

  it('stops at the ends', () => {
    expect(nextVisibleChapter('completion', vis())).toBeNull()
    expect(prevVisibleChapter('splash', vis())).toBeNull()
  })

  it('walks the whole visible chain forward and back without revisiting a hidden screen', () => {
    const v = vis('canvas', { steps: { exportInfo: false }, fields: {} })
    const walked: string[] = ['splash']
    let cur = nextVisibleChapter('splash', v)
    while (cur) {
      walked.push(cur)
      cur = nextVisibleChapter(cur, v)
    }
    expect(walked).toEqual(getVisibleChapters(v))
    expect(walked).not.toContain('cameras')
    expect(walked).not.toContain('exportInfo')
    // …and the reverse walk is the exact mirror.
    const back: string[] = ['completion']
    let p = prevVisibleChapter('completion', v)
    while (p) {
      back.push(p)
      p = prevVisibleChapter(p, v)
    }
    expect(back.reverse()).toEqual(walked)
  })

  it('recovers from standing on a screen that is now hidden', () => {
    // The stale-deep-link case: `cameras` is not in the visible chain, so Next/Back fall back
    // to the neighbours by registry position rather than returning null and stranding the user.
    const v = vis('canvas')
    expect(getVisibleChapters(v)).not.toContain('cameras')
    expect(nextVisibleChapter('cameras', v)).toBe('exportInfo')
    expect(prevVisibleChapter('cameras', v)).toBe('dvrInfo')
  })

  it('returns null for an id outside the chapter registry', () => {
    expect(nextVisibleChapter('nope' as never, vis())).toBeNull()
    expect(prevVisibleChapter('nope' as never, vis())).toBeNull()
  })

  it('keeps the forensic chain identical to the raw registry', () => {
    expect(getVisibleChapters(vis('forensic'))).toEqual([...CHAPTERS])
  })
})

describe('id guards', () => {
  it('recognises real ids and rejects strangers', () => {
    expect(isKnownFormStep('cameras')).toBe(true)
    expect(isKnownFormStep('mediaCapture')).toBe(true)
    expect(isKnownFormStep('ocr')).toBe(false)
    expect(isKnownFormField('dvr.dvrLocation')).toBe(true)
    expect(isKnownFormField('dvr.nope')).toBe(false)
  })

  it('resolves an unknown field id to hidden rather than throwing', () => {
    expect(resolveFieldVisible('dvr.nope' as never, vis())).toBe(false)
  })
})
