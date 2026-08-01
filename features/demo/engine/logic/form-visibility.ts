import type {
  ChapterId,
  FormFieldId,
  FormStepDef,
  FormStepId,
  FormVisibility,
  ProfileDefaults,
  WizardScreenId,
} from '@/features/demo/engine/types'
import {
  FORM_FIELDS,
  LINEAR_FORM_STEPS,
  getFormField,
  getFormStep,
  isFieldAlwaysOn,
  isStepMustStay,
} from '@/features/demo/engine/content/form-customization'
import { DEFAULT_PROFILE, PROFILE_DEFAULTS } from '@/features/demo/engine/content/profiles'
import { CHAPTERS, WIZARD_SCREENS } from '@/features/demo/engine/content/screens'

/**
 * The visibility resolver — the brain behind the Settings "Form Fields" pane (P7.3, matrix A2).
 * Pure: no React, no store import. Every function takes an explicit `FormVisibility`, which
 * `DemoState` satisfies structurally, so call sites pass the store state directly and nothing
 * here allocates a wrapper per call.
 *
 * ## Precedence, per item
 *
 *   1. **always-on / must-stay** — unconditional. Derived from code reality
 *      (`content/form-customization.ts`), never from a profile or an override.
 *   2. **user override** — the sparse `formOverrides` map, when it names the id.
 *   3. **profile default** — `PROFILE_DEFAULTS[profile]`.
 *
 * ## Composition
 *
 * A field is hidden whenever its host step is hidden. That is what lets the Cameras screen be
 * switched off as ONE decision instead of eight, and it is why `describeProfile` counts a hidden
 * screen once rather than once per field.
 *
 * ## What this does NOT do
 *
 * Visibility hides **inputs**. It never suppresses data already stored: a hidden Cameras screen
 * still puts its cameras in the PDF, the case map and the export, exactly as on the phone
 * (`form-customization/README.md:17-18` — "Output policy"). Pinned by test.
 */

function profileDefaultsFor(v: FormVisibility): ProfileDefaults {
  // Defence in depth: the snapshot guard already validates `profile` against `PROFILES`, but a
  // resolver that threw would throw inside EVERY screen's render, not just the settings pane.
  return PROFILE_DEFAULTS[v.profile] ?? PROFILE_DEFAULTS[DEFAULT_PROFILE]
}

/** Effective visibility of a step. Must-stay steps are visible no matter what. */
export function resolveStepVisible(id: FormStepId, v: FormVisibility): boolean {
  if (isStepMustStay(id)) return true
  const override = v.formOverrides.steps[id]
  if (override !== undefined) return override
  return profileDefaultsFor(v).steps[id] ?? false
}

/**
 * Effective visibility of a field: always-on wins, then the host step must be visible, then the
 * override, then the profile default.
 */
export function resolveFieldVisible(id: FormFieldId, v: FormVisibility): boolean {
  if (isFieldAlwaysOn(id)) return true

  const field = getFormField(id)
  if (!field) return false

  if (!resolveStepVisible(field.screen, v)) return false

  const override = v.formOverrides.fields[id]
  if (override !== undefined) return override
  return profileDefaultsFor(v).fields[id] ?? false
}

/** Whether a step has at least one visible field — the "would this screen be blank?" question. */
export function stepHasVisibleField(id: FormStepId, v: FormVisibility): boolean {
  return FORM_FIELDS.some((f) => f.screen === id && resolveFieldVisible(f.id, v))
}

/** The ordered LINEAR steps currently in the flow (the two drawer tools excluded). */
export function getVisibleFormSteps(v: FormVisibility): FormStepDef[] {
  return LINEAR_FORM_STEPS.filter((s) => resolveStepVisible(s.id, v))
}

const isWizardScreenId = (v: string): v is WizardScreenId => (WIZARD_SCREENS as readonly string[]).includes(v)

/**
 * The app-flow chapter chain with hidden wizard screens removed.
 *
 * The demo's chain is wider than the phone's step list — it opens with `splash`/`dashboard`/
 * `cases`, which are not form steps and can never be hidden. Only the wizard tail is filtered,
 * so Back from the first visible wizard screen still lands on Cases exactly as before.
 */
export function getVisibleChapters(v: FormVisibility): ChapterId[] {
  return CHAPTERS.filter((c) => !isWizardScreenId(c) || resolveStepVisible(c, v))
}

/**
 * The next chapter the wizard's "Continue" should reach, or `null` at the end.
 *
 * Robust to `id` itself being hidden — a stale restore, or a screen switched off from under a
 * deep link — by falling back to the first visible chapter AFTER its position in the registry,
 * the same fallback the phone's `getNextStep` makes (`services/visibility-resolver.ts:65-73`).
 */
export function nextVisibleChapter(id: ChapterId, v: FormVisibility): ChapterId | null {
  const visible = getVisibleChapters(v)
  const i = visible.indexOf(id)
  if (i !== -1) return visible[i + 1] ?? null

  const at = CHAPTERS.indexOf(id)
  if (at === -1) return null
  return visible.find((c) => CHAPTERS.indexOf(c) > at) ?? null
}

/** The previous visible chapter, or `null` at the start. Same hidden-current fallback. */
export function prevVisibleChapter(id: ChapterId, v: FormVisibility): ChapterId | null {
  const visible = getVisibleChapters(v)
  const i = visible.indexOf(id)
  if (i !== -1) return i > 0 ? visible[i - 1] : null

  const at = CHAPTERS.indexOf(id)
  if (at === -1) return null
  const before = visible.filter((c) => CHAPTERS.indexOf(c) < at)
  return before.length > 0 ? before[before.length - 1] : null
}

/** Whether a step id names a step at all — the pane's guard for a stale override key. */
export function isKnownFormStep(id: string): id is FormStepId {
  return getFormStep(id as FormStepId) !== undefined
}

/** Whether a field id names a field at all — same job, field side. */
export function isKnownFormField(id: string): id is FormFieldId {
  return getFormField(id as FormFieldId) !== undefined
}
