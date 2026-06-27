import { describe, it, expect } from 'vitest'
import { cleanOcrText, parseTimestampFromText, getConfidenceLevel } from '@/lib/demo/logic/ocr'

// Ported from the app's OCR text-cleaning pipeline + timestamp parser. The cleaning
// fixes the slips a DVR-display OCR typically makes (O→0, l→1, dropped colons) while
// protecting day/month/meridiem words; the parser then reads six common formats.
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
    expect(parseTimestampFromText('2025-03-08 23:45:30')).toBe('2025-03-08 23:45:30')
  })

  it('parses ISO with a meridiem', () => {
    expect(parseTimestampFromText('2025-03-08 11:45:30 PM')).toBe('2025-03-08 23:45:30')
  })

  it('parses MM/DD/YYYY', () => {
    expect(parseTimestampFromText('03/08/2025 23:45:30')).toBe('2025-03-08 23:45:30')
  })

  it('parses dash DD-MM with a meridiem, swapping when day > 12', () => {
    expect(parseTimestampFromText('13-03-2025 11:45 PM')).toBe('2025-03-13 23:45:00')
  })

  it('parses dash format without a meridiem', () => {
    expect(parseTimestampFromText('13-03-2025 23:45')).toBe('2025-03-13 23:45:00')
  })

  it('parses a compressed 14-digit stamp', () => {
    expect(parseTimestampFromText('20250308234530')).toBe('2025-03-08 23:45:30')
  })

  it('parses time-only against today', () => {
    expect(parseTimestampFromText('23:45:30')).toMatch(/^\d{4}-\d{2}-\d{2} 23:45:30$/)
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
    expect(parseTimestampFromText('03/08/2025 11:45 PM')).toBe('2025-03-08 23:45:00')
  })

  it('parses dash MM-DD in normal order when day <= 12', () => {
    expect(parseTimestampFromText('03-08-2025 23:45:30')).toBe('2025-03-08 23:45:30')
  })

  it('returns null for digits that do not form a valid date', () => {
    expect(parseTimestampFromText('9999999999')).toBeNull()
  })

  it('reformats a compressed 8-digit date', () => {
    expect(cleanOcrText('03082025')).toBe('03/08/2025')
  })
})
