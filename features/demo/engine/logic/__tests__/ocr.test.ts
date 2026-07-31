import { describe, it, expect } from 'vitest'
import {
  cleanOcrText,
  parseTimestampFromText,
  getConfidenceLevel,
  readDvrTimestamp,
  isDvrDraftCommittable,
} from '@/features/demo/engine/logic/ocr'
import { OCR_SAMPLE_FRAMES, SAMPLE_ACTUAL_TIME } from '@/features/demo/engine/content/seed'

/** Fixed "today" for every clock-sensitive assertion: 2026-07-31 12:00 local. */
const NOW = new Date(2026, 6, 31, 12, 0, 0).getTime()

/** The datetime string of a successful parse, or null. Keeps the format assertions readable. */
const dt = (text: string) => {
  const p = parseTimestampFromText(text)
  return p?.kind === 'datetime' ? p.value : null
}

// Ported from the app's OCR text-cleaning pipeline + timestamp parser. The cleaning
// fixes the slips a DVR-display OCR typically makes (O→0, l→1, dropped colons) while
// protecting day/month/meridiem words; the parser then reads several common formats.
describe('cleanOcrText', () => {
  it('substitutes OCR confusables but preserves protected words', () => {
    expect(cleanOcrText('Mon O1/O2/2O25')).toBe('Mon 01/02/2025')
  })

  it('repairs a compressed HHMM:SS into HH:MM:SS', () => {
    expect(cleanOcrText('2345:30')).toBe('23:45:30')
  })

  it('separates a meridiem suffix stuck to the digits', () => {
    expect(cleanOcrText('11:45PM')).toBe('11:45 PM')
  })
})

describe('parseTimestampFromText', () => {
  it('parses ISO YYYY-MM-DD HH:MM:SS', () => {
    expect(dt('2025-03-08 23:45:30')).toBe('2025-03-08 23:45:30')
  })

  it('parses ISO with a meridiem', () => {
    expect(dt('2025-03-08 11:45:30 PM')).toBe('2025-03-08 23:45:30')
  })

  it('parses MM/DD/YYYY', () => {
    expect(dt('03/08/2025 23:45:30')).toBe('2025-03-08 23:45:30')
  })

  it('parses dash DD-MM with a meridiem, swapping when day > 12', () => {
    expect(dt('13-03-2025 11:45 PM')).toBe('2025-03-13 23:45:00')
  })

  it('parses dash format without a meridiem', () => {
    expect(dt('13-03-2025 23:45')).toBe('2025-03-13 23:45:00')
  })

  it('parses a compressed 14-digit stamp', () => {
    expect(dt('20250308234530')).toBe('2025-03-08 23:45:30')
  })

  // Was: "parses time-only against today" — the parser used to stamp new Date() over a
  // dateless frame. It now REPORTS the absence so the confirm step can challenge it.
  it('reports a dateless frame as time-only instead of inventing a date', () => {
    expect(parseTimestampFromText('23:45:30')).toEqual({ kind: 'time-only', time: '23:45:30' })
  })

  it('rejects an out-of-range time-only frame', () => {
    expect(parseTimestampFromText('99:45:30')).toBeNull()
  })

  it('returns null for text with no timestamp', () => {
    expect(parseTimestampFromText('rear entrance camera')).toBeNull()
  })
})

describe('getConfidenceLevel', () => {
  it('maps the score into a tier with a colour', () => {
    expect(getConfidenceLevel(0.9).level).toBe('high')
    expect(getConfidenceLevel(0.9).color).toBe('#10d177')
    expect(getConfidenceLevel(0.7).level).toBe('medium')
    expect(getConfidenceLevel(0.5).level).toBe('low')
    expect(getConfidenceLevel(0.2).level).toBe('fail')
  })

  it('uses inclusive (>=) tier boundaries', () => {
    expect(getConfidenceLevel(0.8).level).toBe('high')
    expect(getConfidenceLevel(0.6).level).toBe('medium')
    expect(getConfidenceLevel(0.4).level).toBe('low')
    expect(getConfidenceLevel(0.39).level).toBe('fail')
  })
})

describe('parser/cleaner extra formats (branch coverage)', () => {
  it('parses MM/DD/YYYY with a meridiem', () => {
    expect(dt('03/08/2025 11:45 PM')).toBe('2025-03-08 23:45:00')
  })

  it('parses dash MM-DD in normal order when day <= 12', () => {
    expect(dt('03-08-2025 23:45:30')).toBe('2025-03-08 23:45:30')
  })

  it('returns null for digits that do not form a valid date', () => {
    expect(dt('9999999999')).toBeNull()
  })

  it('reformats a compressed 8-digit date', () => {
    expect(cleanOcrText('03082025')).toBe('03/08/2025')
  })
})

describe('readDvrTimestamp', () => {
  it('passes an unambiguous year-first read straight through', () => {
    expect(readDvrTimestamp('2025-03-08 12:05:30', NOW)).toEqual({
      dvrTime: '2025-03-08 12:05:30',
      assumedDate: null,
      ambiguity: null,
    })
  })

  it('returns null when nothing timestamp-shaped is present', () => {
    expect(readDvrTimestamp('rear entrance camera', NOW)).toBeNull()
  })

  it('flags a dateless frame with the assumed date rather than committing it silently', () => {
    expect(readDvrTimestamp('12:05:30', NOW)).toEqual({
      dvrTime: '2026-07-31 12:05:30',
      assumedDate: '2026-07-31',
      ambiguity: null,
    })
  })

  it('derives the assumed date from the injected clock, not the host clock', () => {
    const reading = readDvrTimestamp('12:05:30', new Date(2027, 0, 2, 3, 0, 0).getTime())
    expect(reading?.assumedDate).toBe('2027-01-02')
    expect(reading?.dvrTime).toBe('2027-01-02 12:05:30')
  })

  it('resolves an ambiguous year-last date and reports the resolution', () => {
    const reading = readDvrTimestamp('06/07/2024 23:45:30', NOW)
    expect(reading?.ambiguity?.chosenFormat).toBe('MM-DD')
    expect(reading?.ambiguity?.chosenDate).toBe('2024-06-07')
    expect(reading?.ambiguity?.alternativeDate).toBe('2024-07-06')
    expect(reading?.ambiguity?.confidence).toBe('low')
    expect(reading?.assumedDate).toBeNull()
  })

  it('rewrites dvrTime to the resolver choice so the field can never disagree with the warning', () => {
    // 07/10 with today = 2026-07-31: DD-MM (Oct 7) is 297d away, MM-DD (Jul 10) is 386d —
    // the resolver picks DD-MM, i.e. the OPPOSITE of the parser's MM-DD default.
    const reading = readDvrTimestamp('07/10/2025 23:45:30', NOW)
    expect(reading?.ambiguity?.chosenFormat).toBe('DD-MM')
    expect(reading?.ambiguity?.chosenDate).toBe('2025-10-07')
    expect(reading?.dvrTime).toBe('2025-10-07 23:45:30')
    // the parse on its own would have said MM-DD
    expect(dt('07/10/2025 23:45:30')).toBe('2025-07-10 23:45:30')
  })

  it('does not disambiguate when a component settles the order (day > 12)', () => {
    expect(readDvrTimestamp('13-03-2025 23:45', NOW)).toEqual({
      dvrTime: '2025-03-13 23:45:00',
      assumedDate: null,
      ambiguity: null,
    })
  })

  it('does not disambiguate a compressed 14-digit stamp (year-first by construction)', () => {
    expect(readDvrTimestamp('20250308234530', NOW)?.ambiguity).toBeNull()
  })

  it('normalises a 2-digit year before resolving', () => {
    const reading = readDvrTimestamp('06-07-24 23:45:30', NOW)
    expect(reading?.ambiguity?.chosenDate).toBe('2024-06-07')
    expect(reading?.dvrTime).toBe('2024-06-07 23:45:30')
  })
})

// The sample frames are content, and the content is load-bearing: each one is the ONLY way
// its arm of the confirmation step can be reached in a cameraless demo. If a frame stops
// producing the case it was chosen for, the surface it feeds goes dark and nothing else fails.
describe('OCR sample frames reach the case each was chosen for', () => {
  const read = (frame: keyof typeof OCR_SAMPLE_FRAMES, nowMs = NOW) =>
    readDvrTimestamp(cleanOcrText(OCR_SAMPLE_FRAMES[frame]), nowMs)

  it('clean: parses cleanly, no warning, no assumption', () => {
    expect(read('clean')).toEqual({ dvrTime: '2025-03-08 12:05:30', assumedDate: null, ambiguity: null })
  })

  it('clean: is the 00:05:30 the marquee offset depends on', () => {
    // SAMPLE_ACTUAL_TIME is 12:00:00 on the same day.
    expect(read('clean')?.dvrTime).toBe('2025-03-08 12:05:30')
    expect(SAMPLE_ACTUAL_TIME).toBe('2025-03-08 12:00:00')
  })

  it('ambiguous: resolves at LOW confidence, so the warning actually renders', () => {
    expect(read('ambiguous')?.ambiguity?.confidence).toBe('low')
  })

  it('ambiguous: stays low-confidence as the visitor’s clock moves further forward', () => {
    const in2030 = new Date(2030, 0, 1).getTime()
    expect(read('ambiguous', in2030)?.ambiguity?.confidence).toBe('low')
  })

  it('timeOnly: carries no date, so the assumed-date gate engages', () => {
    expect(read('timeOnly')?.assumedDate).toBe('2026-07-31')
  })
})

describe('isDvrDraftCommittable', () => {
  it('refuses an empty draft, whatever else is true', () => {
    expect(isDvrDraftCommittable('', null, false)).toBe(false)
    expect(isDvrDraftCommittable('', '2026-07-31', true)).toBe(false)
  })

  it('allows a read that carried its own date', () => {
    expect(isDvrDraftCommittable('2025-03-08 12:05:30', null, false)).toBe(true)
  })

  it('holds an unconfirmed assumed date', () => {
    expect(isDvrDraftCommittable('2026-07-31 12:05:30', '2026-07-31', false)).toBe(false)
  })

  it('releases on an explicit confirmation', () => {
    expect(isDvrDraftCommittable('2026-07-31 12:05:30', '2026-07-31', true)).toBe(true)
  })

  it('releases when the assumed date has been corrected, without a confirmation', () => {
    expect(isDvrDraftCommittable('2025-03-08 12:05:30', '2026-07-31', false)).toBe(true)
  })

  it('keeps holding when only the TIME was edited — the date is still the assumption', () => {
    expect(isDvrDraftCommittable('2026-07-31 09:00:00', '2026-07-31', false)).toBe(false)
  })
})
