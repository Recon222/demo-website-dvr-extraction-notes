import type { FormFieldId, FormStepId, Profile, ProfileDefaults } from '@/features/demo/engine/types'
import { FORM_FIELDS, FORM_STEPS } from '@/features/demo/engine/content/form-customization'

/**
 * The three deployment profiles and their out-of-the-box visibility (P7.3, decision D9).
 *
 * A profile is a DEFAULT, never a lock: the visitor can toggle anything afterwards except the
 * mandatory set, which the resolver forces visible regardless of what any profile says. Authored
 * as off-lists (reduce-from-a-full-baseline) and expanded to total maps, exactly as the phone
 * does it (`src/features/form-customization/config/profiles.ts:28-76`), so the source stays
 * readable as "what this profile drops" while the contract stays total.
 *
 * Values are the phone's verbatim:
 *   - forensic — everything on. The default.
 *   - limited  — comprehensive; nothing off (see `PROFILE_BLURBS`' note).
 *   - canvas   — reduced for non-extracting canvassers: the requester-contact chain, most DVR
 *                specs, and the whole Cameras screen.
 */

const ALL_STEP_IDS: readonly FormStepId[] = FORM_STEPS.map((s) => s.id)
const ALL_FIELD_IDS: readonly FormFieldId[] = FORM_FIELDS.map((f) => f.id)

/**
 * Expand an off-list into a TOTAL map. `Object.fromEntries` over the registry rather than
 * `{} as Record<…>` + a loop (review R-24): the empty-object cast asserted totality before a
 * single key existed, which is the assumption the resolver's `?? false` arms were hedging
 * against. Mapping every registry id in one expression makes the map total by construction —
 * `content.test.ts` pins the key sets against both registries, and the `??`s are gone.
 */
function buildDefaults(offSteps: readonly FormStepId[], offFields: readonly FormFieldId[]): ProfileDefaults {
  const offStepSet = new Set<FormStepId>(offSteps)
  const offFieldSet = new Set<FormFieldId>(offFields)
  return {
    steps: Object.fromEntries(ALL_STEP_IDS.map((id) => [id, !offStepSet.has(id)])) as Record<FormStepId, boolean>,
    fields: Object.fromEntries(ALL_FIELD_IDS.map((id) => [id, !offFieldSet.has(id)])) as Record<FormFieldId, boolean>,
  }
}

/** Phone `profiles.ts:44`. */
const CANVAS_OFF_STEPS: readonly FormStepId[] = ['cameras']

/** Phone `profiles.ts:46-70`, id for id. */
const CANVAS_OFF_FIELDS: readonly FormFieldId[] = [
  // requester contact identity — canvassers log the location, not the requester chain
  'submission.requesterName',
  'submission.requesterBadgeNumber',
  'submission.requesterUnit',
  'submission.requesterPhone',
  'submission.requesterEmail',
  // DVR technical specs — beyond a canvass scope (brand + creds + retention kept)
  'dvr.dvrLocation',
  'dvr.serialModelNumber',
  'dvr.numberOfChannels',
  'dvr.activeCameras',
  'dvr.recordingSchedule',
  'dvr.resolution',
  'dvr.recordingFps',
  // per-camera inventory — the Cameras screen is off for canvas
  'camera.cameraName',
  'camera.resolution',
  'camera.recordingFps',
  'camera.latitude',
  'camera.longitude',
  'camera.coordinateAccuracy',
  'camera.coordinateSource',
  'camera.coordinateCapturedAt',
]

export const PROFILE_DEFAULTS: Record<Profile, ProfileDefaults> = {
  forensic: buildDefaults([], []),
  limited: buildDefaults([], []),
  canvas: buildDefaults(CANVAS_OFF_STEPS, CANVAS_OFF_FIELDS),
}

export const DEFAULT_PROFILE: Profile = 'forensic'

/** Chip labels — phone `components/ProfilePicker.tsx:17-21`. */
export const PROFILE_LABELS: Record<Profile, string> = {
  forensic: 'Forensic',
  limited: 'Limited',
  canvas: 'Canvas',
}

/**
 * The blurb under the chips — phone `components/ProfilePicker.tsx:23-27`, verbatim.
 *
 * `limited`'s line says "lightly reduced" while its defaults drop nothing at all
 * (`config/profiles.ts:13` is explicit: "limited: comprehensive — nothing off"). That is the
 * phone's own copy/behaviour mismatch, carried here rather than quietly corrected — but the pane
 * pairs each blurb with a DERIVED reduction count (`describeProfile` below), which cannot drift
 * from the defaults it counts. A visitor reading "lightly reduced" beside "hides nothing" learns
 * the truth from the number, not from the copy. See deferred §82 and PHONE-BUG-LEDGER item 18.
 */
export const PROFILE_BLURBS: Record<Profile, string> = {
  forensic: 'Everything on — full forensic detail (FVA/FVT).',
  limited: 'Comprehensive, lightly reduced (SPC/SOCO).',
  canvas: 'Streamlined for canvassing — fewer technical fields.',
}

export interface ProfileReduction {
  /** Steps this profile hides by default. */
  steps: number
  /** Fields it hides by default — counting only fields on screens it STILL SHOWS, so a hidden
   *  screen is reported once (as a screen) rather than again as each of its fields. */
  fields: number
}

/**
 * What a profile actually drops, counted from `PROFILE_DEFAULTS` at call time. Derived so the
 * pane's summary line can never promise a reduction the defaults do not deliver.
 */
export function describeProfile(id: Profile): ProfileReduction {
  const defaults = PROFILE_DEFAULTS[id] ?? PROFILE_DEFAULTS[DEFAULT_PROFILE]
  const hiddenSteps = new Set(ALL_STEP_IDS.filter((s) => !defaults.steps[s]))
  const fields = FORM_FIELDS.filter((f) => !defaults.fields[f.id] && !hiddenSteps.has(f.screen))
  return { steps: hiddenSteps.size, fields: fields.length }
}
