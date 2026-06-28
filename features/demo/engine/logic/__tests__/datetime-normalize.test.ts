import { describe, it, expect } from 'vitest'
import { normalizeDateTime } from '@/features/demo/engine/logic/datetime-normalize'

// Fixed "today": 2026-06-28 (local).
const NOW = new Date(2026, 5, 28).getTime()

describe('normalizeDateTime — ISO passthrough', () => {
  it('keeps an already-canonical minute value', () => {
    expect(normalizeDateTime('2026-01-04 13:00', NOW).normalized).toBe('2026-01-04 13:00')
  })
  it('preserves seconds when present', () => {
    expect(normalizeDateTime('2026-02-05 13:00:05', NOW).normalized).toBe('2026-02-05 13:00:05')
  })
  it('normalizes the T separator to a space', () => {
    expect(normalizeDateTime('2026-02-05T13:00:05', NOW).normalized).toBe('2026-02-05 13:00:05')
  })
})

describe('normalizeDateTime — email/military format', () => {
  it('parses HHMMhrs and bare HHMM and trailing "to"', () => {
    expect(normalizeDateTime('2026/01/04 1300hrs', NOW).normalized).toBe('2026-01-04 13:00')
    expect(normalizeDateTime('2026/01/04 1300', NOW).normalized).toBe('2026-01-04 13:00')
    expect(normalizeDateTime('2026/01/04 930', NOW).normalized).toBe('2026-01-04 09:30')
    expect(normalizeDateTime('2026/01/04 1300 to', NOW).normalized).toBe('2026-01-04 13:00')
  })
})

describe('normalizeDateTime — month-name format', () => {
  it('parses short/long month names, optional comma/"at", single-digit day', () => {
    expect(normalizeDateTime('Jan 27, 2026 at 16:00', NOW).normalized).toBe('2026-01-27 16:00')
    expect(normalizeDateTime('January 27, 2026 16:00', NOW).normalized).toBe('2026-01-27 16:00')
    expect(normalizeDateTime('Feb 3, 2026 12:00', NOW).normalized).toBe('2026-02-03 12:00')
  })
})

describe('normalizeDateTime — MDY slash + 12-hour', () => {
  it('converts PM/AM with unambiguous dates (day > 12)', () => {
    expect(normalizeDateTime('12/25/2025 1:00:30 PM', NOW).normalized).toBe('2025-12-25 13:00:30')
    expect(normalizeDateTime('12/25/2025 12:00 AM', NOW).normalized).toBe('2025-12-25 00:00')
    expect(normalizeDateTime('12/25/2025 12:00 PM', NOW).normalized).toBe('2025-12-25 12:00')
  })
  it('disambiguates an ambiguous date (one reading future → picks the past one)', () => {
    const r = normalizeDateTime('06/08/2026 10:00', NOW) // Jun 8 (past) vs Aug 6 (future)
    expect(r.normalized).toBe('2026-06-08 10:00')
    expect(r.warning).toMatch(/disambiguated/i)
  })
  it('blanks the value when both readings are in the future', () => {
    const r = normalizeDateTime('07/10/2026 10:00', NOW) // Jul 10 + Oct 7 both future
    expect(r.normalized).toBe('')
    expect(r.warning).toMatch(/Not imported/i)
  })
})

describe('normalizeDateTime — invalid / unparseable / empty / future', () => {
  it('flags an invalid calendar date', () => {
    const r = normalizeDateTime('2026-02-30 10:00', NOW)
    expect(r.warning).toMatch(/Invalid date\/time/i)
  })
  it('passes through an unparseable value with a warning', () => {
    const r = normalizeDateTime('sometime next week', NOW)
    expect(r.normalized).toBe('sometime next week')
    expect(r.warning).toMatch(/Could not parse/i)
  })
  it('flags an empty value', () => {
    expect(normalizeDateTime('   ', NOW).warning).toMatch(/Empty/i)
  })
  it('appends a future-date warning to a valid future date', () => {
    const r = normalizeDateTime('2026-12-25 10:00', NOW)
    expect(r.normalized).toBe('2026-12-25 10:00')
    expect(r.warning).toMatch(/in the future/i)
  })
})
