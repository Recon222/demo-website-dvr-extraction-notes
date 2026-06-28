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

function addDays(p: { y: number; mo: number; d: number }, days: number): DateParts {
  const dt = new Date(utcDay(p) + days * MS_PER_DAY)
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: 0, mi: 0, s: 0 }
}

/** Total retention in whole days = today − firstRecordedDate. null if empty/invalid/future. */
export function calculateTotalRetention(firstRecordedDate: string, now: () => Date): number | null {
  const fr = parsePartsLoose(firstRecordedDate)
  if (!fr) return null
  const diff = Math.floor((utcDay(nowParts(now)) - utcDay(fr)) / MS_PER_DAY)
  return diff < 0 ? null : diff
}

/** Days until a scope's footage is overwritten = (scopeStart + retention) − today; 0 if already past. */
export function calculateDaysUntilOverwritten(scopeStart: string, totalRetention: number, now: () => Date): number {
  const s = parsePartsLoose(scopeStart)
  if (!s) return 0
  const diff = Math.floor((utcDay(addDays(s, totalRetention)) - utcDay(nowParts(now))) / MS_PER_DAY)
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

export interface ScopeRetention {
  label: string
  daysUntilOverwritten: number
  overwrittenDate: string
  status: RetentionStatus
}

export interface RetentionView {
  totalRetention: number | null
  scopes: ScopeRetention[]
}

/** Display-ready retention: total window + per-scope countdown (skips scopes with no start). */
export function buildRetentionView(
  scopes: ReadonlyArray<{ startDateTime: string }>,
  firstRecordedDate: string,
  now: () => Date,
): RetentionView {
  const totalRetention = calculateTotalRetention(firstRecordedDate, now)
  if (totalRetention === null) return { totalRetention: null, scopes: [] }
  const out: ScopeRetention[] = []
  scopes.forEach((sc, i) => {
    if (!sc.startDateTime) return
    const daysUntilOverwritten = calculateDaysUntilOverwritten(sc.startDateTime, totalRetention, now)
    out.push({
      label: `Scope ${i + 1}`,
      daysUntilOverwritten,
      overwrittenDate: calculateOverwrittenDate(sc.startDateTime, totalRetention),
      status: getRetentionStatus(daysUntilOverwritten),
    })
  })
  return { totalRetention, scopes: out }
}
