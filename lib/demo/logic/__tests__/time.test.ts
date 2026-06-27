import { describe, it, expect } from 'vitest'
import {
  calculateTimeDifference,
  calculateCorrectedTimeRange,
  calculateDSTAdjustedTimeRange,
  isDvrTimeCorrect,
  roundTo5Min,
  isInDST,
  doesRangeStraddleDST,
  getCurrentFormattedTime,
} from '@/lib/demo/logic/time'

// Ported verbatim from the app's bidirectional-time logic. The offset math uses the
// UTC trick (parse as 'Z') so it is DST-agnostic and zone-independent — which is why
// the assertions below hold regardless of the test runner's local timezone.
describe('calculateTimeDifference', () => {
  it('reports DVR ahead of real time with a formatted HH:MM:SS difference', () => {
    const d = calculateTimeDifference('2025-03-08 12:05:30', '2025-03-08 12:00:00')
    expect(d.direction).toBe('AHEAD OF')
    expect(d.isDvrAhead).toBe(true)
    expect(d.formattedDifference).toBe('00:05:30')
    expect(d.differenceMs).toBe(330000)
  })

  it('reports DVR behind real time', () => {
    const d = calculateTimeDifference('2025-03-08 11:58:00', '2025-03-08 12:00:00')
    expect(d.direction).toBe('BEHIND')
    expect(d.isDvrAhead).toBe(false)
    expect(d.formattedDifference).toBe('00:02:00')
  })

  it('reports a zero difference when DVR and actual match', () => {
    const d = calculateTimeDifference('2025-03-08 12:00:00', '2025-03-08 12:00:00')
    expect(d.formattedDifference).toBe('00:00:00')
    expect(d.differenceMs).toBe(0)
  })

  it('is DST-agnostic — same numeric offset across a DST boundary', () => {
    const a = calculateTimeDifference('2025-03-09 03:30:00', '2025-03-09 03:00:00')
    const b = calculateTimeDifference('2025-07-01 03:30:00', '2025-07-01 03:00:00')
    expect(a.differenceMs).toBe(b.differenceMs)
    expect(a.differenceMs).toBe(1800000)
  })

  it('throws on unparseable input', () => {
    expect(() => calculateTimeDifference('not-a-date', '2025-03-08 12:00:00')).toThrow()
  })
})

describe('isDvrTimeCorrect', () => {
  it('is true only when the difference is exactly zero', () => {
    expect(isDvrTimeCorrect(calculateTimeDifference('2025-03-08 12:00:00', '2025-03-08 12:00:00'))).toBe(true)
    expect(isDvrTimeCorrect(calculateTimeDifference('2025-03-08 12:00:01', '2025-03-08 12:00:00'))).toBe(false)
  })
})

describe('calculateCorrectedTimeRange', () => {
  it('converts an actual-time range to DVR time by adding the offset when DVR is ahead', () => {
    const diff = calculateTimeDifference('2025-03-08 12:05:30', '2025-03-08 12:00:00') // ahead 5:30
    const out = calculateCorrectedTimeRange(
      { startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00' },
      diff,
      true, // input is actual time → produce DVR time
    )
    expect(out.startDateTime).toBe('2025-03-08 23:50:30')
    expect(out.endDateTime).toBe('2025-03-09 01:35:30')
    expect(out.isActualTime).toBe(false)
  })

  it('flips the isActualTime flag on the returned range', () => {
    const diff = calculateTimeDifference('2025-03-08 12:00:00', '2025-03-08 12:05:00') // behind 5:00
    const out = calculateCorrectedTimeRange(
      { startDateTime: '2025-03-08 10:00:00', endDateTime: '2025-03-08 11:00:00' },
      diff,
      false,
    )
    expect(out.isActualTime).toBe(true)
  })
})

describe('calculateDSTAdjustedTimeRange', () => {
  it('shifts the range by exactly one hour and reports the direction (±1)', () => {
    const out = calculateDSTAdjustedTimeRange(
      { startDateTime: '2025-03-08 23:00:00', endDateTime: '2025-03-09 01:00:00' },
      '2025-07-01 12:00:00',
    )
    expect([1, -1]).toContain(out.adjustmentApplied)
    expect(out.startDateTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    const startMs = new Date('2025-03-08T23:00:00Z').getTime()
    const outMs = new Date(out.startDateTime.replace(' ', 'T') + 'Z').getTime()
    expect(Math.abs(outMs - startMs)).toBe(3600000)
  })
})

describe('roundTo5Min', () => {
  it('floors the start (down) and ceils the end (up) to 5-minute boundaries', () => {
    expect(roundTo5Min('2025-03-08 23:47:12', 'down')).toBe('2025-03-08 23:45:00')
    expect(roundTo5Min('2025-03-09 01:31:40', 'up')).toBe('2025-03-09 01:35:00')
  })

  it('zeros the seconds and passes through empty input', () => {
    expect(roundTo5Min('2025-03-08 23:45:30', 'down')).toBe('2025-03-08 23:45:00')
    expect(roundTo5Min('', 'down')).toBe('')
  })
})

describe('DST helpers', () => {
  it('reflects whether the local zone is observing DST (zone-independent contract)', () => {
    const observesDst =
      new Date(2025, 0, 1).getTimezoneOffset() !== new Date(2025, 6, 1).getTimezoneOffset()
    const summer = isInDST('2025-07-01 12:00:00')
    const winter = isInDST('2025-01-01 12:00:00')
    expect(typeof summer).toBe('boolean')
    expect(summer !== winter).toBe(observesDst)
  })

  it('does not straddle DST within a single day', () => {
    expect(doesRangeStraddleDST('2025-07-01 10:00:00', '2025-07-01 11:00:00')).toBe(false)
  })
})

describe('getCurrentFormattedTime', () => {
  it('formats a provided timestamp as YYYY-MM-DD HH:MM:SS', () => {
    expect(getCurrentFormattedTime(1_741_449_600_000)).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    )
  })
})

describe('invalid input fails loud (no NaN in forensic output)', () => {
  it('calculateCorrectedTimeRange throws on an empty/invalid range time', () => {
    const diff = calculateTimeDifference('2025-03-08 12:05:30', '2025-03-08 12:00:00')
    expect(() =>
      calculateCorrectedTimeRange({ startDateTime: '', endDateTime: '2025-03-09 01:30:00' }, diff, true),
    ).toThrow()
  })

  it('calculateDSTAdjustedTimeRange throws on an invalid range time', () => {
    expect(() =>
      calculateDSTAdjustedTimeRange({ startDateTime: 'nope', endDateTime: 'nope' }, '2025-07-01 12:00:00'),
    ).toThrow()
  })
})
