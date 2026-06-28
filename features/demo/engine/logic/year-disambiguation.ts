/**
 * Year-Hallucination Disambiguation.
 *
 * Ported from the phone app (`features/import/pdf-import/normalization/year-disambiguation.ts`).
 * A small model often invents a year on a year-less source date (e.g. source "Feb 5 from 1pm"
 * → AI "2023-02-05T13:00"). This corrects it by proximity to today, with a **cold-case guard**:
 * if the source explicitly states the AI's year on that date, trust it (however old), and an
 * unrelated year-shaped token (an OCC number / serial) must NOT count.
 *
 * Pure + deterministic: the only clock input is the injected `currentTimeMs`.
 */

export interface YearDisambiguationResult {
  chosenDate: string
  chosenYear: number
  aiOriginalDate: string
  aiOriginalYear: number
  confidence: 'high' | 'low'
  reason: YearDisambiguationReason
  chosenDistanceDays: number
  aiDistanceDays: number
}

export type YearDisambiguationReason =
  | 'ai_year_plausible'
  | 'ai_year_implausibly_old'
  | 'ai_year_implausibly_future'
  | 'unparseable_passthrough'

/** Window (chars) around the date phrase to look for the AI's year. */
const YEAR_GUARD_WINDOW_CHARS = 150

/** Days the inferred date may sit in the future before it's treated as last year's date. */
const FUTURE_GRACE_DAYS = 1

/** Whether the AI's `year` appears as a standalone token within ±150 chars of `dateFragment`. */
export function findYearTokenNear(sourceText: string, dateFragment: string, year: number): boolean {
  if (!sourceText || !dateFragment) return false
  const idx = sourceText.indexOf(dateFragment)
  if (idx < 0) return false
  const start = Math.max(0, idx - YEAR_GUARD_WINDOW_CHARS)
  const end = Math.min(sourceText.length, idx + dateFragment.length + YEAR_GUARD_WINDOW_CHARS)
  return windowContainsYear(sourceText.substring(start, end), year)
}

/** `year` as a standalone date-year (not embedded in a reference number like `OCC#2024-44321`). */
function windowContainsYear(text: string, year: number): boolean {
  return new RegExp(`(?<![#\\w/])${year}(?![/\\w-])`).test(text)
}

/** Whether `sourceText` states the AI's full date (year+month+day) contiguously in a numeric form. */
export function sourceContainsFullDate(sourceText: string, year: number, month: number, day: number): boolean {
  if (!sourceText) return false
  const y = String(year)
  const m = String(month)
  const mm = m.padStart(2, '0')
  const d = String(day)
  const dd = d.padStart(2, '0')
  const candidates = [
    `${y}-${mm}-${dd}`,
    `${y}-${m}-${d}`,
    `${mm}-${dd}-${y}`,
    `${m}-${d}-${y}`,
    `${mm}/${dd}/${y}`,
    `${m}/${d}/${y}`,
    `${dd}-${mm}-${y}`,
    `${d}-${m}-${y}`,
    `${dd}/${mm}/${y}`,
    `${d}/${m}/${y}`,
  ]
  return candidates.some((c) => sourceText.includes(c))
}

/** Pick the year for a given month/day relative to today (prior year if it would be future). */
export function inferYearByProximity(month: number, day: number, currentTimeMs: number): number {
  const today = new Date(currentTimeMs)
  const currentYear = today.getFullYear()
  const candidate = new Date(currentYear, month - 1, day)
  const daysFuture = (candidate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return daysFuture > FUTURE_GRACE_DAYS ? currentYear - 1 : currentYear
}

function daysBetweenAbs(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.abs(Math.floor((utc2 - utc1) / MS_PER_DAY))
}

function parseAiDate(aiDate: string): { year: number; month: number; day: number; timeSuffix: string } | null {
  const match = aiDate.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/)
  if (!match) return null
  const [, yearStr, monthStr, dayStr, timeSuffix] = match
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day, timeSuffix }
}

function formatDate(year: number, month: number, day: number, timeSuffix: string): string {
  const y = year.toString().padStart(4, '0')
  const m = month.toString().padStart(2, '0')
  const d = day.toString().padStart(2, '0')
  return `${y}-${m}-${d}${timeSuffix}`
}

export function disambiguateHallucinatedYear(
  aiNormalizedDate: string,
  sourceText: string,
  currentTimeMs: number,
): YearDisambiguationResult {
  const parsed = parseAiDate(aiNormalizedDate)

  // Step 1: unparseable → passthrough
  if (!parsed) {
    return {
      chosenDate: aiNormalizedDate,
      chosenYear: 0,
      aiOriginalDate: aiNormalizedDate,
      aiOriginalYear: 0,
      confidence: 'low',
      reason: 'unparseable_passthrough',
      chosenDistanceDays: 0,
      aiDistanceDays: 0,
    }
  }

  const { year: aiYear, month, day, timeSuffix } = parsed

  const monthNamesShort = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthNamesLong = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const candidateFragments = [
    `${monthNamesShort[month] ?? ''} ${day}`,
    `${monthNamesLong[month] ?? ''} ${day}`,
    `${month}/${day}`,
    `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`,
  ]

  // Step 2: cold-case guard — trust the AI year only if the source states THAT year on the date.
  const guardHit =
    sourceContainsFullDate(sourceText, aiYear, month, day) ||
    candidateFragments.some((fragment) => findYearTokenNear(sourceText, fragment, aiYear))
  if (guardHit) {
    const today = new Date(currentTimeMs)
    const aiDate = new Date(aiYear, month - 1, day)
    return {
      chosenDate: aiNormalizedDate,
      chosenYear: aiYear,
      aiOriginalDate: aiNormalizedDate,
      aiOriginalYear: aiYear,
      confidence: 'high',
      reason: 'ai_year_plausible',
      chosenDistanceDays: daysBetweenAbs(aiDate, today),
      aiDistanceDays: daysBetweenAbs(aiDate, today),
    }
  }

  // Step 3: proximity decides
  const today = new Date(currentTimeMs)
  const aiDate = new Date(aiYear, month - 1, day)
  const aiDistance = daysBetweenAbs(aiDate, today)
  const inferredYear = inferYearByProximity(month, day, currentTimeMs)
  const inferredDate = new Date(inferredYear, month - 1, day)
  const inferredDistance = daysBetweenAbs(inferredDate, today)

  if (aiYear === inferredYear) {
    return {
      chosenDate: aiNormalizedDate,
      chosenYear: aiYear,
      aiOriginalDate: aiNormalizedDate,
      aiOriginalYear: aiYear,
      confidence: 'high',
      reason: 'ai_year_plausible',
      chosenDistanceDays: aiDistance,
      aiDistanceDays: aiDistance,
    }
  }

  const correctedDate = formatDate(inferredYear, month, day, timeSuffix)
  const reason: YearDisambiguationReason =
    aiYear < inferredYear ? 'ai_year_implausibly_old' : 'ai_year_implausibly_future'
  return {
    chosenDate: correctedDate,
    chosenYear: inferredYear,
    aiOriginalDate: aiNormalizedDate,
    aiOriginalYear: aiYear,
    confidence: 'high',
    reason,
    chosenDistanceDays: inferredDistance,
    aiDistanceDays: aiDistance,
  }
}
