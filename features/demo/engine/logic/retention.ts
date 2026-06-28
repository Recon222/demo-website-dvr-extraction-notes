/**
 * DVR retention math (ported from the phone app's lib/utils/retention-calculation.ts).
 *
 * The user picks the DVR's earliest recorded date; everything else is derived against
 * "today": the total retention window, and — per requested scope — how many days until
 * that footage is overwritten (start date + retention window), plus a status band.
 *
 * Pure + deterministic: the only clock read is the injected `now()` (the UI passes the
 * clock seam; tests pass a fixed clock). Day math is done in UTC to avoid DST drift.
 */

import { parsePartsLoose, pad2, nowParts, type DateParts } from '@/features/demo/engine/logic/datetime-parts'

export type RetentionStatus = 'OVERWRITTEN' | 'CRITICAL' | 'WARNING' | 'SAFE'

const MS_PER_DAY = 86_400_000

/** UTC-midnight epoch ms for the date portion of some parts. */
function utcDay(p: { y: number; mo: number; d: number }): number {
  return Date.UTC(p.y, p.mo - 1, p.d)
}

/** Whole-day difference `a − b` (date portions only, UTC). */
function dayDiff(a: { y: number; mo: number; d: number }, b: { y: number; mo: number; d: number }): number {
  return Math.floor((utcDay(a) - utcDay(b)) / MS_PER_DAY)
}

function addDays(p: { y: number; mo: number; d: number }, days: number): DateParts {
  const dt = new Date(utcDay(p) + days * MS_PER_DAY)
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: 0, mi: 0, s: 0 }
}

/** Total retention in whole days = today − firstRecordedDate. null if empty/invalid/future. */
export function calculateTotalRetention(firstRecordedDate: string, now: () => Date): number | null {
  const fr = parsePartsLoose(firstRecordedDate)
  if (!fr) return null
  const diff = dayDiff(nowParts(now), fr)
  return diff < 0 ? null : diff
}

/** Days until a scope's footage is overwritten = (scopeStart + retention) − today; 0 if already past. */
export function calculateDaysUntilOverwritten(scopeStart: string, totalRetention: number, now: () => Date): number {
  const s = parsePartsLoose(scopeStart)
  if (!s) return 0
  const diff = dayDiff(addDays(s, totalRetention), nowParts(now))
  return diff > 0 ? diff : 0
}

/** The date a scope's footage is overwritten = scopeStart + retention, as "YYYY-MM-DD" ('' if invalid). */
export function calculateOverwrittenDate(scopeStart: string, totalRetention: number): string {
  const s = parsePartsLoose(scopeStart)
  if (!s) return ''
  const o = addDays(s, totalRetention)
  return `${o.y}-${pad2(o.mo)}-${pad2(o.d)}`
}

/** Status band from days remaining: ≤0 OVERWRITTEN · ≤3 CRITICAL · ≤7 WARNING · else SAFE. */
export function getRetentionStatus(daysUntilOverwritten: number): RetentionStatus {
  if (daysUntilOverwritten <= 0) return 'OVERWRITTEN'
  if (daysUntilOverwritten <= 3) return 'CRITICAL'
  if (daysUntilOverwritten <= 7) return 'WARNING'
  return 'SAFE'
}

/** One scope's retention. `status` is intentionally NOT stored — derive it at the render site
 *  via `getRetentionStatus(daysUntilOverwritten)` so the two can't drift. */
export interface ScopeRetention {
  label: string
  daysUntilOverwritten: number
  overwrittenDate: string
}

/** Display-ready retention. The union makes "no total ⇒ no scopes" unrepresentable otherwise. */
export type RetentionView =
  | { totalRetention: null; scopes: [] }
  | { totalRetention: number; scopes: ScopeRetention[] }

/** Parse a scope start ONCE and build its entry; null for an empty or malformed start. */
function buildScopeEntry(scopeStart: string, totalRetention: number, index: number, today: DateParts): ScopeRetention | null {
  const s = parsePartsLoose(scopeStart)
  if (!s) return null
  const overwrite = addDays(s, totalRetention)
  const diff = dayDiff(overwrite, today)
  return {
    label: `Scope ${index + 1}`,
    daysUntilOverwritten: diff > 0 ? diff : 0,
    overwrittenDate: `${overwrite.y}-${pad2(overwrite.mo)}-${pad2(overwrite.d)}`,
  }
}

/** Display-ready retention from the location's scopes + first recorded date. */
export function buildRetentionView(
  scopes: ReadonlyArray<{ startDateTime: string }>,
  firstRecordedDate: string,
  now: () => Date,
): RetentionView {
  const totalRetention = calculateTotalRetention(firstRecordedDate, now)
  if (totalRetention === null) return { totalRetention: null, scopes: [] }
  const today = nowParts(now)
  const out: ScopeRetention[] = []
  scopes.forEach((sc, i) => {
    const entry = buildScopeEntry(sc.startDateTime, totalRetention, i, today)
    if (entry) out.push(entry)
  })
  return { totalRetention, scopes: out }
}
