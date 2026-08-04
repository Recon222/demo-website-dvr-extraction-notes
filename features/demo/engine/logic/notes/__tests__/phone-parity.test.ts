import { describe, it, expect } from 'vitest'
import { reconcileSections } from '@/features/demo/engine/logic/notes/section-reconciler'
import { sectionLabel } from '@/features/demo/engine/logic/notes/section-registry'
import { extractNotesRelevantData } from '@/features/demo/engine/logic/notes/notes-relevant-data'
import { assembleNotesString } from '@/features/demo/engine/logic/notes/notes-assembler'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { DemoLocation } from '@/features/demo/engine/types'

/**
 * STRUCTURAL PARITY vs the phone generator (P2.1 acceptance test).
 *
 * The fixture mirrors the phone's canonical notes test fixture — `createMockFormData`
 * in `src/features/documentation/notes/services/__tests__/test-utils.ts` (phone repo):
 * Test Business / 123 Main St / Springfield, one 09:00→12:00 visit, one real-time
 * scope with corrected times, retention 30, USB Drive 15.5GB via Hand delivery,
 * offset 01:00:00 AHEAD OF. The expected section sequence + labels are pinned from
 * `services/section-registry.ts:28-78` (phone repo), and every content line follows
 * the exact templates in `formatters/*.ts` / phone-inventory §12.
 *
 * One deliberate divergence in VALUES, none in SHAPE: the phone stores corrected
 * scope times (its mock hand-writes 08:00→11:00); the demo DERIVES them from the
 * offset (1h AHEAD → +1h = 10:00→13:00, calculateCorrectedTimeRange). The template
 * form — `{label}: {start} to {end}` under `Scope N:` — is identical.
 */
function phoneMockLocation(): DemoLocation {
  return {
    id: 'l1',
    caseId: 'c1',
    locationName: 'Test Business',
    businessName: 'Test Business',
    streetAddress: '123 Main St',
    city: 'Springfield',
    requesterName: '',
    requesterBadge: '',
    requesterUnit: '',
    requesterPhone: '',
    requesterEmail: '',
    locationContact: '',
    locationPhone: '',
    form: {
      ...blankLocationForm(),
      scopes: [
        {
          id: 's1',
          startDateTime: '2024-06-01 09:00:00',
          endDateTime: '2024-06-01 12:00:00',
          isActualTime: true,
          cameras: 'Camera 1',
        },
      ],
      arrivalDepartures: [{ id: 'v1', arrival: '2024-06-01 09:00:00', departure: '2024-06-01 12:00:00' }],
      timeOffset: {
        dvrDateTime: '2024-06-01 10:00:00',
        actualDateTime: '2024-06-01 09:00:00',
        differenceMs: 3600000,
        formattedDifference: '01:00:00',
        direction: 'AHEAD OF',
        isDvrAhead: true,
        isCorrect: false,
        dvrAppliesDST: false,
        sync: null,
        captureMethod: 'manual',
      },
      dvr: { ...blankLocationForm().dvr, totalDvrRetention: '30 days' }, // demo stores the unit; the coercion site strips it
      cameras: [{ id: 'cam1', cameraName: 'Camera 1', resolution: '1080p', recordingFps: '15' }],
      export: { exportMedia: 'USB Drive', fileType: 'MP4', sizeGb: '15.5', mediaPlayerIncluded: false, mediaProvidedVia: 'Hand delivery' },
    },
  }
}

describe('structural parity with the phone notes generator', () => {
  const { sections } = reconcileSections(extractNotesRelevantData(phoneMockLocation()), [])

  it('produces the phone section SEQUENCE exactly (section-registry.ts:28-78)', () => {
    expect(sections.map((s) => s.id)).toEqual([
      'address',
      'timeOffset',
      'scopes',
      'retention',
      'cameras',
      'export',
      'timeOnScene',
    ])
  })

  it('carries the phone section HEADINGS (labels) in the same order', () => {
    expect(sections.map((s) => sectionLabel(s.id))).toEqual([
      'address & visits',
      'time offset',
      'recovered footage',
      'dvr retention',
      'cameras',
      'export',
      'time on scene',
    ])
  })

  it('address & visits: attendance header + Scope block with Real Time / DVR Time lines (Tier 3)', () => {
    expect(sections.find((s) => s.id === 'address')?.content).toBe(
      '• Attended Test Business, 123 Main St, Springfield to recover requested video evidence from:\n' +
        'Scope 1:\n' +
        'Real Time: 2024-06-01 09:00:00 to 2024-06-01 12:00:00\n' +
        'DVR Time: 2024-06-01 10:00:00 to 2024-06-01 13:00:00', // derived +1h (see header note)
    )
  })

  it('time offset: byte-identical to the phone fixture output (MOCK_FORMATTER_OUTPUTS.timeOffset)', () => {
    expect(sections.find((s) => s.id === 'timeOffset')?.content).toBe(
      '• Time offset: DVR is 01:00:00 AHEAD OF real time.',
    )
  })

  it('recovered footage: requested-scope dual form (no extracted scopes in the fixture)', () => {
    expect(sections.find((s) => s.id === 'scopes')?.content).toBe(
      '• Recovered Camera 1 from 2024-06-01 09:00:00 to 2024-06-01 12:00:00 (actual time, requested) / ' +
        '2024-06-01 10:00:00 to 2024-06-01 13:00:00 (DVR time, corrected)',
    )
  })

  it('dvr retention: byte-identical (MOCK_FORMATTER_OUTPUTS.retention)', () => {
    expect(sections.find((s) => s.id === 'retention')?.content).toBe('• DVR retention period: 30 days')
  })

  it('cameras: "" even with populated camera data — the phone deliberately disconnected it (PR-86)', () => {
    expect(sections.find((s) => s.id === 'cameras')?.content).toBe('')
  })

  it('export: byte-identical (MOCK_FORMATTER_OUTPUTS.export)', () => {
    expect(sections.find((s) => s.id === 'export')?.content).toBe(
      '• 15.5GB of video was exported to USB Drive, and provided via Hand delivery.',
    )
  })

  it('time on scene: byte-identical (MOCK_FORMATTER_OUTPUTS.timeOnScene)', () => {
    expect(sections.find((s) => s.id === 'timeOnScene')?.content).toBe(
      '• On scene from 2024-06-01 09:00:00 to 2024-06-01 12:00:00\n• Total time: 3 hours',
    )
  })

  it('assembles the flat document body with the phone rhythm: blank-line separated blocks, cameras dropped, free text last', () => {
    const flat = assembleNotesString(sections, 'Additional free-text observations.')
    const blocks = flat.split('\n\n')
    // 6 content blocks (cameras is empty → dropped) + the free-text tail — except the
    // address block itself contains no blank lines, so blocks split cleanly:
    expect(blocks[0]).toContain('• Attended Test Business')
    expect(blocks[1]).toBe('• Time offset: DVR is 01:00:00 AHEAD OF real time.')
    expect(blocks[2]).toContain('• Recovered Camera 1')
    expect(blocks[3]).toBe('• DVR retention period: 30 days')
    expect(blocks[4]).toBe('• 15.5GB of video was exported to USB Drive, and provided via Hand delivery.')
    expect(blocks[5]).toBe('• On scene from 2024-06-01 09:00:00 to 2024-06-01 12:00:00\n• Total time: 3 hours')
    expect(blocks[6]).toBe('Additional free-text observations.')
    expect(blocks).toHaveLength(7)
  })
})
