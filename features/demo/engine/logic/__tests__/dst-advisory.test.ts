import { describe, it, expect } from 'vitest'
import {
  computeDstAdvisory,
  doesTodayStraddleDSTWith,
  getDSTTransitionDates,
  type DstAdvisoryScope,
  type IsDstFn,
} from '@/features/demo/engine/logic/dst-advisory'
import { dstStatusDiffers, getCurrentFormattedTime } from '@/features/demo/engine/logic/time'

// DST detection is injected so these assertions pin BRANCH behaviour rather than the test
// runner's timezone (CI containers default to UTC, which never observes DST). The fake speaks
// the real North-American rule: second Sunday in March → first Sunday in November.
const US_DST: Record<number, { start: string; end: string }> = {
  2025: { start: '2025-03-09', end: '2025-11-02' },
  2026: { start: '2026-03-08', end: '2026-11-01' }, // fall-back lands on the 1st of the month
}
const usIsDst: IsDstFn = (dateTime) => {
  const date = dateTime.slice(0, 10)
  const table = US_DST[Number(date.slice(0, 4))]
  if (!table) throw new Error(`test fake has no DST table for ${date}`)
  return date >= table.start && date < table.end
}
const neverDst: IsDstFn = () => false

/** A local-noon clock — `getCurrentFormattedTime` reads local parts, so this is TZ-stable. */
const clockAt = (y: number, monthIndex: number, day: number) => () => new Date(y, monthIndex, day, 12)

const scope = (o: Partial<DstAdvisoryScope> = {}): DstAdvisoryScope => ({
  startDateTime: '2026-06-01 09:00:00',
  endDateTime: '2026-06-01 17:00:00',
  isActualTime: true,
  ...o,
})

const SUMMER_2026 = '2026-06-05 12:00:00'

describe('getDSTTransitionDates', () => {
  it('reports both transitions in the phone’s "MMMM d, yyyy" format', () => {
    expect(getDSTTransitionDates(2025, usIsDst)).toEqual({
      springForward: 'March 9, 2025',
      fallBack: 'November 2, 2025',
    })
  })

  it('finds a transition that lands on the first of a month (the phone misses this)', () => {
    // The phone's scan compares day..day+1 only WITHIN a month
    // (`src/lib/utils/bidirectional-time.ts:330-344`), so an Oct 31 → Nov 1 flip is invisible
    // and the advisory degrades to the literal word "fall".
    expect(getDSTTransitionDates(2026, usIsDst)).toEqual({
      springForward: 'March 8, 2026',
      fallBack: 'November 1, 2026',
    })
  })

  it('returns nulls for a zone that never observes DST', () => {
    expect(getDSTTransitionDates(2026, neverDst)).toEqual({ springForward: null, fallBack: null })
  })

  it('defaults to the host zone: either both transitions resolve, or the zone has none', () => {
    const { springForward, fallBack } = getDSTTransitionDates(2026)
    if (springForward === null) {
      expect(fallBack).toBeNull()
    } else {
      expect(springForward).toMatch(/^[A-Z][a-z]+ \d{1,2}, 2026$/)
      expect(fallBack).toMatch(/^[A-Z][a-z]+ \d{1,2}, 2026$/)
    }
  })
})

describe('doesTodayStraddleDSTWith', () => {
  it('compares the injected today against the given date', () => {
    expect(doesTodayStraddleDSTWith('2026-06-01 09:00:00', clockAt(2026, 0, 15), usIsDst)).toBe(true)
    expect(doesTodayStraddleDSTWith('2026-06-01 09:00:00', clockAt(2026, 6, 15), usIsDst)).toBe(false)
  })

  it('its default seam is the engine’s own isInDST (same answer as dstStatusDiffers)', () => {
    const now = clockAt(2026, 0, 15)
    const today = getCurrentFormattedTime(now().getTime())
    for (const d of ['2026-06-01 09:00:00', '2026-01-20 09:00:00', '2026-11-15 09:00:00']) {
      expect(doesTodayStraddleDSTWith(d, now)).toBe(dstStatusDiffers(today, d))
    }
  })
})

describe('computeDstAdvisory — gate', () => {
  const base = { dvrAppliesDST: false, now: clockAt(2026, 6, 15), isDst: usIsDst }

  it('is silent with no real-time scope', () => {
    const scopes = [scope({ isActualTime: false, startDateTime: '2026-01-10 09:00:00' })]
    expect(computeDstAdvisory({ ...base, scopes, actualDateTime: SUMMER_2026 })).toBeNull()
  })

  it('is silent when a real-time scope is missing an endpoint', () => {
    const scopes = [scope({ endDateTime: '' })]
    expect(computeDstAdvisory({ ...base, scopes, actualDateTime: SUMMER_2026 })).toBeNull()
  })

  it('is silent with no collection time', () => {
    expect(computeDstAdvisory({ ...base, scopes: [scope()], actualDateTime: '' })).toBeNull()
  })

  it('is silent when the toggle is off and nothing straddles DST', () => {
    expect(computeDstAdvisory({ ...base, scopes: [scope()], actualDateTime: SUMMER_2026 })).toBeNull()
  })
})

describe('computeDstAdvisory — scenario A (toggle ON, dates unaffected)', () => {
  it('names the zone’s transition dates', () => {
    const msg = computeDstAdvisory({
      scopes: [scope()],
      actualDateTime: SUMMER_2026,
      dvrAppliesDST: true,
      now: clockAt(2026, 6, 15),
      isDst: usIsDst,
    })
    expect(msg).toBe(
      'DST does not affect the dates you selected. For reference, clocks spring forward on March 8, 2026 and fall back on November 1, 2026 in your timezone. If you did this intentionally, it is advisable to pull an additional hour on either side of the pre-DST adjusted DVR time to ensure complete footage recovery.',
    )
  })

  it('falls back to the words "spring" / "fall" in a zone with no transitions', () => {
    const msg = computeDstAdvisory({
      scopes: [scope()],
      actualDateTime: SUMMER_2026,
      dvrAppliesDST: true,
      now: clockAt(2026, 6, 15),
      isDst: neverDst,
    })
    expect(msg).toContain('clocks spring forward on spring and fall back on fall in your timezone')
  })
})

describe('computeDstAdvisory — scenarios B, C, D', () => {
  it('B: toggle OFF and today sits across the DST line from the scope', () => {
    const msg = computeDstAdvisory({
      scopes: [scope()], // June 2026 — in DST
      actualDateTime: SUMMER_2026,
      dvrAppliesDST: false,
      now: clockAt(2026, 0, 15), // mid-January — outside DST
      isDst: usIsDst,
    })
    expect(msg).toBe(
      "Today's date and the date(s) of interest fall on either side of the DST change. Consider enabling 'DVR Applies DST' if the DVR adjusts for Daylight Saving Time.",
    )
  })

  it('C: toggle OFF and the requested range itself straddles the change', () => {
    const msg = computeDstAdvisory({
      scopes: [scope({ startDateTime: '2026-03-07 22:00:00', endDateTime: '2026-03-09 04:00:00' })],
      actualDateTime: '2026-03-07 23:00:00', // same side as the scope start → no cross
      dvrAppliesDST: false,
      now: clockAt(2026, 2, 7), // same side as the scope start → B does not fire
      isDst: usIsDst,
    })
    expect(msg).toBe(
      "Your requested dates fall on either side of a DST change. Consider enabling 'DVR Applies DST' if the DVR adjusts for Daylight Saving Time.",
    )
  })

  it('B wins over C when both hold (the phone’s branch order)', () => {
    const msg = computeDstAdvisory({
      scopes: [scope({ startDateTime: '2026-03-07 22:00:00', endDateTime: '2026-03-09 04:00:00' })],
      actualDateTime: '2026-03-07 23:00:00',
      dvrAppliesDST: false,
      now: clockAt(2026, 6, 15), // in DST, scope start is not → B holds too
      isDst: usIsDst,
    })
    expect(msg).toContain("Today's date and the date(s) of interest")
  })

  it('D: toggle ON and the dates DO cross DST', () => {
    const msg = computeDstAdvisory({
      scopes: [scope({ startDateTime: '2026-01-10 09:00:00', endDateTime: '2026-01-10 17:00:00' })],
      actualDateTime: SUMMER_2026,
      dvrAppliesDST: true,
      now: clockAt(2026, 6, 15),
      isDst: usIsDst,
    })
    expect(msg).toBe(
      'Note: DVR handling of DST is unpredictable. It is advisable to pull an additional hour on either side of the pre-DST adjusted DVR time to ensure complete footage recovery.',
    )
  })

  it('ignores DVR-time scopes when deciding whether the dates cross', () => {
    // The only crossing scope is DVR-time, so scenario A (not D) must win.
    const msg = computeDstAdvisory({
      scopes: [scope(), scope({ isActualTime: false, startDateTime: '2026-01-10 09:00:00' })],
      actualDateTime: SUMMER_2026,
      dvrAppliesDST: true,
      now: clockAt(2026, 6, 15),
      isDst: usIsDst,
    })
    expect(msg).toContain('DST does not affect the dates you selected')
  })
})
