import { describe, it, expect } from 'vitest'
import {
  parseAiJson,
  mapAiToForm,
  sanitizeInputText,
  buildExtractFieldsUserPrompt,
  SAMPLE_EXTRACTION,
  type ExtractedFields,
} from '@/lib/demo/logic/import'

// The demo doesn't call a real model — the import chapter resolves to SAMPLE_EXTRACTION —
// but the parsing + mapping below is the app's real logic, run verbatim.
describe('parseAiJson', () => {
  it('strips a ```json fence and parses the object', () => {
    const out = parseAiJson('```json\n{"occurrenceNumber":"PR25-1","city":"Mississauga"}\n```')
    expect(out.occurrenceNumber).toBe('PR25-1')
    expect(out.city).toBe('Mississauga')
  })

  it('slices from the first { to the last } when wrapped in prose', () => {
    expect(parseAiJson('Sure! Here you go: {"city":"Toronto"} — done.').city).toBe('Toronto')
  })

  it('throws when there is no JSON object', () => {
    expect(() => parseAiJson('no json here')).toThrow()
  })

  it('throws on empty input', () => {
    expect(() => parseAiJson('')).toThrow()
  })
})

describe('mapAiToForm', () => {
  const ai: ExtractedFields = {
    occurrenceNumber: 'PR25-0098213',
    offenceType: 'B&E',
    requestingOfficerName: 'Liam McHugh',
    badgeNumber: '4471',
    requestingPhone: '',
    requestingEmail: 'det.mchugh.4471@peelpolice.ca',
    businessName: "Kim's Convenience",
    locationAddress: '1450 Eglinton Ave W',
    city: 'Mississauga',
    locationContactName: 'Sandeep Gill',
    locationContactPhone: '905-555-0142',
    dvrMakeModel: 'Hikvision DS-7608',
    dvrRetention: '35 days',
    hasVideoMonitor: 'Yes',
    dvrUsername: 'admin',
    dvrPassword: 'Sp1ce2024',
    extractionTimeFrames: [
      {
        extractionStartTime: '2025-03-08 23:45',
        extractionEndTime: '2025-03-09 01:30',
        timePeriodType: 'Actual Time',
        cameraDetails: 'cameras 3, 4 and 7',
      },
    ],
  }

  it('maps requester, business and address fields onto the location shape', () => {
    const out = mapAiToForm(ai)
    expect(out.requesterName).toBe('Liam McHugh')
    expect(out.businessName).toBe("Kim's Convenience")
    expect(out.streetAddress).toBe('1450 Eglinton Ave W')
    expect(out.city).toBe('Mississauga')
    expect(out.locationContact).toBe('Sandeep Gill')
  })

  it('does NOT map the occurrence number (the case owns it)', () => {
    const out = mapAiToForm(ai) as unknown as Record<string, unknown>
    expect(out.occNumber).toBeUndefined()
    expect(out.occurrenceNumber).toBeUndefined()
  })

  it('maps each time frame to a scope, deriving isActualTime from the time-period type', () => {
    const actual = mapAiToForm(ai)
    expect(actual._import.timeFrames).toHaveLength(1)
    expect(actual._import.timeFrames[0].isActualTime).toBe(true)
    expect(actual._import.timeFrames[0].cameras).toBe('cameras 3, 4 and 7')

    const dvr = mapAiToForm({
      ...ai,
      extractionTimeFrames: [{ ...ai.extractionTimeFrames[0], timePeriodType: 'DVR Time' }],
    })
    expect(dvr._import.timeFrames[0].isActualTime).toBe(false)
  })

  it('tolerates a null/empty AI object', () => {
    const out = mapAiToForm(null as unknown as ExtractedFields)
    expect(out.requesterName).toBe('')
    expect(out._import.timeFrames).toEqual([])
  })
})

describe('sanitizeInputText / buildExtractFieldsUserPrompt', () => {
  it('scrubs the document envelope markers from input', () => {
    expect(sanitizeInputText('---BEGIN DOCUMENT---\nhi\n---END DOCUMENT---')).not.toContain(
      'BEGIN DOCUMENT',
    )
  })

  it('wraps a document in the BEGIN/END envelope', () => {
    const p = buildExtractFieldsUserPrompt('the request')
    expect(p.startsWith('---BEGIN DOCUMENT---')).toBe(true)
    expect(p).toContain('the request')
    expect(p.trimEnd().endsWith('---END DOCUMENT---')).toBe(true)
  })
})

describe('SAMPLE_EXTRACTION', () => {
  it('reflects the sample request email', () => {
    expect(SAMPLE_EXTRACTION.occurrenceNumber).toBe('PR25-0098213')
    expect(SAMPLE_EXTRACTION.businessName).toBe("Kim's Convenience")
    expect(SAMPLE_EXTRACTION.extractionTimeFrames[0].cameraDetails).toContain('3, 4')
  })
})
