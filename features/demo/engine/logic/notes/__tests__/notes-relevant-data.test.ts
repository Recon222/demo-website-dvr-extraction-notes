import { describe, it, expect } from 'vitest'
import { extractNotesRelevantData } from '@/features/demo/engine/logic/notes/notes-relevant-data'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { DemoLocation, TimeOffsetData } from '@/features/demo/engine/types'

function demoLocation(
  over: Partial<DemoLocation> = {},
  formOver: Partial<DemoLocation['form']> = {},
): DemoLocation {
  return {
    id: 'l1',
    caseId: 'c1',
    locationName: "Kim's Convenience",
    businessName: "Kim's Convenience",
    streetAddress: '1450 Eglinton Ave W',
    city: 'Mississauga',
    requesterName: '',
    requesterBadge: '',
    requesterUnit: '',
    requesterPhone: '',
    requesterEmail: '',
    locationContact: '',
    locationPhone: '',
    form: { ...blankLocationForm(), ...formOver },
    ...over,
  }
}

/** A DVR-5m30s-ahead offset, as calculateOffset would commit it. */
function offset(over: Partial<TimeOffsetData> = {}): TimeOffsetData {
  return {
    dvrDateTime: '2025-03-08 12:05:30',
    actualDateTime: '2025-03-08 12:00:00',
    differenceMs: 330000,
    formattedDifference: '00:05:30',
    direction: 'AHEAD OF',
    isDvrAhead: true,
    isCorrect: false,
    dvrAppliesDST: false,
    sync: null,
    captureMethod: 'manual',
    ...over,
  }
}

// The demo's ONE coercion site (architecture rule F5): these tests pin every
// demo-shape → phone-shape adaptation so a second drifting call site can't appear.
describe('extractNotesRelevantData', () => {
  it('maps structured address fields; legacy flat address is always ""', () => {
    const fd = extractNotesRelevantData(demoLocation())
    expect(fd.address).toBe('')
    expect(fd.businessName).toBe("Kim's Convenience")
    expect(fd.streetAddress).toBe('1450 Eglinton Ave W')
    expect(fd.city).toBe('Mississauga')
    // blank structured fields coerce to undefined, like the phone's `|| undefined`
    const blank = extractNotesRelevantData(demoLocation({ businessName: '', streetAddress: '', city: '' }))
    expect(blank.businessName).toBeUndefined()
    expect(blank.streetAddress).toBeUndefined()
    expect(blank.city).toBeUndefined()
  })

  it('renames arrival/departure keys to the phone shape', () => {
    const fd = extractNotesRelevantData(
      demoLocation({}, {
        arrivalDepartures: [{ id: 'v1', arrival: '2025-03-09 10:00:00', departure: '2025-03-09 11:00:00' }],
      }),
    )
    expect(fd.arrivalDepartures).toEqual([
      { arrivalDateTime: '2025-03-09 10:00:00', departureDateTime: '2025-03-09 11:00:00' },
    ])
  })

  it('derives corrected scope times from the offset (real-time request + DVR ahead → +offset)', () => {
    const fd = extractNotesRelevantData(
      demoLocation({}, {
        timeOffset: offset(),
        scopes: [
          { id: 's1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '3, 4, 7' },
        ],
      }),
    )
    expect(fd.scopes[0].correctedStartDateTime).toBe('2025-03-08 23:50:30')
    expect(fd.scopes[0].correctedEndDateTime).toBe('2025-03-09 01:35:30')
  })

  it('no offset → corrected fields absent (Tier-2 rendering)', () => {
    const fd = extractNotesRelevantData(
      demoLocation({}, {
        scopes: [{ id: 's1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '' }],
      }),
    )
    expect(fd.scopes[0].correctedStartDateTime).toBeUndefined()
    expect(fd.scopes[0].correctedEndDateTime).toBeUndefined()
  })

  it('non-canonical requested times → corrected fields absent, no throw (per-scope isolation)', () => {
    const fd = extractNotesRelevantData(
      demoLocation({}, {
        timeOffset: offset(),
        scopes: [
          { id: 'bad', startDateTime: '11:45 PM on March 8 2025', endDateTime: 'whenever', isActualTime: true, cameras: '' },
          { id: 'good', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '' },
        ],
      }),
    )
    expect(fd.scopes[0].correctedStartDateTime).toBeUndefined()
    expect(fd.scopes[1].correctedStartDateTime).toBe('2025-03-08 23:50:30')
  })

  it('strips the stored " days" unit from totalDvrRetention (the formatter re-appends it once)', () => {
    expect(
      extractNotesRelevantData(
        demoLocation({}, { dvr: { ...blankLocationForm().dvr, totalDvrRetention: '17 days' } }),
      ).totalDvrRetention,
    ).toBe('17')
    // import-provided bare values pass through
    expect(
      extractNotesRelevantData(
        demoLocation({}, { dvr: { ...blankLocationForm().dvr, totalDvrRetention: '35' } }),
      ).totalDvrRetention,
    ).toBe('35')
  })

  it('narrows timeOffsetData to the display pair; absent offset → undefined', () => {
    const fd = extractNotesRelevantData(demoLocation({}, { timeOffset: offset() }))
    expect(fd.timeOffsetData).toEqual({ formattedDifference: '00:05:30', direction: 'AHEAD OF' })
    expect(extractNotesRelevantData(demoLocation()).timeOffsetData).toBeUndefined()
  })

  it('passes export fields and extracted scopes through', () => {
    const fd = extractNotesRelevantData(
      demoLocation({}, {
        extractedScopes: [{ id: 'es1', startDateTime: '2025-03-08 23:50:00', endDateTime: '2025-03-09 01:40:00', isActualTime: false, cameras: '3, 4, 7' }],
        export: { exportMedia: 'USB Drive', fileType: '.mp4', sizeGb: '2.5', mediaPlayerIncluded: false, mediaProvidedVia: 'Hand Delivered' },
      }),
    )
    expect(fd.extractedScopes).toEqual([
      { startDateTime: '2025-03-08 23:50:00', endDateTime: '2025-03-09 01:40:00', cameras: '3, 4, 7' },
    ])
    expect(fd.exportMedia).toBe('USB Drive')
    expect(fd.sizeGb).toBe('2.5')
    expect(fd.mediaProvidedVia).toBe('Hand Delivered')
  })

  it('is deterministic — two extractions of the same location produce equal output (output-comparison stability)', () => {
    const loc = demoLocation({}, {
      timeOffset: offset(),
      scopes: [{ id: 's1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '3' }],
      arrivalDepartures: [{ id: 'v1', arrival: '2025-03-09 10:00:00', departure: '2025-03-09 11:00:00' }],
    })
    expect(extractNotesRelevantData(loc)).toEqual(extractNotesRelevantData(loc))
  })
})
