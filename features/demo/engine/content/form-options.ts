/**
 * Canonical form-option lists — the demo's SINGLE source of truth for every dropdown /
 * multi-select enum in the wizard, lifted verbatim from the phone app's
 * `src/constants/FormOptions.ts` (label→value pairs included):
 *
 *   EXPORT_MEDIA_OPTIONS   FormOptions.ts:16-23
 *   FILE_TYPE_OPTIONS      FormOptions.ts:25-32
 *   MEDIA_PROVIDED_OPTIONS FormOptions.ts:34-40
 *   RESOLUTION_OPTIONS     FormOptions.ts:45-54  (8 options incl. CIF/4CIF/960H + `custom`)
 *   FPS_OPTIONS            FormOptions.ts:59-68  (1/5/10/15/20/25/30 + `custom`)
 *   isCustomResolution/Fps FormOptions.ts:73-93  (incl. the PF-14 empty-string guard)
 *
 * The recording-schedule multi-select (Continuous/Motion, serialized as a comma-joined
 * lowercase string) mirrors the phone's DVR Information checkboxes
 * (`app/(form)/dvr-information.tsx:62-66,112-122`).
 *
 * The screens consume THIS module (via the `ui/screens/field-options.ts` re-export), so
 * the rendered lists cannot drift from it again (they did — parity matrix G5). Enforced
 * by `field-options.test.ts` (re-export by reference) and `option-parity.test.tsx` (the
 * rendered option labels). The import pipeline writes NO dropdown-enum fields at all —
 * pinned by `import-displayable.test.ts` — which is what keeps every import-written
 * value displayable; import code that ever needs an option list must consume this
 * module directly.
 */

export interface PickerOption {
  label: string
  value: string
}

/** Sentinel value of the "Other (Custom)" resolution/FPS option — selecting it reveals a free-text input. */
export const CUSTOM_VALUE = 'custom'

export const EXPORT_MEDIA_OPTIONS: readonly PickerOption[] = [
  { label: 'USB Drive', value: 'USB Drive' },
  { label: 'External Hard Drive', value: 'External Hard Drive' },
  { label: 'DVD', value: 'DVD' },
  { label: 'Cloud Upload', value: 'Cloud Upload' },
  { label: 'Network Transfer', value: 'Network Transfer' },
  { label: 'Other', value: 'Other' },
]

export const FILE_TYPE_OPTIONS: readonly PickerOption[] = [
  { label: 'MP4', value: 'MP4' },
  { label: 'AVI', value: 'AVI' },
  { label: 'MOV', value: 'MOV' },
  { label: 'MKV', value: 'MKV' },
  { label: 'Proprietary', value: 'Proprietary' },
  { label: 'Other', value: 'Other' },
]

export const MEDIA_PROVIDED_OPTIONS: readonly PickerOption[] = [
  { label: 'Hand Delivered', value: 'Hand Delivered' },
  { label: 'Mailed', value: 'Mailed' },
  { label: 'Left with Contact', value: 'Left with Contact' },
  { label: 'Electronic Transfer', value: 'Electronic Transfer' },
  { label: 'Other', value: 'Other' },
]

export const RESOLUTION_OPTIONS: readonly PickerOption[] = [
  { label: '352x240 (CIF)', value: '352x240' },
  { label: '704x480 (4CIF)', value: '704x480' },
  { label: '960x480 (960H)', value: '960x480' },
  { label: '1280x720 (720p)', value: '1280x720' },
  { label: '1920x1080 (1080p)', value: '1920x1080' },
  { label: '2560x1440 (1440p)', value: '2560x1440' },
  { label: '3840x2160 (4K)', value: '3840x2160' },
  { label: 'Other (Custom)', value: CUSTOM_VALUE },
]

export const FPS_OPTIONS: readonly PickerOption[] = [
  { label: '1 FPS', value: '1' },
  { label: '5 FPS', value: '5' },
  { label: '10 FPS', value: '10' },
  { label: '15 FPS', value: '15' },
  { label: '20 FPS', value: '20' },
  { label: '25 FPS', value: '25' },
  { label: '30 FPS', value: '30' },
  { label: 'Other (Custom)', value: CUSTOM_VALUE },
]

/** The values of an option list (what the store holds / an import may write). */
export function optionValues(options: readonly PickerOption[]): string[] {
  return options.map((o) => o.value)
}

const STANDARD_RESOLUTIONS = RESOLUTION_OPTIONS.filter((o) => o.value !== CUSTOM_VALUE).map((o) => o.value)
const STANDARD_FPS = FPS_OPTIONS.filter((o) => o.value !== CUSTOM_VALUE).map((o) => o.value)

/**
 * Whether a stored resolution should render in custom (free-text) mode. Mirrors the phone's
 * PF-14 rule: '' means "not yet selected" (renders the picker placeholder, NOT custom mode);
 * any non-empty non-standard value — including the `custom` sentinel itself and imported /
 * legacy free text — switches the UI to custom mode.
 */
export function isCustomResolution(resolution: string): boolean {
  if (!resolution) return false
  return !STANDARD_RESOLUTIONS.includes(resolution)
}

/** See isCustomResolution — same PF-14 rule for FPS. */
export function isCustomFps(fps: string): boolean {
  if (!fps) return false
  return !STANDARD_FPS.includes(fps)
}

/** Recording-schedule options (multi-select checkboxes). Stored as a comma-joined lowercase
 *  string, e.g. `"continuous, motion"` — matches the phone app's serialization. */
export const RECORDING_SCHEDULE_OPTIONS = ['Continuous', 'Motion'] as const

/** Parse the stored comma-joined schedule string into a lowercase list. */
export function parseRecordingSchedule(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/** Toggle one option in/out of the schedule string, returning the canonical comma-joined value. */
export function toggleRecordingSchedule(value: string, option: string): string {
  const opt = option.toLowerCase()
  const current = new Set(parseRecordingSchedule(value))
  if (current.has(opt)) current.delete(opt)
  else current.add(opt)
  return RECORDING_SCHEDULE_OPTIONS.map((o) => o.toLowerCase())
    .filter((o) => current.has(o))
    .join(', ')
}
