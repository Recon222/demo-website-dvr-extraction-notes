import { describe, it, expect } from 'vitest'
import { freshStore, newCaseInput, newLocationInput } from './test-utils'
import {
  resolveFieldVisible,
  resolveStepVisible,
  stepHasVisibleField,
} from '@/features/demo/engine/logic/form-visibility'
import {
  selectDrawerItems,
  selectExploreStatus,
  selectMediaToolsVisible,
  selectVisibleWizardScreens,
} from '@/features/demo/engine/store/selectors'
import { FORM_FIELDS } from '@/features/demo/engine/content/form-customization'

/**
 * The four Form Fields actions (P7.3). The store is the second of the two guard layers — the
 * resolver forces mandatory items visible at READ time, and these refuse to record a
 * contradicting override at WRITE time — so each no-op is asserted by IDENTITY, the house pin
 * for "nothing happened at all" (a `set` that writes an ignored key would still wake every
 * subscriber and trigger a snapshot write).
 */

describe('applyFormProfile', () => {
  it('sets the profile and clears every override — a stamp, not a layer', () => {
    const store = freshStore()
    store.getState().setFormStepVisible('cameras', false)
    store.getState().setFormFieldVisible('dvr.dvrUsername', false)
    expect(store.getState().formOverrides.steps.cameras).toBe(false)

    store.getState().applyFormProfile('canvas')
    expect(store.getState().profile).toBe('canvas')
    expect(store.getState().formOverrides).toEqual({ steps: {}, fields: {} })
    // …and the canvas defaults now apply: cameras is off because the PROFILE says so.
    expect(resolveStepVisible('cameras', store.getState())).toBe(false)
    expect(resolveFieldVisible('dvr.dvrUsername', store.getState())).toBe(true)
  })

  it('is the reset path: leave the profile and come back, and the overrides are gone', () => {
    // The phone has a `resetToProfileDefaults` action with NO caller anywhere in its UI
    // (`FormCustomizationSection.tsx` never invokes it), so neither app ships a Reset control —
    // re-stamping a profile is how a visitor gets back to defaults on both sides. Deferred §82.
    const store = freshStore()
    store.getState().setFormStepVisible('cameras', false)
    store.getState().applyFormProfile('canvas')
    store.getState().applyFormProfile('forensic')
    expect(store.getState().formOverrides).toEqual({ steps: {}, fields: {} })
    expect(resolveStepVisible('cameras', store.getState())).toBe(true)
  })
})

describe('setFormStepVisible', () => {
  it('is a TRUE no-op for a must-stay step', () => {
    const store = freshStore()
    const before = store.getState()
    store.getState().setFormStepVisible('completion', false)
    store.getState().setFormStepVisible('submission', false)
    store.getState().setFormStepVisible('timeOffset', false)
    expect(store.getState()).toBe(before)
  })

  it('hides a removable step and drops it out of the flow', () => {
    const store = freshStore()
    store.getState().setFormStepVisible('cameras', false)
    expect(resolveStepVisible('cameras', store.getState())).toBe(false)
    expect(selectVisibleWizardScreens(store.getState())).not.toContain('cameras')
    expect(selectDrawerItems(store.getState()).map((d) => d.id)).not.toContain('cameras')
  })

  it('re-enabling a screen restores its fields rather than landing on a blank one', () => {
    const store = freshStore()
    // Trim the DVR screen down to nothing — which auto-hides it (see below) …
    for (const f of FORM_FIELDS.filter((f) => f.screen === 'dvrInfo')) {
      store.getState().setFormFieldVisible(f.id, false)
    }
    expect(resolveStepVisible('dvrInfo', store.getState())).toBe(false)
    // … and switching it back on clears the field overrides to the profile's defaults.
    store.getState().setFormStepVisible('dvrInfo', true)
    expect(resolveStepVisible('dvrInfo', store.getState())).toBe(true)
    expect(stepHasVisibleField('dvrInfo', store.getState())).toBe(true)
    expect(resolveFieldVisible('dvr.dvrLocation', store.getState())).toBe(true)
  })

  it('forces fields on when the PROFILE itself would leave the screen blank', () => {
    // canvas hides every camera field. Re-enabling Cameras under canvas has no default to fall
    // back to, so the action forces them on — otherwise the visitor gets an empty screen.
    const store = freshStore()
    store.getState().applyFormProfile('canvas')
    store.getState().setFormStepVisible('cameras', true)
    expect(resolveStepVisible('cameras', store.getState())).toBe(true)
    expect(resolveFieldVisible('camera.cameraName', store.getState())).toBe(true)
    expect(resolveFieldVisible('camera.latitude', store.getState())).toBe(true)
  })

  it('never wipes a PARTIAL trim when a screen is re-enabled', () => {
    const store = freshStore()
    store.getState().setFormFieldVisible('dvr.dvrPassword', false)
    store.getState().setFormStepVisible('dvrInfo', false)
    store.getState().setFormStepVisible('dvrInfo', true)
    // Something was still visible, so the restore branch must not have fired.
    expect(resolveFieldVisible('dvr.dvrPassword', store.getState())).toBe(false)
    expect(resolveFieldVisible('dvr.dvrLocation', store.getState())).toBe(true)
  })

  it('switches the two drawer capture tools, and never the library', () => {
    const store = freshStore()
    expect(selectMediaToolsVisible(store.getState())).toEqual({ mediaCapture: true, audioRecording: true })
    store.getState().setFormStepVisible('audioRecording', false)
    expect(selectMediaToolsVisible(store.getState())).toEqual({ mediaCapture: true, audioRecording: false })
  })
})

describe('setFormFieldVisible', () => {
  it('is a TRUE no-op for an always-on field', () => {
    const store = freshStore()
    const before = store.getState()
    store.getState().setFormFieldVisible('submission.occNumber', false)
    store.getState().setFormFieldVisible('scope.startDateTime', false)
    expect(store.getState()).toBe(before)
  })

  it('moves a GPS group atomically, both directions', () => {
    const store = freshStore()
    store.getState().setFormFieldVisible('submission.coordinateAccuracy', false)
    for (const id of ['submission.latitude', 'submission.longitude', 'submission.coordinateAccuracy', 'submission.coordinateSource'] as const) {
      expect(resolveFieldVisible(id, store.getState()), id).toBe(false)
    }
    store.getState().setFormFieldVisible('submission.latitude', true)
    for (const id of ['submission.latitude', 'submission.longitude', 'submission.coordinateAccuracy', 'submission.coordinateSource'] as const) {
      expect(resolveFieldVisible(id, store.getState()), id).toBe(true)
    }
    // …and an ungrouped field moves alone.
    store.getState().setFormFieldVisible('dvr.dvrUsername', false)
    expect(resolveFieldVisible('dvr.dvrPassword', store.getState())).toBe(true)
  })

  it('auto-hides a removable screen once its last visible field goes off', () => {
    const store = freshStore()
    const dvrFields = FORM_FIELDS.filter((f) => f.screen === 'dvrInfo')
    for (const f of dvrFields.slice(0, -1)) store.getState().setFormFieldVisible(f.id, false)
    expect(resolveStepVisible('dvrInfo', store.getState())).toBe(true)
    store.getState().setFormFieldVisible(dvrFields[dvrFields.length - 1].id, false)
    expect(resolveStepVisible('dvrInfo', store.getState())).toBe(false)
    expect(selectVisibleWizardScreens(store.getState())).not.toContain('dvrInfo')
  })

  it('leaves a MUST-STAY screen standing when its optional fields are all off', () => {
    // Submission keeps its always-on address block, so emptying the optional fields must not
    // trip the cascade — the exemption is what keeps the mandatory inputs reachable.
    const store = freshStore()
    for (const f of FORM_FIELDS.filter((f) => f.screen === 'submission')) {
      store.getState().setFormFieldVisible(f.id, false)
    }
    expect(resolveStepVisible('submission', store.getState())).toBe(true)
    expect(resolveFieldVisible('submission.occNumber', store.getState())).toBe(true)
    expect(resolveFieldVisible('submission.requesterName', store.getState())).toBe(false)

    // R-12: the body above never reaches the exemption. Submission's always-on fields keep
    // `stepHasVisibleField` true, so the cascade branch is not entered at all, and the
    // assertion above is satisfied by the READ-force layer regardless of what was written.
    // `completion` is the ONLY must-stay screen with no always-on field, so it is the branch's
    // one reachable case — and the assertion has to be on the WRITE side, because a
    // `steps.completion = false` written here would ride into the v7 snapshot as a record the
    // resolver ignores and the pane can never clear (`setFormStepVisible` refuses must-stay).
    const terminal = freshStore()
    terminal.getState().setFormFieldVisible('completion.dateTimeCompleted', false)
    terminal.getState().setFormFieldVisible('completion.completedBy', false)
    expect(terminal.getState().formOverrides.steps).toEqual({})
    expect(resolveStepVisible('completion', terminal.getState())).toBe(true)
  })

  it('never auto-SHOWS a screen — the cascade is one-way', () => {
    const store = freshStore()
    store.getState().setFormStepVisible('cameras', false)
    store.getState().setFormFieldVisible('camera.cameraName', true)
    expect(resolveStepVisible('cameras', store.getState())).toBe(false)
  })
})

describe('the rail checklist follows the visible flow', () => {
  it('drops the row for a screen this visitor will never reach', () => {
    const store = freshStore()
    const all = selectExploreStatus(store.getState()).map((i) => i.id)
    expect(all).toContain('cameras')

    store.getState().applyFormProfile('canvas')
    const canvas = selectExploreStatus(store.getState())
    expect(canvas.map((i) => i.id)).not.toContain('cameras')
    // Numbering stays positional over what remains — no gap where the row used to be.
    expect(canvas.map((i) => i.number)).toEqual(canvas.map((_, i) => String(i + 1).padStart(2, '0')))
  })

  it('drops a capture tool row with the tool itself', () => {
    const store = freshStore()
    store.getState().setFormStepVisible('mediaCapture', false)
    expect(selectExploreStatus(store.getState()).map((i) => i.id)).not.toContain('mediaCapture')
    // …and leaves the library row, which is not a form step.
    expect(selectExploreStatus(store.getState()).map((i) => i.id)).toContain('mediaLibrary')
  })
})

describe('output policy: hiding an input never removes stored data', () => {
  it('keeps a hidden screen entries in the location record', () => {
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    store.getState().addLocation(caseId, newLocationInput())
    store.getState().updateField('form.cameras', [
      { id: 'cam1', cameraName: 'Front door', resolution: '1080p', recordingFps: '15' },
    ])
    store.getState().updateField('form.dvr.dvrUsername', 'admin')

    store.getState().applyFormProfile('canvas') // hides the Cameras screen entirely
    store.getState().setFormFieldVisible('dvr.dvrUsername', false)

    const loc = store.getState().locations[0]
    expect(loc.form.cameras).toHaveLength(1)
    expect(loc.form.cameras[0].cameraName).toBe('Front door')
    expect(loc.form.dvr.dvrUsername).toBe('admin')
  })
})
