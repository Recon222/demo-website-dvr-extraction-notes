/**
 * Bidirectional DVR ↔ actual time math, adapted from the app's `bidirectional-time`
 * logic. All arithmetic treats the 'YYYY-MM-DD HH:MM:SS' strings as
 * UTC (appends 'Z') so Daylight Saving never shifts a calculation — the offset is a pure
 * wall-clock delta. A separate `calculateDSTAdjustedTimeRange` handles the case where the
 * DVR itself observes DST.
 */

export interface TimeDifference {
  differenceMs: number
  formattedDifference: string
  direction: 'AHEAD OF' | 'BEHIND'
  isDvrAhead: boolean
}

export interface TimeRange {
  startDateTime: string
  endDateTime: string
}

const pad = (n: number) => String(n).padStart(2, '0')

function formatMsToHMS(ms: number): string {
  const s = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${pad(h)}:${pad(m)}:${pad(sec)}`
}

/** Wall-clock difference DVR − actual. Treats inputs as UTC so DST never shifts it. */
export function calculateTimeDifference(dvrDateTime: string, actualDateTime: string): TimeDifference {
  const dvr = new Date(dvrDateTime.replace(' ', 'T') + 'Z').getTime()
  const actual = new Date(actualDateTime.replace(' ', 'T') + 'Z').getTime()
  if (isNaN(dvr) || isNaN(actual)) throw new Error('Unable to parse date values')
  const diffMs = dvr - actual
  const isDvrAhead = diffMs > 0
  return {
    differenceMs: diffMs,
    formattedDifference: formatMsToHMS(diffMs),
    direction: isDvrAhead ? 'AHEAD OF' : 'BEHIND',
    isDvrAhead,
  }
}

export function isDvrTimeCorrect(diff: TimeDifference): boolean {
  return diff.formattedDifference === '00:00:00'
}

function applyTimeOffset(dateTime: string, offsetMs: number, shouldAdd: boolean): string {
  const date = new Date(dateTime.replace(' ', 'T') + 'Z')
  // Fail loud rather than emit "NaN-NaN-NaN ..." onto a forensic document — consistent
  // with calculateTimeDifference. Callers must pass canonical 'YYYY-MM-DD HH:MM:SS'.
  if (isNaN(date.getTime())) throw new Error('Unable to parse date value')
  const corrected = new Date(
    shouldAdd ? date.getTime() + Math.abs(offsetMs) : date.getTime() - Math.abs(offsetMs),
  )
  return `${corrected.getUTCFullYear()}-${pad(corrected.getUTCMonth() + 1)}-${pad(
    corrected.getUTCDate(),
  )} ${pad(corrected.getUTCHours())}:${pad(corrected.getUTCMinutes())}:${pad(corrected.getUTCSeconds())}`
}

/** Convert a requested range between actual and DVR time, flipping the time-domain flag. */
export function calculateCorrectedTimeRange(
  timeRange: TimeRange,
  timeDifference: TimeDifference,
  isActualTime: boolean,
): { startDateTime: string; endDateTime: string; isActualTime: boolean } {
  const { differenceMs, isDvrAhead } = timeDifference
  const shouldAdd = (isActualTime && isDvrAhead) || (!isActualTime && !isDvrAhead)
  return {
    startDateTime: applyTimeOffset(timeRange.startDateTime, differenceMs, shouldAdd),
    endDateTime: applyTimeOffset(timeRange.endDateTime, differenceMs, shouldAdd),
    isActualTime: !isActualTime,
  }
}

/** Is the given wall-clock string within Daylight Saving for the runtime's local zone? */
export function isInDST(dateStr: string): boolean {
  const d = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(d.getTime())) return false
  const jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset()
  const jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset()
  return d.getTimezoneOffset() < Math.max(jan, jul)
}

export function dstStatusDiffers(a: string, b: string): boolean {
  return isInDST(a) !== isInDST(b)
}

export function doesRangeStraddleDST(start: string, end: string): boolean {
  return dstStatusDiffers(start, end)
}

/** Apply a ±1h shift when the DVR observes DST, based on the collection time's DST state. */
export function calculateDSTAdjustedTimeRange(
  timeRange: TimeRange,
  collectionDateTime: string,
): { startDateTime: string; endDateTime: string; adjustmentApplied: number } {
  // Fail loud on an invalid collection time. isInDST silently returns false on bad input,
  // which would otherwise apply the ±1h shift in a guessed direction with false confidence
  // (the range-time path already throws via applyTimeOffset — this keeps the guard symmetric).
  if (isNaN(new Date(collectionDateTime.replace(' ', 'T')).getTime())) {
    throw new Error('Unable to parse collection date value')
  }
  const collectionInDST = isInDST(collectionDateTime)
  const adjustmentHours = collectionInDST ? -1 : 1
  const adjustmentMs = Math.abs(adjustmentHours) * 3_600_000
  const shouldAdd = adjustmentHours > 0
  return {
    startDateTime: applyTimeOffset(timeRange.startDateTime, adjustmentMs, shouldAdd),
    endDateTime: applyTimeOffset(timeRange.endDateTime, adjustmentMs, shouldAdd),
    adjustmentApplied: adjustmentHours,
  }
}

/** Current (or given) time as a local 'YYYY-MM-DD HH:MM:SS' string. */
export function getCurrentFormattedTime(timestamp?: number): string {
  // `!= null` (not truthiness) so a provided 0 means the epoch, not "now".
  const n = timestamp != null ? new Date(timestamp) : new Date()
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(
    n.getMinutes(),
  )}:${pad(n.getSeconds())}`
}

/**
 * Round a 'YYYY-MM-DD HH:MM:SS' time to a 5-minute boundary — 'down' (floor) for a scope
 * start, 'up' (ceil) for a scope end. Seconds are zeroed. UTC-based, so DST-agnostic.
 */
export function roundTo5Min(dateStr: string, direction: 'up' | 'down'): string {
  if (!dateStr) return dateStr
  const d = new Date(dateStr.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return dateStr
  const five = 5 * 60 * 1000
  const ms =
    direction === 'down' ? Math.floor(d.getTime() / five) * five : Math.ceil(d.getTime() / five) * five
  const r = new Date(ms)
  return `${r.getUTCFullYear()}-${pad(r.getUTCMonth() + 1)}-${pad(r.getUTCDate())} ${pad(
    r.getUTCHours(),
  )}:${pad(r.getUTCMinutes())}:00`
}
