import { describe, it, expect } from 'vitest'
import { generateCaseNotesDoc, type CaseNotesData } from '@/features/demo/engine/logic/pdf/case-notes'

const full: CaseNotesData = {
  occNumber: 'PR25-0098213',
  address: '1450 Eglinton Ave W, Mississauga',
  requesterName: 'Liam McHugh',
  requesterBadgeNumber: '4471',
  requesterUnit: 'Central Robbery',
  requesterPhone: '905-555-0001',
  requesterEmail: 'det.mchugh.4471@peelpolice.ca',
  locationContact: 'Sandeep Gill',
  locationPhone: '905-555-0142',
  scopes: [{ start: '2025-03-08 23:45:00', end: '2025-03-09 01:30:00', isActualTime: true, cameras: '3, 4, 7' }],
  adjustedScopes: [{ start: '2025-03-08 23:50:30', end: '2025-03-09 01:35:30' }],
  timeOffset: { isCorrect: false, formattedDifference: '00:05:30', direction: 'AHEAD OF' },
  dvrDateTime: '2025-03-08 12:05:30',
  actualDateTime: '2025-03-08 12:00:00',
  dvr: {
    dvrLocation: 'Back office',
    dvrTypeBrand: 'Hikvision DS-7608',
    serialModelNumber: 'SN123',
    dvrUsername: 'admin',
    dvrPassword: 'Sp1ce2024',
    numberOfChannels: '8',
    activeCameras: '3,4,7',
    recordingSchedule: 'continuous',
    resolution: '1920x1080',
    recordingFps: '15',
    totalDvrRetention: '35 days',
  },
  cameras: [{ name: 'Till', resolution: '1920x1080', fps: '15' }],
  export: { exportMedia: 'USB Drive', fileType: 'MP4', sizeGb: '12', mediaPlayerIncluded: true, mediaProvidedVia: 'Hand Delivered' },
  // SECTIONED notes input (P2.1): the generator assembles the flat body itself.
  notesSections: [
    { id: 'scopes', content: '• Recovered 3, 4, 7 from 2025-03-08 23:50:00 to 2025-03-09 01:40:00 (DVR time)', generatedContent: '• Recovered 3, 4, 7 from 2025-03-08 23:50:00 to 2025-03-09 01:40:00 (DVR time)', manuallyEdited: false },
    { id: 'address', content: '• Attended to recover requested video evidence.', generatedContent: '• Attended to recover requested video evidence.', manuallyEdited: false, userAddendum: 'manager present' },
  ],
  notesFreeText: 'All footage recovered.',
  arrivalDepartures: [{ arrival: '2025-03-09 09:00:00', departure: '2025-03-09 10:00:00' }],
  dateTimeCompleted: '2025-03-09 10:15:00',
  completedBy: 'K. Vasilyev',
  generatedAt: '2025-03-09 10:00:00',
}

describe('generateCaseNotesDoc', () => {
  it('returns standalone HTML with the case number in the header', () => {
    const html = generateCaseNotesDoc(full)
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('PR25-0098213')
    expect(html).toContain('Forensic Video Unit')
  })

  it('renders the populated sections', () => {
    const html = generateCaseNotesDoc(full)
    expect(html).toContain('Extraction Scope')
    expect(html).toContain('Hikvision DS-7608')
    expect(html).toContain('Individual Camera Details')
    expect(html).toContain('Export Information')
    expect(html).toContain('All footage recovered.')
  })

  describe('Completion Information (P7.2 — where the analyst profile lands)', () => {
    it('prints both completion fields, in the phone’s section and position', () => {
      const html = generateCaseNotesDoc(full)
      expect(html).toContain('Completion Information')
      expect(html).toContain('Completed By:')
      expect(html).toContain('K. Vasilyev')
      expect(html).toContain('Date &amp; Time Completed:')
      expect(html).toContain('03/09/2025 10:15:00')
      // Phone order: arrival/departure → completion → footer (case-notes-template.ts:323-350).
      expect(html.indexOf('Completion Information')).toBeGreaterThan(html.indexOf('Arrival &amp; Departure'))
      expect(html.indexOf('Completion Information')).toBeLessThan(html.indexOf('Report generated on'))
    })

    it('drops the empty row but keeps the section when only one field is set', () => {
      const html = generateCaseNotesDoc({ occNumber: 'X', completedBy: 'K. Vasilyev' })
      expect(html).toContain('Completion Information')
      expect(html).toContain('Completed By:')
      expect(html).not.toContain('Date &amp; Time Completed:')
    })

    it('omits the whole section when neither is set (phone hasCompletionInfo)', () => {
      const html = generateCaseNotesDoc({ occNumber: 'X' })
      expect(html).not.toContain('Completion Information')
      // …and never prints `formatDocDate`'s N/A placeholder in its place.
      expect(html).not.toContain('Completed By:')
    })
  })

  it('assembles the notes body from the SECTIONED input in registry order (address before scopes, addendum inline, free text last)', () => {
    const html = generateCaseNotesDoc(full)
    // canonical assembly: address block (content + addendum) → scopes block → free text
    expect(html).toContain(
      '• Attended to recover requested video evidence.\nmanager present' +
        '\n\n• Recovered 3, 4, 7 from 2025-03-08 23:50:00 to 2025-03-09 01:40:00 (DVR time)' +
        '\n\nAll footage recovered.',
    )
  })

  it('omits the Case Notes section when sections and free text are empty', () => {
    const html = generateCaseNotesDoc({ ...full, notesSections: [], notesFreeText: '' })
    expect(html).not.toContain('Case Notes</div>')
  })

  it('R-3: a flagged-partial extracted list annotates the Case Notes block; unflagged renders no warning', () => {
    const flagged = generateCaseNotesDoc({ ...full, extractedScopesPartial: true })
    expect(flagged).toContain('recovered footage reported in these notes may be incomplete')
    expect(generateCaseNotesDoc(full)).not.toContain('may be incomplete')
  })

  it('R-3: the warning renders even when the notes body itself is empty (the flag describes the record, not the prose)', () => {
    const html = generateCaseNotesDoc({ ...full, notesSections: [], notesFreeText: '', extractedScopesPartial: true })
    expect(html).toContain('Case Notes</div>')
    expect(html).toContain('recovered footage reported in these notes may be incomplete')
  })

  it('shows the offset section when timeOffset is present and omits it otherwise', () => {
    expect(generateCaseNotesDoc(full)).toContain('DVR Time Offset')
    expect(generateCaseNotesDoc({ ...full, timeOffset: null })).not.toContain('DVR Time Offset')
  })

  it('falls back to an empty-scopes message when there are no scopes', () => {
    expect(generateCaseNotesDoc({ ...full, scopes: [] })).toContain('No extraction scopes entered.')
  })

  it('escapes HTML in user-supplied fields (section content and free text alike)', () => {
    const html = generateCaseNotesDoc({
      ...full,
      notesSections: [{ id: 'address', content: '<script>alert(1)</script>', generatedContent: '', manuallyEdited: true }],
      notesFreeText: '<img onerror=x>',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<img onerror=x>')
  })

  it('omits every optional section when given only a case number', () => {
    const html = generateCaseNotesDoc({ occNumber: 'PR25-X' })
    expect(html).toContain('Case #PR25-X')
    expect(html).toContain('No extraction scopes entered.')
    expect(html).not.toContain('Adjusted Scope')
    expect(html).not.toContain('DVR Time Offset')
    expect(html).not.toContain('DVR Information')
    expect(html).not.toContain('Individual Camera Details')
    expect(html).not.toContain('Export Information')
    expect(html).not.toContain('Arrival &amp; Departure')
  })

  it('renders dashes and DVR Time for partial scope/camera/export fields', () => {
    const html = generateCaseNotesDoc({
      occNumber: 'X',
      scopes: [{ start: '2025-03-08 23:45:00', end: '', isActualTime: false, cameras: '' }],
      cameras: [{ name: 'CamA', resolution: '', fps: '' }],
      export: { exportMedia: 'USB Drive', sizeGb: '0', mediaPlayerIncluded: false },
    })
    expect(html).toContain('DVR Time')
    expect(html).toContain('CamA')
    expect(html).toContain('—')
    expect(html).toContain('Export Information')
  })

  it('annotates the Adjusted Scope section when conversion was partial (not silently omitted)', () => {
    const html = generateCaseNotesDoc({ occNumber: 'X', adjustedScopesPartial: true })
    expect(html).toContain('Adjusted Scope')
    expect(html).toContain('could not be converted')
  })

  it('shows no partial warning on a clean conversion', () => {
    const html = generateCaseNotesDoc(full)
    expect(html).toContain('Adjusted Scope')
    expect(html).not.toContain('could not be converted')
  })
})

// P3.7 — the per-camera fix reaches the court document. The `cameras` NOTES section is
// deliberately '' (PR-86: this table is the canonical camera surface), so this table is the
// ONLY output that surfaces a camera's coordinates. Phone parity: `cameras-table.ts:44-70`.
describe('generateCaseNotesDoc — per-camera GPS row', () => {
  const withGps = (gps: { lat: number; lng: number; accuracyM?: number }) =>
    generateCaseNotesDoc({ occNumber: 'X', cameras: [{ name: 'Till', resolution: '1080p', fps: '15', gps }] })

  it('prints the captured fix at 6 decimals with its accuracy', () => {
    const html = withGps({ lat: 43.608701, lng: -79.650502, accuracyM: 6.4 })
    expect(html).toContain('GPS Location')
    expect(html).toContain('43.608701, -79.650502')
    expect(html).toContain('(±6m)')
  })

  it('omits the accuracy clause when nothing measured one (R-18)', () => {
    const html = withGps({ lat: 43.608701, lng: -79.650502 })
    expect(html).toContain('43.608701, -79.650502')
    // Scoped to the coordinate's own cell, not the whole document (review R-17): a
    // document-wide `not.toContain('±')` false-fails the moment ANY other section legitimately
    // prints one — the offset advisories and the GPS accuracy chips both can.
    const gpsCell = html.slice(html.indexOf('GPS Location'), html.indexOf('GPS Location') + 200)
    expect(gpsCell).toContain('43.608701, -79.650502')
    expect(gpsCell).not.toContain('±')
  })

  it('prints NO GPS row for a camera that was never captured', () => {
    const html = generateCaseNotesDoc({ occNumber: 'X', cameras: [{ name: 'Till', resolution: '', fps: '' }] })
    expect(html).toContain('Till')
    expect(html).not.toContain('GPS Location')
  })

  it('refuses the null-island (0,0) pair — a failed fix must never print as a location', () => {
    // The BUG-008/BUG-024 policy, shared with the notes camera formatter: zeros are what a
    // failed capture reports, not a place on the Gulf of Guinea seabed.
    expect(withGps({ lat: 0, lng: 0, accuracyM: 5 })).not.toContain('GPS Location')
  })

  it('refuses out-of-range and non-finite coordinates', () => {
    expect(withGps({ lat: 91, lng: -79.65 })).not.toContain('GPS Location')
    expect(withGps({ lat: 43.6, lng: 181 })).not.toContain('GPS Location')
    expect(withGps({ lat: Number.NaN, lng: -79.65 })).not.toContain('GPS Location')
  })

  it('keeps the GPS row attached to its own camera', () => {
    const html = generateCaseNotesDoc({
      occNumber: 'X',
      cameras: [
        { name: 'Till', resolution: '', fps: '' },
        { name: 'Rear', resolution: '', fps: '', gps: { lat: 43.608701, lng: -79.650502, accuracyM: 4 } },
      ],
    })
    const rear = html.indexOf('Rear')
    const gpsRow = html.indexOf('GPS Location')
    expect(gpsRow).toBeGreaterThan(rear)
    expect(html.indexOf('Till')).toBeLessThan(rear)
  })
})
