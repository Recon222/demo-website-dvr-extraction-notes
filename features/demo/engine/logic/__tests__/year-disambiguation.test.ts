import { describe, it, expect } from 'vitest'
import {
  sourceContainsFullDate,
  findYearTokenNear,
  inferYearByProximity,
  disambiguateHallucinatedYear,
} from '@/features/demo/engine/logic/year-disambiguation'

// Fixed "today": 2026-06-28 (local).
const NOW = new Date(2026, 5, 28).getTime()

describe('sourceContainsFullDate', () => {
  it('matches contiguous numeric forms with the year', () => {
    expect(sourceContainsFullDate('seized 2024-02-05 footage', 2024, 2, 5)).toBe(true)
    expect(sourceContainsFullDate('on 02/05/2024 at noon', 2024, 2, 5)).toBe(true)
    expect(sourceContainsFullDate('dated 05-02-2024 (dd-mm)', 2024, 2, 5)).toBe(true)
  })
  it('is false without the year or on empty source', () => {
    expect(sourceContainsFullDate('footage from Feb 5', 2024, 2, 5)).toBe(false)
    expect(sourceContainsFullDate('', 2024, 2, 5)).toBe(false)
  })
  it('does not match an unpadded date inside a different date (boundary guard, H1)', () => {
    expect(sourceContainsFullDate('recovered 11/5/2024 footage', 2024, 1, 5)).toBe(false)
  })
})

describe('findYearTokenNear', () => {
  it('finds a standalone year next to the date fragment', () => {
    expect(findYearTokenNear('around February 5, 2024 we need video', 'February 5', 2024)).toBe(true)
  })
  it('rejects a year embedded in a reference number (immunity)', () => {
    expect(findYearTokenNear('OCC#2024-44321 re Feb 5 footage', 'Feb 5', 2024)).toBe(false)
  })
  it('is false when the year is outside the ±150-char window', () => {
    const far = `Feb 5 ${'x'.repeat(200)} 2024`
    expect(findYearTokenNear(far, 'Feb 5', 2024)).toBe(false)
  })
  it('finds the year on a later occurrence when the first is year-less (M1)', () => {
    const src = `re Feb 5 footage ${'x'.repeat(200)} incident on Feb 5, 2024`
    expect(findYearTokenNear(src, 'Feb 5', 2024)).toBe(true)
  })
})

describe('inferYearByProximity', () => {
  it('uses the current year for a past month/day', () => {
    expect(inferYearByProximity(3, 8, NOW)).toBe(2026) // Mar 8 is before Jun 28
  })
  it('uses the prior year for a future month/day', () => {
    expect(inferYearByProximity(12, 1, NOW)).toBe(2025) // Dec 1 would be future
  })
})

describe('disambiguateHallucinatedYear', () => {
  it('passes through an unparseable date', () => {
    expect(disambiguateHallucinatedYear('not a date', '', NOW).reason).toBe('unparseable_passthrough')
  })
  it('trusts an explicit source year (cold case), even if old', () => {
    const r = disambiguateHallucinatedYear('2019-02-05T13:00', 'footage from February 5, 2019', NOW)
    expect(r.reason).toBe('ai_year_plausible')
    expect(r.chosenDate).toBe('2019-02-05T13:00')
  })
  it('keeps the AI year when proximity agrees', () => {
    const r = disambiguateHallucinatedYear('2026-03-08 23:45', '', NOW)
    expect(r.reason).toBe('ai_year_plausible')
    expect(r.chosenYear).toBe(2026)
  })
  it('corrects an implausibly old year by proximity', () => {
    const r = disambiguateHallucinatedYear('2023-02-05T13:00', 'Feb 5 from 1pm', NOW)
    expect(r.reason).toBe('ai_year_implausibly_old')
    expect(r.chosenDate).toBe('2026-02-05T13:00')
  })
  it('corrects an implausibly future year by proximity', () => {
    const r = disambiguateHallucinatedYear('2027-03-08 10:00', '', NOW)
    expect(r.reason).toBe('ai_year_implausibly_future')
    expect(r.chosenDate).toBe('2026-03-08 10:00')
  })
  it('does not let a nearby OCC number confirm a hallucinated year', () => {
    const r = disambiguateHallucinatedYear('2024-02-05T13:00', 'OCC#2024-44321 re Feb 5 from 1pm', NOW)
    expect(r.chosenYear).toBe(2026)
    expect(r.reason).toBe('ai_year_implausibly_old')
  })
  it('does not let a substring date confirm a hallucinated year (H1 end-to-end)', () => {
    // source has "11/5/2024" (Nov 5); AI claims Jan 5 2024 — "1/5/2024" must NOT match as a substring
    const r = disambiguateHallucinatedYear('2024-01-05 10:00', 'footage from 11/5/2024', NOW)
    expect(r.chosenYear).toBe(2026)
    expect(r.reason).toBe('ai_year_implausibly_old')
  })
  it('cold-case guard fires via sourceContainsFullDate on a numeric-only source (Gap5)', () => {
    // No prose month/day fragment for findYearTokenNear to anchor on — sourceContainsFullDate is the sole trigger.
    const r = disambiguateHallucinatedYear('2024-02-05T13:00', 'seized 2024-02-05 footage', NOW)
    expect(r.reason).toBe('ai_year_plausible')
    expect(r.chosenDate).toBe('2024-02-05T13:00')
  })
})
