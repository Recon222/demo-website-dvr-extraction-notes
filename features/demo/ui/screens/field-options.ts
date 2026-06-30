/**
 * Shared dropdown option lists for the DVR Info + Cameras screens.
 * Kept in one place so the two screens' Resolution / FPS choices never drift apart.
 */
export const RESOLUTION_OPTIONS = ['1280x720', '1920x1080', '2560x1440', '3840x2160', 'Other']
export const FPS_OPTIONS = ['10fps', '12fps', '15fps', '25fps', '30fps']

/** Recording-schedule options (multi-select). Stored as a comma-joined lowercase string,
 *  e.g. `"continuous, motion"` — matches the phone app's serialization. */
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
