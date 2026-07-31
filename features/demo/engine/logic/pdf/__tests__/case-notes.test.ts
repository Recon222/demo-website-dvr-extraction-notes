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
