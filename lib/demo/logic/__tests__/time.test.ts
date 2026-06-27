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

describe('calculateCorrectedTimeRange — all four offset-direction quadrants', () => {
  // The most safety-critical math in the engine: the offset direction decides which
  // footage gets pulled. Pin concrete arithmetic for every (isActualTime × isDvrAhead)
  // quadrant so a sign flip in applyTimeOffset cannot ship undetected.
  const range = { startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00' }
  const ahead = calculateTimeDifference('2025-03-08 12:05:30', '2025-03-08 12:00:00') // DVR ahead 00:05:30
  const behind = calculateTimeDifference('2025-03-08 12:00:00', '2025-03-08 12:05:00') // DVR behind 00:05:00

  it('Q1 actual-time + DVR ahead → adds the offset', () => {
    const out = calculateCorrectedTimeRange(range, ahead, true)
    expect(out.startDateTime).toBe('2025-03-08 23:50:30')
    expect(out.endDateTime).toBe('2025-03-09 01:35:30')
    expect(out.isActualTime).toBe(false)
  })

  it('Q2 actual-time + DVR behind → subtracts the offset', () => {
    const out = calculateCorrectedTimeRange(range, behind, true)
    expect(out.startDateTime).toBe('2025-03-08 23:40:00')
    expect(out.endDateTime).toBe('2025-03-09 01:25:00')
    expect(out.isActualTime).toBe(false)
  })

  it('Q3 DVR-time + DVR ahead → subtracts the offset', () => {
    const out = calculateCorrectedTimeRange(range, ahead, false)
    expect(out.startDateTime).toBe('2025-03-08 23:39:30')
    expect(out.endDateTime).toBe('2025-03-09 01:24:30')
    expect(out.isActualTime).toBe(true)
  })

  it('Q4 DVR-time + DVR behind → adds the offset', () => {
    const out = calculateCorrectedTimeRange(range, behind, false)
    expect(out.startDateTime).toBe('2025-03-08 23:50:00')
    expect(out.endDateTime).toBe('2025-03-09 01:35:00')
    expect(out.isActualTime).toBe(true)
  })
})

describe('calculateDSTAdjustedTimeRange', () => {
  it('shifts start and end by exactly adjustmentApplied hours (signed, not just ±1)', () => {
    // Ties the reported direction to the actual arithmetic: the output shift must equal
    // adjustmentApplied × 1h with the correct sign, for both endpoints. Zone-independent.
    const range = { startDateTime: '2025-03-08 23:00:00', endDateTime: '2025-03-09 01:00:00' }
    const out = calculateDSTAdjustedTimeRange(range, '2025-07-01 12:00:00')
    expect([1, -1]).toContain(out.adjustmentApplied)
    const shift = out.adjustmentApplied * 3_600_000
    const startMs = new Date('2025-03-08T23:00:00Z').getTime()
    const endMs = new Date('2025-03-09T01:00:00Z').getTime()
    expect(new Date(out.startDateTime.replace(' ', 'T') + 'Z').getTime() - startMs).toBe(shift)
    expect(new Date(out.endDateTime.replace(' ', 'T') + 'Z').getTime() - endMs).toBe(shift)
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
