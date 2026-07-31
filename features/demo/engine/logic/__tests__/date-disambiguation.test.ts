import { describe, it, expect } from 'vitest'
import {
  needsDisambiguation,
  isValidDateInterpretation,
  daysBetween,
  disambiguateDateFormat,
  generateDisambiguationWarning,
} from '@/features/demo/engine/logic/date-disambiguation'

// Fixed "today": 2026-06-28 (local).
const NOW = new Date(2026, 5, 28).getTime()

describe('needsDisambiguation', () => {
  it('is true only when both components are 1..12', () => {
    expect(needsDisambiguation(3, 8)).toBe(true)
    expect(needsDisambiguation(13, 8)).toBe(false)
    expect(needsDisambiguation(8, 13)).toBe(false)
    expect(needsDisambiguation(0, 5)).toBe(false)
  })
})

describe('isValidDateInterpretation', () => {
  it('handles month limits and leap years', () => {
    expect(isValidDateInterpretation(2, 29, 2024)).toBe(true) // leap
    expect(isValidDateInterpretation(2, 29, 2025)).toBe(false) // non-leap
    expect(isValidDateInterpretation(2, 29, 1900)).toBe(false) // century non-leap
    expect(isValidDateInterpretation(2, 29, 2000)).toBe(true) // century leap
    expect(isValidDateInterpretation(4, 31, 2025)).toBe(false)
    expect(isValidDateInterpretation(1, 31, 2025)).toBe(true)
    expect(isValidDateInterpretation(13, 1, 2025)).toBe(false)
  })
})

describe('daysBetween', () => {
  it('is order-independent', () => {
    const a = new Date(2026, 0, 1)
    const b = new Date(2026, 0, 11)
    expect(daysBetween(a, b)).toBe(10)
    expect(daysBetween(b, a)).toBe(10)
  })
})

describe('disambiguateDateFormat — reason codes', () => {
  it('only_mm_dd_valid', () => {
    const r = disambiguateDateFormat(3, 25, 2026, NOW)
    expect(r.reason).toBe('only_mm_dd_valid')
    expect(r.chosenFormat).toBe('MM-DD')
    expect(r.chosenDate).toBe('2026-03-25')
  })
  it('only_dd_mm_valid', () => {
    const r = disambiguateDateFormat(25, 3, 2026, NOW)
    expect(r.reason).toBe('only_dd_mm_valid')
    expect(r.chosenDate).toBe('2026-03-25')
  })
  it('both_interpretations_identical', () => {
    expect(disambiguateDateFormat(5, 5, 2026, NOW).reason).toBe('both_interpretations_identical')
  })
  it('neither_interpretation_valid', () => {
    expect(disambiguateDateFormat(13, 13, 2026, NOW).reason).toBe('neither_interpretation_valid')
  })
  it('future_interpretation_rejected (one future → pick the past one)', () => {
    // mm/dd = Jun 8 2026 (past), dd/mm = Aug 6 2026 (future)
    const r = disambiguateDateFormat(6, 8, 2026, NOW)
    expect(r.reason).toBe('future_interpretation_rejected')
    expect(r.chosenFormat).toBe('MM-DD')
    expect(r.chosenDate).toBe('2026-06-08')
    expect(r.confidence).toBe('high')
  })
  it('both_interpretations_future', () => {
    // mm/dd = Jul 10 2026, dd/mm = Oct 7 2026 — both after Jun 28
    const r = disambiguateDateFormat(7, 10, 2026, NOW)
    expect(r.reason).toBe('both_interpretations_future')
    expect(r.confidence).toBe('low')
  })
  it('year_outside_proximity_window triggers at < current-1, not at current-1 (boundary)', () => {
    expect(disambiguateDateFormat(3, 8, 2020, NOW).reason).toBe('year_outside_proximity_window')
    expect(disambiguateDateFormat(3, 8, 2024, NOW).reason).toBe('year_outside_proximity_window') // < 2025
    expect(disambiguateDateFormat(3, 8, 2025, NOW).reason).not.toBe('year_outside_proximity_window') // == current-1 → proximity
  })
  it('mm_dd_closer_by_7plus — also asserts the chosen calendar date', () => {
    // mm/dd = Jun 1 (27d), dd/mm = Jan 6 (173d) — both past 2026
    const r = disambiguateDateFormat(6, 1, 2026, NOW)
    expect(r.reason).toBe('mm_dd_closer_by_7plus')
    expect(r.confidence).toBe('high')
    expect(r.chosenDate).toBe('2026-06-01')
  })
  it('dd_mm_closer_by_7plus — also asserts the chosen calendar date', () => {
    // mm/dd = Jan 6 (173d), dd/mm = Jun 1 (27d)
    const r = disambiguateDateFormat(1, 6, 2026, NOW)
    expect(r.reason).toBe('dd_mm_closer_by_7plus')
    expect(r.chosenFormat).toBe('DD-MM')
    expect(r.chosenDate).toBe('2026-06-01')
  })
})

// Copy pinned against the phone's OCR sibling module
// (src/features/ocr-time-capture/utils/date-disambiguation.ts:232-280).
describe('generateDisambiguationWarning', () => {
  it('uses the phone-verbatim title and suggestion', () => {
    const w = generateDisambiguationWarning(disambiguateDateFormat(6, 1, 2026, NOW))
    expect(w.title).toBe('Date Format Ambiguity Detected')
    expect(w.suggestion).toBe('Please verify the displayed date matches the DVR screen. If incorrect, edit the date manually.')
  })

  it('builds the comparison description with both format labels and both distances', () => {
    const w = generateDisambiguationWarning(disambiguateDateFormat(6, 1, 2026, NOW))
    expect(w.description).toBe(
      'The date "06/01" could be interpreted as either June 1 (Month-Day (US)) or January 6 (Day-Month (European)). '
      + "System chose Month-Day (US) format as it's 27 day(s) from today vs 173 day(s) for the alternative.",
    )
  })

  it('flips the labels when the resolver chose DD-MM', () => {
    const w = generateDisambiguationWarning(disambiguateDateFormat(1, 6, 2026, NOW))
    expect(w.description).toContain('June 1 (Day-Month (European))')
    expect(w.description).toContain('January 6 (Month-Day (US))')
  })

  it('uses the equidistant wording for an equidistant result', () => {
    // Built by hand, not via disambiguateDateFormat: two DISTINCT interpretations can only be
    // equidistant from today if today is their midpoint, which puts one of them in the future —
    // and the future branch claims that case first. So `equidistant` is unreachable through the
    // resolver (module note, lines 200-203) while the copy branch still has to be pinned.
    const r = {
      chosenDate: '2026-05-04',
      chosenFormat: 'MM-DD',
      alternativeDate: '2026-04-05',
      confidence: 'low',
      reason: 'equidistant',
      chosenDistanceDays: 55,
      alternativeDistanceDays: 55,
    } as const
    expect(generateDisambiguationWarning(r).description).toBe(
      'The date "05/04" is ambiguous. Both interpretations are equally close to today. '
      + 'System chose Month-Day (US) format: May 4. Alternative interpretation: April 5 (Day-Month (European)).',
    )
  })

  it('de-pads the day numerals in the prose but not in the quoted "MM/DD" fragment', () => {
    // ui-mapping 06 fact-check row 3: parseInt() strips the leading zero in the sentence.
    const w = generateDisambiguationWarning(disambiguateDateFormat(6, 1, 2026, NOW))
    expect(w.description).toContain('"06/01"')
    expect(w.description).toContain('June 1 ')
    expect(w.description).not.toContain('June 01')
  })
})
