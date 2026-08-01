import { describe, it, expect } from 'vitest'
import {
  ADDITIVE_FORM_STEPS,
  ALWAYS_ON_FIELDS,
  FORM_FIELDS,
  FORM_STEPS,
  LINEAR_FORM_STEPS,
  getFieldGroupMembers,
  getFormField,
  getFormStep,
  getStepFields,
  isFieldAlwaysOn,
  isStepMustStay,
} from '@/features/demo/engine/content/form-customization'
import { DRAWER_DEFS, LAUNCHABLE, WIZARD_SCREENS } from '@/features/demo/engine/content/screens'
import { EXPLORE_ITEMS } from '@/features/demo/engine/content/explore'
import { ADDITIVE_FORM_STEP_IDS } from '@/features/demo/engine/types'
import { FINAL_SUBMISSION_MESSAGES, validateFinalSubmission } from '@/features/demo/engine/logic/final-submission'
import type { FormFieldId } from '@/features/demo/engine/types'

/**
 * Registry drift guards for the Form Fields pane (P7.3). The grid is only trustworthy while
 * its rows are the wizard's own rows and its locks are the completion validator's own rules —
 * these pin both, so a screen added to the flow or a rule added to the validator cannot leave a
 * silently stale settings grid behind.
 */

describe('form-customization step registry', () => {
  it('IS the drawer registry — same ids, same labels, same order', () => {
    expect(LINEAR_FORM_STEPS.map((s) => s.id)).toEqual(DRAWER_DEFS.map((d) => d.id))
    expect(LINEAR_FORM_STEPS.map((s) => s.label)).toEqual(DRAWER_DEFS.map((d) => d.label))
    // …and the drawer registry is the wizard's flow order, which is what makes the pane's rows
    // the flow's steps rather than a parallel hand-kept list.
    expect(DRAWER_DEFS.map((d) => d.id)).toEqual([...WIZARD_SCREENS])
  })

  it('derives order from array position, linear steps first and tools after', () => {
    expect(LINEAR_FORM_STEPS.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(ADDITIVE_FORM_STEPS.map((s) => s.order)).toEqual([101, 102])
    expect(FORM_STEPS).toHaveLength(12)
    expect(FORM_STEPS.map((s) => s.order)).toEqual([...FORM_STEPS].sort((a, b) => a.order - b.order).map((s) => s.order))
  })

  it('classifies every additive tool as a tool and every linear step as a step', () => {
    // The linear half is now a COMPILE guarantee, not a runtime one: `LinearFormStepDef` pins
    // `additive?: false`, so `s.additive !== true` no longer typechecks as a meaningful
    // comparison (R-22). What is left to assert at runtime is the value, and the tools' side.
    expect(LINEAR_FORM_STEPS.map((s) => s.additive)).toEqual(LINEAR_FORM_STEPS.map(() => undefined))
    expect(ADDITIVE_FORM_STEPS.every((s) => s.additive === true)).toBe(true)
    // …and the linear ids ARE the drawer's, which is what the narrowing rests on.
    expect(LINEAR_FORM_STEPS.map((s) => s.id)).toEqual([...WIZARD_SCREENS])
  })

  it('covers every launchable except ocr (Decision OD-1) — exhaustively', () => {
    expect([...ADDITIVE_FORM_STEP_IDS].sort()).toEqual(LAUNCHABLE.filter((id) => id !== 'ocr').sort())
  })

  it('labels the two tools exactly as the drawer accordion and the rail checklist do', () => {
    for (const step of ADDITIVE_FORM_STEPS) {
      const item = EXPLORE_ITEMS.find((i) => i.id === step.id)
      expect(item, `no explore item for tool "${step.id}"`).toBeTruthy()
      expect(step.label).toBe(item!.label)
    }
  })

  it('resolves every step id, and only the three documented linear screens are screen-only', () => {
    for (const step of FORM_STEPS) expect(getFormStep(step.id)).toBe(step)
    expect(LINEAR_FORM_STEPS.filter((s) => s.classification === 'screen-only').map((s) => s.id)).toEqual([
      'timeOffset',
      'extractedScope',
      'notes',
    ])
  })
})

describe('form-customization field registry', () => {
  it('holds the phone inventory: 58 unique ids on real steps', () => {
    expect(FORM_FIELDS).toHaveLength(58)
    expect(new Set(FORM_FIELDS.map((f) => f.id)).size).toBe(58)
    const stepIds = new Set(FORM_STEPS.map((s) => s.id))
    for (const f of FORM_FIELDS) {
      expect(stepIds.has(f.screen), `field "${f.id}" names unknown screen "${f.screen}"`).toBe(true)
      expect(f.label.length).toBeGreaterThan(0)
    }
  })

  it('names a store key for every field except the two derived ones', () => {
    const derived = FORM_FIELDS.filter((f) => f.storeKey === undefined).map((f) => f.id)
    expect(derived).toEqual(['submission.address', 'dvr.daysUntilOverwritten'])
    for (const f of FORM_FIELDS) {
      if (f.storeKey !== undefined) expect(f.storeKey.length).toBeGreaterThan(0)
    }
  })

  it('gives every field-capable step at least one field, and every screen-only step none of the pane', () => {
    for (const step of FORM_STEPS) {
      const fields = getStepFields(step.id)
      if (step.classification === 'field-capable') {
        expect(fields.length, `field-capable step "${step.id}" has no fields`).toBeGreaterThan(0)
      }
    }
    // The two tools host no fields at all — their rows are pure screen switches.
    for (const step of ADDITIVE_FORM_STEPS) expect(getStepFields(step.id)).toEqual([])
  })

  it('toggles the two GPS blocks atomically and everything else alone', () => {
    expect(getFieldGroupMembers('submission.latitude').map((f) => f.id)).toEqual([
      'submission.latitude',
      'submission.longitude',
      'submission.coordinateAccuracy',
      'submission.coordinateSource',
    ])
    expect(getFieldGroupMembers('camera.coordinateSource').map((f) => f.id)).toEqual([
      'camera.latitude',
      'camera.longitude',
      'camera.coordinateAccuracy',
      'camera.coordinateSource',
      'camera.coordinateCapturedAt',
    ])
    expect(getFieldGroupMembers('dvr.dvrLocation').map((f) => f.id)).toEqual(['dvr.dvrLocation'])
    // Every grouped field resolves to the SAME member list, whichever one is asked.
    for (const f of FORM_FIELDS.filter((f) => f.group)) {
      expect(getFieldGroupMembers(f.id).map((m) => m.id)).toEqual(
        FORM_FIELDS.filter((m) => m.group === f.group).map((m) => m.id),
      )
    }
  })

  it('returns no members for an id that is not in the registry', () => {
    // The unknown-id guard, mirroring the two neighbouring guards pinned in
    // form-visibility.test.ts. A cast is the only way to reach it — which is the point: a JS
    // caller or a stale persisted key must get an empty list, never a crash mid-toggle.
    expect(getFieldGroupMembers('dvr.nope' as FormFieldId)).toEqual([])
  })

  it('resolves every field id', () => {
    for (const f of FORM_FIELDS) expect(getFormField(f.id)).toBe(f)
  })
})

describe('capability invariants', () => {
  it('locks on every field the completion validator can block on', () => {
    /**
     * TOTAL over the validator's own rule keys — a fourth rule in `final-submission.ts` is a
     * COMPILE error here, not a silently hideable required field. The values are the fields a
     * visitor would have to fill to clear each rule; every one must be locked on.
     */
    // NON-EMPTY (R-26): `readonly FormFieldId[]` let a new rule discharge the compile gate with
    // `[]` — the key would be forced, the assertion loop would iterate zero times, and the
    // "a fourth rule is a compile error" claim would be satisfied by a value that proves
    // nothing. The tuple type makes the coverage list itself mandatory.
    const coveredBy: Record<keyof typeof FINAL_SUBMISSION_MESSAGES, readonly [FormFieldId, ...FormFieldId[]]> = {
      occNumber: ['submission.occNumber'],
      address: ['submission.address', 'submission.businessName', 'submission.streetAddress', 'submission.city'],
      scopes: ['scope.startDateTime', 'scope.endDateTime'],
    }
    // The empty location really does fire all three — otherwise the map above could go stale
    // against a rule the validator quietly stopped enforcing.
    const outcome = validateFinalSubmission({ occNumber: '', address: '', scopes: [] })
    expect(outcome.ok).toBe(false)
    expect(outcome.ok === false && [...outcome.errors].sort()).toEqual(
      Object.values(FINAL_SUBMISSION_MESSAGES).sort(),
    )
    for (const ids of Object.values(coveredBy)) {
      for (const id of ids) expect(isFieldAlwaysOn(id), `"${id}" clears a completion rule but is not locked`).toBe(true)
    }
  })

  it('locks the two Time Offset calibration inputs', () => {
    expect(isFieldAlwaysOn('timeoffset.dvrDateTime')).toBe(true)
    expect(isFieldAlwaysOn('timeoffset.actualDateTime')).toBe(true)
    // …and NOT the optional third one.
    expect(isFieldAlwaysOn('timeoffset.dvrAppliesDST')).toBe(false)
  })

  it('keeps exactly the screens that host a mandatory field, plus the terminal one', () => {
    const mustStay = FORM_STEPS.filter((s) => isStepMustStay(s.id)).map((s) => s.id)
    expect(mustStay).toEqual(['submission', 'requestedScope', 'timeOffset', 'completion'])
  })

  it('never places an always-on field on a removable screen', () => {
    for (const id of Array.from(ALWAYS_ON_FIELDS)) {
      const field = getFormField(id)
      expect(field, `always-on id "${id}" is not in the registry`).toBeTruthy()
      expect(isStepMustStay(field!.screen)).toBe(true)
    }
  })

  it('leaves the wizard step Submission promises by name un-hideable', () => {
    // `SubmissionScreen` renders a literal "Next: Requested Scope" (the demo's one NAMED next
    // label). That copy can only stay honest while the step it names cannot be hidden.
    expect(isStepMustStay('requestedScope')).toBe(true)
  })
})
