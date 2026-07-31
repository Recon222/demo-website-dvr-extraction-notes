/**
 * Daylight-Saving advisories for the Time-Offset screen.
 *
 * A port of the phone's `getDSTNotification()` — `app/(form)/time-offset.tsx:143-207`,
 * spec `docs/ui-mapping/06-wizard-b-time.md:73-79`. All four scenario messages are lifted
 * VERBATIM; the four trigger conditions port 1:1 because every input the phone reads
 * (`scopes[].startDateTime/endDateTime/isActualTime`, `actualDateTime`, `dvrAppliesDST`,
 * today's date, the zone's DST transition dates) already exists in the demo's engine state.
 *
 * Two deliberate, documented deviations from the phone:
 *
 * 1. **No `'info'` variant.** The phone types the return as `{ message, type: 'info' | 'warning' }`
 *    but all four branches return `'warning'` — the `'info'` styling path is dead code, as the
 *    spec itself records (ui-mapping 06:73, 06:91). This returns the message string alone and the
 *    card is warning-styled unconditionally, so the demo carries no unreachable branch.
 *
 * 2. **`getDSTTransitionDates` scans across month boundaries.** The phone's loop is
 *    `for (day = 1; day < daysInMonth; day++)` comparing `day` with `day + 1`
 *    (`src/lib/utils/bidirectional-time.ts:330-344`), so it never compares the last day of a
 *    month with the first of the next — a transition landing on the 1st of a month is missed and
 *    the message degrades to the literal word `spring`/`fall`. That is reachable in North America
 *    whenever the November fall-back Sunday is the 1st (e.g. 2026-11-01). This implementation
 *    brackets by month starts and binary-searches inside the bracket, so the boundary case
 *    resolves. Reported for the phone-repo BUG ledger.
 *
 * Clock and DST detection are injected: `now` follows the demo's no-argless-`Date.now()` rule,
 * and `isDst` defaults to the engine's `isInDST` so tests can pin branch behaviour without
 * depending on the test runner's timezone.
 */

import { getCurrentFormattedTime, isInDST } from '@/features/demo/engine/logic/time'

/** Test seam: is this canonical `'YYYY-MM-DD HH:MM:SS'` wall-clock string inside DST? */
export type IsDstFn = (dateTime: string) => boolean

/** The slice of a requested scope the advisories read. */
export interface DstAdvisoryScope {
  startDateTime: string
  endDateTime: string
  isActualTime: boolean
}

export interface DstAdvisoryInput {
  scopes: readonly DstAdvisoryScope[]
  /** The calibrated collection time (`capture.actualDateTime`). */
  actualDateTime: string
  dvrAppliesDST: boolean
  /** Injected wall clock — the demo forbids argless `Date.now()` / `new Date()`. */
  now: () => Date
  /** Injected DST predicate; defaults to the engine's host-zone check. */
  isDst?: IsDstFn
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const DAY_MS = 86_400_000

/** Local noon on the `dayOfYear`-th day (0-based) of `year`. Overflow normalises. */
function noonOfDay(year: number, dayOfYear: number): Date {
  return new Date(year, 0, 1 + dayOfYear, 12)
}

/** 0-based day-of-year index for the 1st of `monthIndex`. */
function firstOfMonthIndex(year: number, monthIndex: number): number {
  return (Date.UTC(year, monthIndex, 1) - Date.UTC(year, 0, 1)) / DAY_MS
}

/**
 * The zone's DST transition dates for `year`, formatted `"MMMM d, yyyy"` (the phone's Luxon
 * format token). `null` for a zone that never observes DST — callers fall back to the literal
 * words `spring` / `fall`, exactly as the phone does.
 *
 * Month names are a fixed English table rather than `Intl`: the demo is English-only and a
 * locale-varying month name would make the advisory copy non-deterministic.
 */
export function getDSTTransitionDates(
  year: number,
  isDst: IsDstFn = isInDST,
): { springForward: string | null; fallBack: string | null } {
  const statusOf = (dayOfYear: number) => isDst(getCurrentFormattedTime(noonOfDay(year, dayOfYear).getTime()))
  const lastDay = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS - 1

  // Bracket on month starts (plus Dec 31) — at most two flips per year, so this is 13 probes
  // plus a ~5-step binary search per flip, and it never skips a month boundary.
  const checkpoints: number[] = []
  for (let m = 0; m < 12; m++) checkpoints.push(firstOfMonthIndex(year, m))
  checkpoints.push(lastDay)

  let springForward: string | null = null
  let fallBack: string | null = null

  for (let i = 0; i < checkpoints.length - 1; i++) {
    let lo = checkpoints[i]
    let hi = checkpoints[i + 1]
    const before = statusOf(lo)
    if (statusOf(hi) === before) continue

    // First day in (lo, hi] whose DST status differs from `before`.
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2)
      if (statusOf(mid) === before) lo = mid
      else hi = mid
    }

    const d = noonOfDay(year, hi)
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    if (!before) springForward = label
    else fallBack = label
  }

  return { springForward, fallBack }
}

/** Does today sit on the opposite side of a DST boundary from `dateTime`? */
export function doesTodayStraddleDSTWith(
  dateTime: string,
  now: () => Date,
  isDst: IsDstFn = isInDST,
): boolean {
  return isDst(getCurrentFormattedTime(now().getTime())) !== isDst(dateTime)
}

/**
 * The DST advisory for the current calibration, or `null` when none applies.
 *
 * Gate and branch order are the phone's (`time-offset.tsx:143-207`): only scopes flagged
 * `isActualTime` with both endpoints set are considered, a collection time is required, and the
 * first matching scenario of A → B → C → D wins.
 */
export function computeDstAdvisory(input: DstAdvisoryInput): string | null {
  const { scopes, actualDateTime, dvrAppliesDST, now, isDst = isInDST } = input

  const hasActualTimeScope = scopes.some((s) => s.isActualTime && s.startDateTime && s.endDateTime)
  if (!hasActualTimeScope || !actualDateTime) return null

  const scopesCrossDST = scopes.some(
    (s) => Boolean(s.startDateTime) && s.isActualTime && isDst(s.startDateTime) !== isDst(actualDateTime),
  )
  const scopeStraddlesDST = scopes.some(
    (s) =>
      Boolean(s.startDateTime) &&
      Boolean(s.endDateTime) &&
      s.isActualTime &&
      isDst(s.startDateTime) !== isDst(s.endDateTime),
  )
  const todayStraddlesWithScope = scopes.some(
    (s) => Boolean(s.startDateTime) && s.isActualTime && doesTodayStraddleDSTWith(s.startDateTime, now, isDst),
  )

  // Scenario A: toggle ON, but DST doesn't affect the dates.
  if (dvrAppliesDST && !scopesCrossDST) {
    const transitions = getDSTTransitionDates(now().getFullYear(), isDst)
    const springMsg = transitions.springForward ? transitions.springForward : 'spring'
    const fallMsg = transitions.fallBack ? transitions.fallBack : 'fall'
    return `DST does not affect the dates you selected. For reference, clocks spring forward on ${springMsg} and fall back on ${fallMsg} in your timezone. If you did this intentionally, it is advisable to pull an additional hour on either side of the pre-DST adjusted DVR time to ensure complete footage recovery.`
  }

  // Scenario B: toggle OFF, but today straddles DST with the scope dates.
  if (!dvrAppliesDST && todayStraddlesWithScope) {
    return "Today's date and the date(s) of interest fall on either side of the DST change. Consider enabling 'DVR Applies DST' if the DVR adjusts for Daylight Saving Time."
  }

  // Scenario C: toggle OFF, the scope range itself straddles DST.
  if (!dvrAppliesDST && scopeStraddlesDST) {
    return "Your requested dates fall on either side of a DST change. Consider enabling 'DVR Applies DST' if the DVR adjusts for Daylight Saving Time."
  }

  // Scenario D: toggle ON and the dates DO cross DST (general warning).
  if (dvrAppliesDST && scopesCrossDST) {
    return 'Note: DVR handling of DST is unpredictable. It is advisable to pull an additional hour on either side of the pre-DST adjusted DVR time to ensure complete footage recovery.'
  }

  return null
}
