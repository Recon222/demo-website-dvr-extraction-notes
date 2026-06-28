import { describe, it, expect, vi } from 'vitest'
import {
  parsePartsLoose,
  formatStored,
  formatDate,
  formatTime,
  daysInMonth,
  clampDay,
  pad2,
  nowParts,
  mergeDate,
  mergeTime,
} from '@/features/demo/engine/logic/datetime-parts'
import { FIXED_NOW, makeParts } from '@/features/demo/ui/inputs/__tests__/test-utils'

describe('parsePartsLoose', () => {
  it('parses a canonical "YYYY-MM-DD HH:MM:SS" into parts', () => {
    expect(parsePartsLoose('2025-03-08 12:05:30')).toEqual(makeParts())
  })
  it('accepts a "T" separator', () => {
    expect(parsePartsLoose('2025-03-08T12:05:30')).toEqual(makeParts())
  })
  it('defaults seconds to 0 when omitted', () => {
    expect(parsePartsLoose('2025-03-08 12:05')).toEqual(makeParts({ s: 0 }))
  })
  it('returns null for empty string', () => {
    expect(parsePartsLoose('')).toBeNull()
  })
  it('returns null for a malformed string', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parsePartsLoose('not-a-date')).toBeNull()
    warn.mockRestore()
  })
  it('returns null for out-of-range values (regex passes digit-count but not ranges)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parsePartsLoose('2025-13-01 00:00:00')).toBeNull() // month 13
    expect(parsePartsLoose('2025-02-00 00:00:00')).toBeNull() // day 0
    expect(parsePartsLoose('2025-02-10 24:00:00')).toBeNull() // hour 24
    expect(parsePartsLoose('2025-02-10 00:60:00')).toBeNull() // minute 60
    warn.mockRestore()
  })
})

describe('daysInMonth', () => {
  it('returns 28 for non-leap February', () => {
    expect(daysInMonth(2025, 2)).toBe(28)
  })
  it('returns 29 for leap February', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2000, 2)).toBe(29) // divisible by 400
    expect(daysInMonth(1900, 2)).toBe(28) // divisible by 100 but not 400
  })
  it('returns 30 and 31 for April and January', () => {
    expect(daysInMonth(2025, 4)).toBe(30)
    expect(daysInMonth(2025, 1)).toBe(31)
  })
})

describe('clampDay', () => {
  it('clamps day 31 to 28 in non-leap February', () => {
    expect(clampDay(2025, 2, 31)).toBe(28)
  })
  it('leaves an in-range day unchanged', () => {
    expect(clampDay(2025, 3, 15)).toBe(15)
  })
})

describe('pad2', () => {
  it('zero-pads single digits', () => {
    expect(pad2(3)).toBe('03')
    expect(pad2(12)).toBe('12')
  })
})

describe('formatStored / formatDate / formatTime', () => {
  it('formatStored round-trips parsePartsLoose', () => {
    const s = '2025-03-08 12:05:30'
    expect(formatStored(parsePartsLoose(s)!)).toBe(s)
  })
  it('formatStored applies clampDay', () => {
    expect(formatStored(makeParts({ mo: 2, d: 31 }))).toBe('2025-02-28 12:05:30')
  })
  it('formatDate/formatTime return an em-dash for null', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatTime(null)).toBe('—')
  })
  it('formatTime zero-pads', () => {
    expect(formatTime(makeParts({ h: 1, mi: 2, s: 3 }))).toBe('01:02:03')
  })
})

describe('nowParts', () => {
  it('reads parts from the injected clock', () => {
    expect(nowParts(FIXED_NOW)).toEqual(makeParts())
  })
})

describe('mergeDate', () => {
  it('sets the date and preserves the time', () => {
    expect(mergeDate('2025-03-08 10:20:30', { y: 2026, mo: 7, d: 4 }, FIXED_NOW)).toBe(
      '2026-07-04 10:20:30',
    )
  })
  it('clamps the day to the target month length', () => {
    expect(mergeDate('2025-01-31 10:20:30', { y: 2025, mo: 2, d: 31 }, FIXED_NOW)).toBe(
      '2025-02-28 10:20:30',
    )
  })
  it('seeds the time from now() when the value is empty', () => {
    expect(mergeDate('', { y: 2025, mo: 3, d: 8 }, FIXED_NOW)).toBe('2025-03-08 12:05:30')
  })
})

describe('mergeTime', () => {
  it('sets the time and preserves the date', () => {
    expect(mergeTime('2025-03-08 10:20:30', { h: 23, mi: 59, s: 1 }, FIXED_NOW)).toBe(
      '2025-03-08 23:59:01',
    )
  })
  it('seeds the date from now() when the value is empty', () => {
    expect(mergeTime('', { h: 9, mi: 8, s: 7 }, FIXED_NOW)).toBe('2025-03-08 09:08:07')
  })
  it('always emits seconds (HH:MM:SS)', () => {
    expect(mergeTime('2025-03-08 10:20:30', { h: 0, mi: 0, s: 0 }, FIXED_NOW)).toBe(
      '2025-03-08 00:00:00',
    )
  })
})
