import { describe, it, expect } from 'vitest'
import {
  coerceField,
  isNullValue,
  normalizePhoneNumber,
  normalizeYesNo,
  normalizeTimePeriodType,
  normalizeOfficerFields,
  normalizeExtractedFields,
  parseNormalizeMap,
} from '@/features/demo/engine/logic/import-normalize'
import { parseAiJson } from '@/features/demo/engine/logic/import'
import { RAW_CLEAN, RAW_MESSY, RAW_NULLS, RAW_NO_JSON } from '@/features/demo/engine/logic/__tests__/import-fixtures'

// Fixed "today" for the date pipeline: 2025-04-12 (so the sample's March 2025 dates stay 2025).
const NOW = new Date(2025, 3, 12).getTime()

describe('coerceField / isNullValue', () => {
  it('coerces null indicators to empty and trims real values', () => {
    for (const v of ['N/A', 'none', '-', '  ', 'unknown', 'Not Specified']) {
      expect(coerceField(v)).toBe('')
      expect(isNullValue(v)).toBe(true)
    }
    expect(coerceField('  35 days ')).toBe('35 days')
    expect(isNullValue('35 days')).toBe(false)
  })
})

describe('normalizePhoneNumber', () => {
  it('formats 10-digit variants to XXX-XXX-XXXX', () => {
    expect(normalizePhoneNumber('(416) 487-7387')).toBe('416-487-7387')
    expect(normalizePhoneNumber('4164877387')).toBe('416-487-7387')
    expect(normalizePhoneNumber('+1 416-487-7387')).toBe('416-487-7387')
    expect(normalizePhoneNumber('1-416-487-7387')).toBe('416-487-7387')
  })
  it('preserves non-10-digit input and blanks empty', () => {
    expect(normalizePhoneNumber('123')).toBe('123')
    expect(normalizePhoneNumber('   ')).toBe('')
  })
})

describe('normalizeYesNo', () => {
  it('maps truthy/falsey variants and blanks the rest', () => {
    for (const v of ['true', 'y', 'YES', 'Yes']) expect(normalizeYesNo(v)).toBe('Yes')
    for (const v of ['false', 'n', 'NO', 'No']) expect(normalizeYesNo(v)).toBe('No')
    for (const v of ['unknown', '', 'maybe']) expect(normalizeYesNo(v)).toBe('')
  })
})

describe('normalizeTimePeriodType', () => {
  it('maps DVR/Actual variants with a safe default', () => {
    for (const v of ['recorder time', 'dvr', 'system time', 'DVR Time']) expect(normalizeTimePeriodType(v)).toBe('DVR Time')
    for (const v of ['real time', 'live', 'actual', 'Actual Time']) expect(normalizeTimePeriodType(v)).toBe('Actual Time')
    expect(normalizeTimePeriodType('something else')).toBe('Actual Time')
  })
})

describe('normalizeOfficerFields', () => {
  it('extracts a #badge from the name when badge is empty', () => {
    const r = normalizeOfficerFields('Det. Naplioni #2015', '', '')
    expect(r.rName).toBe('Det. Naplioni')
    expect(r.badge).toBe('2015')
    expect(r.warnings.length).toBe(2)
  })
  it('extracts a badge from a numeric email local-part', () => {
    const r = normalizeOfficerFields('Det. Smith', '', '2015@yrp.ca')
    expect(r.badge).toBe('2015')
  })
  it('keeps an AI-provided badge when the name carries a different one', () => {
    const r = normalizeOfficerFields('Det. Naplioni #2015', '9999', '')
    expect(r.badge).toBe('9999')
    expect(r.rName).toBe('Det. Naplioni')
  })
})

describe('normalizeExtractedFields', () => {
  it('coerces every null indicator to empty without throwing', () => {
    const { fields } = normalizeExtractedFields(parseAiJson(RAW_NULLS))
    expect(fields.offenceType).toBe('')
    expect(fields.city).toBe('')
    expect(fields.hasVideoMonitor).toBe('')
    expect(fields.requestingOfficerName).toBe('')
  })
  it('normalizes the time-frame start to canonical, maps type, coerces cameras', () => {
    const { fields } = normalizeExtractedFields(parseAiJson(RAW_MESSY), { currentTimeMs: NOW })
    expect(fields.extractionTimeFrames[0].extractionStartTime).toBe('2025-03-08 23:45')
    expect(fields.extractionTimeFrames[0].timePeriodType).toBe('DVR Time')
    expect(fields.extractionTimeFrames[0].cameraDetails).toBe('cameras 3, 4 and 7')
  })
  it('records warnings for officer/phone/enum transformations', () => {
    const { warnings } = normalizeExtractedFields(parseAiJson(RAW_MESSY), { currentTimeMs: NOW })
    const fields = warnings.map((w) => w.field)
    expect(fields).toContain('badgeNumber')
    expect(fields).toContain('locationContactPhone')
    expect(fields).toContain('hasVideoMonitor')
    expect(fields).toContain('timePeriodType') // 'recorder time' → 'DVR Time'
  })
})

describe('parseNormalizeMap', () => {
  it('parses fenced/chatter-wrapped JSON and maps to a clean patch', () => {
    const t = parseNormalizeMap(RAW_MESSY, { currentTimeMs: NOW })
    const { patch } = t
    expect(patch.requesterName).toBe('Det. Naplioni')
    expect(patch.requesterBadgeNumber).toBe('2015')
    expect(patch.locationPhone).toBe('416-487-7387')
    expect(patch._import.hasVideoMonitor).toBe('Yes')
    expect(patch._import.timeFrames[0].isActualTime).toBe(false) // DVR time
    expect(patch._import.timeFrames[0].startDateTime).toBe('2025-03-08 23:45') // normalized
    expect(t.timeFrameCount).toBe(1)
  })
  it('never maps the requester occurrence number into the patch', () => {
    const t = parseNormalizeMap(RAW_CLEAN)
    expect(JSON.stringify(t.patch)).not.toContain('PR25-0098213')
  })
  it('reports a recognized-field count (blank-vs-garbage signal)', () => {
    expect(parseNormalizeMap(RAW_CLEAN).fieldCount).toBeGreaterThan(0)
    expect(parseNormalizeMap(RAW_NULLS).fieldCount).toBe(0)
  })
  it('throws when there is no JSON object in the reply', () => {
    expect(() => parseNormalizeMap(RAW_NO_JSON)).toThrow()
  })
  it('does not warn on a legitimately blank time-frame field (M4)', () => {
    const raw = JSON.stringify({
      requestingOfficerName: 'Det. X',
      extractionTimeFrames: [{ extractionStartTime: '2025-03-08 23:45', extractionEndTime: '', timePeriodType: 'Actual Time', cameraDetails: '' }],
    })
    const t = parseNormalizeMap(raw, { currentTimeMs: NOW, sourceText: '' })
    expect(t.warnings.some((w) => /empty datetime/i.test(w.reason))).toBe(false)
    expect(t.patch._import.timeFrames[0].endDateTime).toBe('')
  })
  it('corrects a hallucinated year and records a year_correction warning', () => {
    const raw = JSON.stringify({
      requestingOfficerName: 'Det. X',
      extractionTimeFrames: [{ extractionStartTime: '2023-02-05 13:00', extractionEndTime: '', timePeriodType: 'Actual Time', cameraDetails: '' }],
    })
    const NOW2026 = new Date(2026, 5, 28).getTime()
    const t = parseNormalizeMap(raw, { currentTimeMs: NOW2026, sourceText: 'Feb 5 from 1pm' })
    expect(t.patch._import.timeFrames[0].startDateTime).toBe('2026-02-05 13:00') // proximity-corrected
    expect(t.warnings.some((w) => w.kind === 'year_correction')).toBe(true)
  })
})
