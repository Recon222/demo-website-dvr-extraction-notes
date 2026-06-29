/**
 * DateTime Normalization.
 *
 * Ported from the phone app (`features/import/pdf-import/normalization/normalize-datetime.ts`).
 * Normalizes the date/time formats a model emits — ISO (incl. "T" separator), `YYYY/MM/DD HHMMhrs`,
 * month-name (`Jan 27, 2026 at 16:00`), and `MM/DD/YYYY [h:mm AM/PM]` — to the demo's canonical
 * `"YYYY-MM-DD HH:MM"` (or `:SS` when the source carries seconds). Ambiguous MM/DD vs DD/MM is
 * delegated to date-disambiguation; future dates are flagged (both-future ⇒ blanked).
 *
 * Pure: the only clock input is `currentTimeMs`. It defaults to Date.now() for stand-alone calls,
 * but the import pipeline always injects a single event-scope value (run-import → parseNormalizeMap),
 * so production is deterministic. (Tests inject a fixed value.)
 */

import { needsDisambiguation, disambiguateDateFormat } from '@/features/demo/engine/logic/date-disambiguation'

export interface DateTimeNormalizationResult {
  /** Canonical `"YYYY-MM-DD HH:MM[:SS]"` (seconds preserved when present), or the original if unparseable. */
  normalized: string
  warning?: string
}

const MONTH_MAP: Readonly<Record<string, number>> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

export function normalizeDateTime(value: string, currentTimeMs: number = Date.now()): DateTimeNormalizationResult {
  const trimmed = value.trim()
  if (!trimmed) return { normalized: '', warning: 'Empty datetime value' }

  let result: DateTimeNormalizationResult | null = null
  result = tryIso(trimmed)
  if (!result) result = trySlashYmdMilitary(trimmed)
  if (!result) result = tryMonthNameFormat(trimmed)
  if (!result) result = tryMdySlashFormat(trimmed, currentTimeMs)

  if (!result) {
    return { normalized: trimmed, warning: `Could not parse datetime format: "${trimmed}"` }
  }
  return appendFutureDateWarning(result, currentTimeMs)
}

// ==================== PATTERN MATCHERS ====================

function tryIso(value: string): DateTimeNormalizationResult | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+|T)(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const [, year, month, day, hour, minute, second] = match
  if (!isValidDate(+year, +month, +day) || !isValidTime(+hour, +minute, second != null ? +second : 0)) {
    return { normalized: value, warning: `Invalid date/time values in "${value}"` }
  }
  const time = second != null ? `${hour}:${minute}:${second}` : `${hour}:${minute}`
  return { normalized: `${year}-${month}-${day} ${time}` }
}

function trySlashYmdMilitary(value: string): DateTimeNormalizationResult | null {
  const match = value.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{3,4})\s*(?:hrs?)?\s*(?:to)?$/i)
  if (!match) return null
  const [, year, month, day, rawTime] = match
  const { hour, minute } = parseMilitaryTime(rawTime)
  if (!isValidDate(+year, +month, +day) || !isValidTime(hour, minute)) {
    return { normalized: value, warning: `Invalid date/time values in "${value}"` }
  }
  return { normalized: formatDateTime(+year, +month, +day, hour, minute) }
}

function tryMonthNameFormat(value: string): DateTimeNormalizationResult | null {
  const match = value.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const [, monthStr, dayStr, yearStr, hourStr, minuteStr, secondStr] = match
  const month = MONTH_MAP[monthStr.toLowerCase()]
  if (!month) return null
  const year = +yearStr
  const day = +dayStr
  const hour = +hourStr
  const minute = +minuteStr
  const second = secondStr != null ? +secondStr : undefined
  if (!isValidDate(year, month, day) || !isValidTime(hour, minute, second ?? 0)) {
    return { normalized: value, warning: `Invalid date/time values in "${value}"` }
  }
  return { normalized: formatDateTime(year, month, day, hour, minute, second) }
}

function tryMdySlashFormat(value: string, currentTimeMs: number): DateTimeNormalizationResult | null {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?$/)
  if (!match) return null
  const [, firstStr, secondStr, yearStr, hourStr, minuteStr, secsStr, ampm] = match
  const year = +yearStr
  const first = +firstStr
  const second = +secondStr
  let hour = +hourStr
  const minute = +minuteStr
  const secs = secsStr != null ? +secsStr : undefined

  if (ampm) {
    const upper = ampm.toUpperCase()
    if (upper === 'PM' && hour !== 12) hour += 12
    else if (upper === 'AM' && hour === 12) hour = 0
  }

  if (!isValidTime(hour, minute, secs ?? 0)) {
    return { normalized: value, warning: `Invalid date/time values in "${value}"` }
  }

  if (needsDisambiguation(first, second)) {
    const result = disambiguateDateFormat(first, second, year, currentTimeMs)

    if (result.reason === 'both_interpretations_future') {
      return {
        normalized: '',
        warning:
          `Ambiguous date "${value}" — both interpretations (${result.chosenDate} / ${result.alternativeDate}) ` +
          `are in the future, which is impossible for a recovery request. Not imported — please enter manually.`,
      }
    }

    const [chosenY, chosenM, chosenD] = result.chosenDate.split('-').map(Number)
    if (!isValidDate(chosenY, chosenM, chosenD)) {
      return { normalized: value, warning: `Invalid date/time values in "${value}"` }
    }
    const normalized = formatDateTime(chosenY, chosenM, chosenD, hour, minute, secs)
    const warning =
      `Ambiguous date format "${value}" disambiguated to ${result.chosenFormat} ` +
      `(${result.chosenDate}; alternative was ${result.alternativeDate}). ` +
      `Reason: ${result.reason}. Confidence: ${result.confidence}. ` +
      `Distance to today: chosen=${result.chosenDistanceDays}d, alternative=${result.alternativeDistanceDays}d.`
    return { normalized, warning }
  }

  let month: number, day: number
  if (first > 12 && second <= 12) {
    day = first
    month = second
  } else {
    month = first
    day = second
  }

  if (!isValidDate(year, month, day)) {
    return { normalized: value, warning: `Invalid date/time values in "${value}"` }
  }
  return { normalized: formatDateTime(year, month, day, hour, minute, secs) }
}

// ==================== HELPERS ====================

function appendFutureDateWarning(result: DateTimeNormalizationResult, currentTimeMs: number): DateTimeNormalizationResult {
  const match = result.normalized.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return result
  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = match
  const normalizedDate = new Date(+yearStr, +monthStr - 1, +dayStr, +hourStr, +minuteStr, secondStr != null ? +secondStr : 0)
  if (normalizedDate <= new Date(currentTimeMs)) return result
  const futureWarning = `Date "${result.normalized}" is in the future`
  return {
    normalized: result.normalized,
    warning: result.warning ? `${result.warning}; ${futureWarning}` : futureWarning,
  }
}

function parseMilitaryTime(raw: string): { hour: number; minute: number } {
  const padded = raw.padStart(4, '0')
  return { hour: parseInt(padded.slice(0, 2), 10), minute: parseInt(padded.slice(2, 4), 10) }
}

function formatDateTime(year: number, month: number, day: number, hour: number, minute: number, second?: number): string {
  const y = String(year).padStart(4, '0')
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  const h = String(hour).padStart(2, '0')
  const min = String(minute).padStart(2, '0')
  if (second != null) return `${y}-${m}-${d} ${h}:${min}:${String(second).padStart(2, '0')}`
  return `${y}-${m}-${d} ${h}:${min}`
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false
  if (month < 1 || month > 12) return false
  if (day < 1) return false
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month === 2 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) daysInMonth[2] = 29
  return day <= daysInMonth[month]
}

function isValidTime(hour: number, minute: number, second: number = 0): boolean {
  if (hour < 0 || hour > 23) return false
  if (minute < 0 || minute > 59) return false
  if (second < 0 || second > 59) return false
  return true
}
