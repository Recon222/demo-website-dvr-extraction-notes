/**
 * Date Format Disambiguation — MM/DD vs DD/MM.
 *
 * Ported from the phone app (`features/import/pdf-import/normalization/date-disambiguation.ts`).
 * Resolves ambiguity in numeric dates like `06/07/2026` (June 7 vs July 6) by choosing the
 * interpretation closest to today, with two import-specific rules:
 *   1. No-future — a recovery request is never for footage in the future, so any reading
 *      after today is rejected (both future ⇒ the caller drops the value).
 *   2. Recency — proximity only carries signal when the explicit year is the current year or
 *      the one before; older ⇒ default MM/DD, low confidence.
 *
 * Pure + deterministic: the only clock input is the injected `currentTimeMs`.
 */

/** Threshold in days for high vs low confidence disambiguation. */
const CONFIDENCE_THRESHOLD_DAYS = 7

/** How many years back proximity stays meaningful (DVR retention is short). */
const PROXIMITY_YEAR_LOOKBACK = 1

export interface DateDisambiguationResult {
  /** Chosen interpretation, ISO `YYYY-MM-DD`. For `neither_interpretation_valid` this is a raw
   *  passthrough of an INVALID calendar date (e.g. "2026-13-13"). That arm is unreachable through
   *  `needsDisambiguation` (which forces both parts into 1..12 → both interpretations valid); and
   *  the one caller (datetime-normalize) re-validates with `isValidDate` before formatting anyway. */
  chosenDate: string
  chosenFormat: 'MM-DD' | 'DD-MM'
  alternativeDate: string
  confidence: 'high' | 'low'
  reason: DisambiguationReason
  chosenDistanceDays: number
  alternativeDistanceDays: number
}

export type DisambiguationReason =
  | 'only_mm_dd_valid'
  | 'only_dd_mm_valid'
  | 'mm_dd_closer_by_7plus'
  | 'dd_mm_closer_by_7plus'
  | 'equidistant'
  | 'close_call'
  | 'both_interpretations_identical'
  | 'neither_interpretation_valid'
  | 'future_interpretation_rejected'
  | 'both_interpretations_future'
  | 'year_outside_proximity_window'

/** Both components in 1..12 ⇒ genuinely ambiguous; either > 12 forces the interpretation. */
export function needsDisambiguation(first: number, second: number): boolean {
  if (first < 1 || second < 1) return false
  if (first > 12 || second > 12) return false
  return true
}

/** Whether a (month, day, year) triple is a valid calendar date (leap-year aware). */
export function isValidDateInterpretation(month: number, day: number, year: number): boolean {
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    if (isLeap && day <= 29) return true
    if (!isLeap && day <= 28) return true
    return false
  }
  return day <= daysInMonth[month]
}

/** Whole days between two dates (absolute, UTC-normalized to midnight). */
export function daysBetween(date1: Date, date2: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate())
  return Math.abs(Math.floor((utc2 - utc1) / MS_PER_DAY))
}

export function disambiguateDateFormat(
  first: number,
  second: number,
  year: number,
  currentTimeMs: number,
): DateDisambiguationResult {
  const today = new Date(currentTimeMs)
  today.setHours(0, 0, 0, 0)

  const mmddMonth = first
  const mmddDay = second
  const mmddValid = isValidDateInterpretation(mmddMonth, mmddDay, year)
  const mmddDate = mmddValid ? new Date(year, mmddMonth - 1, mmddDay) : null

  const ddmmDay = first
  const ddmmMonth = second
  const ddmmValid = isValidDateInterpretation(ddmmMonth, ddmmDay, year)
  const ddmmDate = ddmmValid ? new Date(year, ddmmMonth - 1, ddmmDay) : null

  // Case 1: only MM-DD valid
  if (mmddValid && !ddmmValid) {
    return {
      chosenDate: formatDate(mmddMonth, mmddDay, year),
      chosenFormat: 'MM-DD',
      alternativeDate: formatDate(ddmmMonth, ddmmDay, year),
      confidence: 'high',
      reason: 'only_mm_dd_valid',
      chosenDistanceDays: mmddDate ? daysBetween(mmddDate, today) : 999,
      alternativeDistanceDays: 999,
    }
  }

  // Case 2: only DD-MM valid
  if (!mmddValid && ddmmValid) {
    return {
      chosenDate: formatDate(ddmmMonth, ddmmDay, year),
      chosenFormat: 'DD-MM',
      alternativeDate: formatDate(mmddMonth, mmddDay, year),
      confidence: 'high',
      reason: 'only_dd_mm_valid',
      chosenDistanceDays: ddmmDate ? daysBetween(ddmmDate, today) : 999,
      alternativeDistanceDays: 999,
    }
  }

  // Case 3: neither valid → MM/DD raw passthrough, low confidence
  if (!mmddValid && !ddmmValid) {
    return {
      chosenDate: formatDate(first, second, year),
      chosenFormat: 'MM-DD',
      alternativeDate: formatDate(second, first, year),
      confidence: 'low',
      reason: 'neither_interpretation_valid',
      chosenDistanceDays: 999,
      alternativeDistanceDays: 999,
    }
  }

  // Case 4: same M and D — no real ambiguity
  if (mmddMonth === ddmmMonth && mmddDay === ddmmDay) {
    const dist = mmddDate ? daysBetween(mmddDate, today) : 0
    return {
      chosenDate: formatDate(mmddMonth, mmddDay, year),
      chosenFormat: 'MM-DD',
      alternativeDate: formatDate(ddmmMonth, ddmmDay, year),
      confidence: 'high',
      reason: 'both_interpretations_identical',
      chosenDistanceDays: dist,
      alternativeDistanceDays: dist,
    }
  }

  // Both valid + distinct — apply import domain rules before proximity.
  const mmddFuture = mmddDate! > today
  const ddmmFuture = ddmmDate! > today

  // Case 5: exactly one future → pick the past one (high conf)
  if (mmddFuture !== ddmmFuture) {
    const pickMmdd = !mmddFuture
    const chosenMonth = pickMmdd ? mmddMonth : ddmmMonth
    const chosenDay = pickMmdd ? mmddDay : ddmmDay
    const altMonth = pickMmdd ? ddmmMonth : mmddMonth
    const altDay = pickMmdd ? ddmmDay : mmddDay
    const chosenDate = pickMmdd ? mmddDate! : ddmmDate!
    const altDate = pickMmdd ? ddmmDate! : mmddDate!
    return {
      chosenDate: formatDate(chosenMonth, chosenDay, year),
      chosenFormat: pickMmdd ? 'MM-DD' : 'DD-MM',
      alternativeDate: formatDate(altMonth, altDay, year),
      confidence: 'high',
      reason: 'future_interpretation_rejected',
      chosenDistanceDays: daysBetween(chosenDate, today),
      alternativeDistanceDays: daysBetween(altDate, today),
    }
  }

  // Case 6: both future → impossible; low conf, caller drops
  if (mmddFuture && ddmmFuture) {
    return {
      chosenDate: formatDate(mmddMonth, mmddDay, year),
      chosenFormat: 'MM-DD',
      alternativeDate: formatDate(ddmmMonth, ddmmDay, year),
      confidence: 'low',
      reason: 'both_interpretations_future',
      chosenDistanceDays: daysBetween(mmddDate!, today),
      alternativeDistanceDays: daysBetween(ddmmDate!, today),
    }
  }

  // Case 7: both past but year too old → proximity is noise; default MM/DD low conf
  const currentYear = today.getFullYear()
  if (year < currentYear - PROXIMITY_YEAR_LOOKBACK) {
    return {
      chosenDate: formatDate(mmddMonth, mmddDay, year),
      chosenFormat: 'MM-DD',
      alternativeDate: formatDate(ddmmMonth, ddmmDay, year),
      confidence: 'low',
      reason: 'year_outside_proximity_window',
      chosenDistanceDays: daysBetween(mmddDate!, today),
      alternativeDistanceDays: daysBetween(ddmmDate!, today),
    }
  }

  // Cases 8/9: both recent past — proximity decides. NOTE: the `close_call`/`equidistant`
  // (<7-day) branches below are effectively unreachable for a real MM/DD-vs-DD/MM swap — distinct
  // month/day interpretations always differ by ~28+ days — and are retained for defensive
  // generality / OCR-copy parity. (PR #16 review M3.)
  const mmddDistance = daysBetween(mmddDate!, today)
  const ddmmDistance = daysBetween(ddmmDate!, today)
  const distanceDiff = Math.abs(mmddDistance - ddmmDistance)

  if (mmddDistance < ddmmDistance) {
    const high = distanceDiff >= CONFIDENCE_THRESHOLD_DAYS
    return {
      chosenDate: formatDate(mmddMonth, mmddDay, year),
      chosenFormat: 'MM-DD',
      alternativeDate: formatDate(ddmmMonth, ddmmDay, year),
      confidence: high ? 'high' : 'low',
      reason: high ? 'mm_dd_closer_by_7plus' : 'close_call',
      chosenDistanceDays: mmddDistance,
      alternativeDistanceDays: ddmmDistance,
    }
  }

  if (ddmmDistance < mmddDistance) {
    const high = distanceDiff >= CONFIDENCE_THRESHOLD_DAYS
    return {
      chosenDate: formatDate(ddmmMonth, ddmmDay, year),
      chosenFormat: 'DD-MM',
      alternativeDate: formatDate(mmddMonth, mmddDay, year),
      confidence: high ? 'high' : 'low',
      reason: high ? 'dd_mm_closer_by_7plus' : 'close_call',
      chosenDistanceDays: ddmmDistance,
      alternativeDistanceDays: mmddDistance,
    }
  }

  // Equidistant — default MM/DD, low confidence
  return {
    chosenDate: formatDate(mmddMonth, mmddDay, year),
    chosenFormat: 'MM-DD',
    alternativeDate: formatDate(ddmmMonth, ddmmDay, year),
    confidence: 'low',
    reason: 'equidistant',
    chosenDistanceDays: mmddDistance,
    alternativeDistanceDays: ddmmDistance,
  }
}

/** The three strings `DateDisambiguationWarning` renders. */
export interface DisambiguationWarningCopy {
  title: string
  description: string
  suggestion: string
}

/**
 * Build the operator-facing warning copy for an ambiguous read.
 *
 * Lifted verbatim (strings and interpolation alike) from the phone's OCR copy of this module,
 * `src/features/ocr-time-capture/utils/date-disambiguation.ts:232-280` — including the
 * `parseInt(day, 10)` de-padding of the day numerals inside the prose while the leading quoted
 * `"MM/DD"` fragment keeps the zero-padded strings (ui-mapping 06 fact-check row 3).
 */
export function generateDisambiguationWarning(result: DateDisambiguationResult): DisambiguationWarningCopy {
  const chosenFormatLabel = result.chosenFormat === 'MM-DD' ? 'Month-Day (US)' : 'Day-Month (European)'
  const alternativeFormatLabel = result.chosenFormat === 'MM-DD' ? 'Day-Month (European)' : 'Month-Day (US)'

  const [, month, day] = result.chosenDate.split('-')
  const chosenMonthName = getMonthName(parseInt(month, 10))
  const [, altMonth, altDay] = result.alternativeDate.split('-')
  const altMonthName = getMonthName(parseInt(altMonth, 10))

  const description =
    result.reason === 'equidistant'
      ? `The date "${month}/${day}" is ambiguous. Both interpretations are equally close to today. `
        + `System chose ${chosenFormatLabel} format: ${chosenMonthName} ${parseInt(day, 10)}. `
        + `Alternative interpretation: ${altMonthName} ${parseInt(altDay, 10)} (${alternativeFormatLabel}).`
      : `The date "${month}/${day}" could be interpreted as either ${chosenMonthName} ${parseInt(day, 10)} (${chosenFormatLabel}) `
        + `or ${altMonthName} ${parseInt(altDay, 10)} (${alternativeFormatLabel}). System chose ${chosenFormatLabel} format as it's `
        + `${result.chosenDistanceDays} day(s) from today vs ${result.alternativeDistanceDays} day(s) for the alternative.`

  return {
    title: 'Date Format Ambiguity Detected',
    description,
    suggestion: 'Please verify the displayed date matches the DVR screen. If incorrect, edit the date manually.',
  }
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

function getMonthName(month: number): string {
  return MONTH_NAMES[month] || 'Unknown'
}

function formatDate(month: number, day: number, year: number): string {
  const y = year.toString().padStart(4, '0')
  const m = month.toString().padStart(2, '0')
  const d = day.toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}
