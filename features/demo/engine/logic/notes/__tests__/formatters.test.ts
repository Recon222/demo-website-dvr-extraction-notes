import { describe, it, expect } from 'vitest'
import { formatAddressAndVisits } from '@/features/demo/engine/logic/notes/address-formatter'
import { formatTimeOffset } from '@/features/demo/engine/logic/notes/time-offset-formatter'
import { formatScopes } from '@/features/demo/engine/logic/notes/scopes-formatter'
import { formatRetention } from '@/features/demo/engine/logic/notes/retention-formatter'
import { formatExport } from '@/features/demo/engine/logic/notes/export-formatter'
import { formatTimeOnScene } from '@/features/demo/engine/logic/notes/time-on-scene-formatter'
import { formatCameras } from '@/features/demo/engine/logic/notes/camera-formatter'
import { emptyFormData, mockFormData } from './test-utils'

// Behavior contract ported from the phone: src/features/documentation/notes/formatters/*
// + phone-inventory §12 "THE GENERATION" exact-text templates. Every pinned string below
// is byte-for-byte what the phone's formatter emits for the same input.

describe('formatAddressAndVisits — progressive Tier 0–3', () => {
  it('Tier 0: no location string at all → ""', () => {
    expect(formatAddressAndVisits(emptyFormData())).toBe('')
  })

  it('Tier 1: address known, no renderable scope → attendance bullet ending "."', () => {
    const fd = emptyFormData({ businessName: 'ABC Store', streetAddress: '123 Main Street', city: 'Springfield' })
    expect(formatAddressAndVisits(fd)).toBe(
      '• Attended ABC Store, 123 Main St, Springfield to recover requested video evidence.',
    )
  })

  it('Tier 1 falls back to the legacy flat address when structured fields are absent', () => {
    const fd = emptyFormData({ address: '99 Legacy Rd, Oldtown' })
    expect(formatAddressAndVisits(fd)).toBe(
      '• Attended 99 Legacy Rd, Oldtown to recover requested video evidence.',
    )
  })

  it('Tier 2: header ends "from:" + per-scope requested line (no corrected times)', () => {
    const fd = emptyFormData({
      businessName: 'ABC Store',
      streetAddress: '123 Main St',
      city: 'Springfield',
      scopes: [
        { startDateTime: '2024-06-01 09:00:00', endDateTime: '2024-06-01 12:00:00', isActualTime: true, cameras: 'Cam 1' },
      ],
    })
    expect(formatAddressAndVisits(fd)).toBe(
      '• Attended ABC Store, 123 Main St, Springfield to recover requested video evidence from:\n' +
        'Scope 1:\n' +
        'Real Time: 2024-06-01 09:00:00 to 2024-06-01 12:00:00',
    )
  })

  it('Tier 3: corrected line appends only when BOTH corrected times exist; labels flip with isActualTime', () => {
    const fd = mockFormData() // one scope, isActualTime: true, corrected times present
    expect(formatAddressAndVisits(fd)).toBe(
      '• Attended Test Business, 123 Main St, Springfield to recover requested video evidence from:\n' +
        'Scope 1:\n' +
        'Real Time: 2024-06-01 09:00:00 to 2024-06-01 12:00:00\n' +
        'DVR Time: 2024-06-01 10:00:00 to 2024-06-01 13:00:00',
    )
    // DVR-time request → labels flip
    const dvrScope = emptyFormData({
      streetAddress: '1 A St',
      scopes: [
        {
          startDateTime: '2024-06-01 09:00:00',
          endDateTime: '2024-06-01 12:00:00',
          isActualTime: false,
          cameras: '',
          correctedStartDateTime: '2024-06-01 08:00:00',
          correctedEndDateTime: '2024-06-01 11:00:00',
        },
      ],
    })
    const out = formatAddressAndVisits(dvrScope)
    expect(out).toContain('DVR Time: 2024-06-01 09:00:00 to 2024-06-01 12:00:00')
    expect(out).toContain('Real Time: 2024-06-01 08:00:00 to 2024-06-01 11:00:00')
  })

  it('a scope missing either requested time is not rendered and consumes no number', () => {
    const fd = emptyFormData({
      streetAddress: '1 A St',
      scopes: [
        { startDateTime: '2024-06-01 09:00:00', endDateTime: '', isActualTime: true, cameras: '' }, // filtered
        { startDateTime: '2024-06-02 10:00:00', endDateTime: '2024-06-02 11:00:00', isActualTime: true, cameras: '' },
      ],
    })
    const out = formatAddressAndVisits(fd)
    expect(out).toContain('Scope 1:\nReal Time: 2024-06-02 10:00:00 to 2024-06-02 11:00:00')
    expect(out).not.toContain('Scope 2:')
  })

  it('exactly one newline between scopes, none after the last', () => {
    const fd = emptyFormData({
      streetAddress: '1 A St',
      scopes: [
        { startDateTime: '2024-06-01 09:00:00', endDateTime: '2024-06-01 10:00:00', isActualTime: true, cameras: '' },
        { startDateTime: '2024-06-02 09:00:00', endDateTime: '2024-06-02 10:00:00', isActualTime: true, cameras: '' },
      ],
    })
    const out = formatAddressAndVisits(fd)
    expect(out).toBe(
      '• Attended 1 A St to recover requested video evidence from:\n' +
        'Scope 1:\n' +
        'Real Time: 2024-06-01 09:00:00 to 2024-06-01 10:00:00\n' +
        'Scope 2:\n' +
        'Real Time: 2024-06-02 09:00:00 to 2024-06-02 10:00:00',
    )
    expect(out.endsWith('\n')).toBe(false)
  })
})

describe('formatTimeOffset', () => {
  it('no timeOffsetData → ""', () => {
    expect(formatTimeOffset(emptyFormData())).toBe('')
  })

  it('displayed 00:00:00 → CORRECT (keys off the displayed string, never differenceMs)', () => {
    const fd = emptyFormData({ timeOffsetData: { formattedDifference: '00:00:00', direction: 'AHEAD OF' } })
    expect(formatTimeOffset(fd)).toBe('• Time offset: DVR time is CORRECT.')
  })

  it('non-zero displayed offset → "DVR is {diff} {direction} real time."', () => {
    const behind = emptyFormData({ timeOffsetData: { formattedDifference: '00:04:12', direction: 'BEHIND' } })
    expect(formatTimeOffset(behind)).toBe('• Time offset: DVR is 00:04:12 BEHIND real time.')
    const ahead = emptyFormData({ timeOffsetData: { formattedDifference: '01:00:00', direction: 'AHEAD OF' } })
    expect(formatTimeOffset(ahead)).toBe('• Time offset: DVR is 01:00:00 AHEAD OF real time.')
  })
})

describe('formatScopes — extracted wins, requested fallback', () => {
  it('empty everything → ""', () => {
    expect(formatScopes(emptyFormData())).toBe('')
  })

  it('Path A single extracted scope → simple "(DVR time)" bullet', () => {
    const fd = emptyFormData({
      extractedScopes: [{ startDateTime: '2024-06-01 08:55:00', endDateTime: '2024-06-01 11:05:00', cameras: 'Cam 3, Cam 4' }],
    })
    expect(formatScopes(fd)).toBe(
      '• Recovered Cam 3, Cam 4 from 2024-06-01 08:55:00 to 2024-06-01 11:05:00 (DVR time)',
    )
  })

  it('Path A multiple extracted scopes → numbered lines with three-space indent', () => {
    const fd = emptyFormData({
      extractedScopes: [
        { startDateTime: '2024-06-01 08:00:00', endDateTime: '2024-06-01 09:00:00', cameras: 'A' },
        { startDateTime: '2024-06-02 08:00:00', endDateTime: '2024-06-02 09:00:00', cameras: '' },
      ],
    })
    expect(formatScopes(fd)).toBe(
      '• Recovered the following footage:\n' +
        '   1. A from 2024-06-01 08:00:00 to 2024-06-01 09:00:00 (DVR time)\n' +
        '   2. requested cameras from 2024-06-02 08:00:00 to 2024-06-02 09:00:00 (DVR time)',
    )
  })

  it('Path A with no VALID extracted scope falls through to requested scopes', () => {
    const fd = emptyFormData({
      extractedScopes: [{ startDateTime: '', endDateTime: '2024-06-01 09:00:00', cameras: 'A' }],
      scopes: [{ startDateTime: '2024-06-01 09:00:00', endDateTime: '2024-06-01 12:00:00', isActualTime: true, cameras: 'B' }],
    })
    expect(formatScopes(fd)).toBe(
      '• Recovered B from 2024-06-01 09:00:00 to 2024-06-01 12:00:00 (actual time)',
    )
  })

  it('Path B dual form: requested + corrected with flipped time-type labels', () => {
    const fd = mockFormData({ extractedScopes: [] })
    expect(formatScopes(fd)).toBe(
      '• Recovered Camera 1 from 2024-06-01 09:00:00 to 2024-06-01 12:00:00 (actual time, requested) / ' +
        '2024-06-01 10:00:00 to 2024-06-01 13:00:00 (DVR time, corrected)',
    )
  })

  it('Path B multiple requested scopes → numbered, three-space indent', () => {
    const fd = emptyFormData({
      scopes: [
        { startDateTime: '2024-06-01 09:00:00', endDateTime: '2024-06-01 10:00:00', isActualTime: false, cameras: 'A' },
        { startDateTime: '2024-06-02 09:00:00', endDateTime: '2024-06-02 10:00:00', isActualTime: true, cameras: 'B' },
      ],
    })
    expect(formatScopes(fd)).toBe(
      '• Recovered the following footage:\n' +
        '   1. A from 2024-06-01 09:00:00 to 2024-06-01 10:00:00 (DVR time)\n' +
        '   2. B from 2024-06-02 09:00:00 to 2024-06-02 10:00:00 (actual time)',
    )
  })

  it('camera-name normalization: blank → "requested cameras"; comma/newline split, trimmed, re-joined', () => {
    const fd = emptyFormData({
      scopes: [{ startDateTime: '2024-06-01 09:00:00', endDateTime: '2024-06-01 10:00:00', isActualTime: true, cameras: ' 3 ,\n 4 ,, 7 ' }],
    })
    expect(formatScopes(fd)).toBe(
      '• Recovered 3, 4, 7 from 2024-06-01 09:00:00 to 2024-06-01 10:00:00 (actual time)',
    )
  })
})

describe('formatRetention', () => {
  it('blank → ""', () => {
    expect(formatRetention(emptyFormData())).toBe('')
  })
  it('bare day count → "• DVR retention period: {n} days"', () => {
    expect(formatRetention(emptyFormData({ totalDvrRetention: '30' }))).toBe('• DVR retention period: 30 days')
  })
})

describe('formatExport', () => {
  it('needs BOTH sizeGb and exportMedia', () => {
    expect(formatExport(emptyFormData({ sizeGb: '2.5' }))).toBe('')
    expect(formatExport(emptyFormData({ exportMedia: 'USB Drive' }))).toBe('')
  })
  it('base form ends with a full stop', () => {
    expect(formatExport(emptyFormData({ sizeGb: '2.5', exportMedia: 'USB Drive' }))).toBe(
      '• 2.5GB of video was exported to USB Drive.',
    )
  })
  it('appends ", and provided via {via}" when present', () => {
    expect(
      formatExport(emptyFormData({ sizeGb: '2.5', exportMedia: 'USB Drive', mediaProvidedVia: 'Hand Delivered' })),
    ).toBe('• 2.5GB of video was exported to USB Drive, and provided via Hand Delivered.')
  })
})

describe('formatTimeOnScene', () => {
  it('empty / no complete visit → ""', () => {
    expect(formatTimeOnScene(emptyFormData())).toBe('')
    expect(
      formatTimeOnScene(emptyFormData({ arrivalDepartures: [{ arrivalDateTime: '2024-06-01 09:00:00', departureDateTime: '' }] })),
    ).toBe('')
  })

  it('single visit → on-scene line + total', () => {
    expect(formatTimeOnScene(mockFormData())).toBe(
      '• On scene from 2024-06-01 09:00:00 to 2024-06-01 12:00:00\n• Total time: 3 hours',
    )
  })

  it('multiple visits → visit list (three-space indent, trailing newline before total)', () => {
    const fd = emptyFormData({
      arrivalDepartures: [
        { arrivalDateTime: '2024-06-01 09:00:00', departureDateTime: '2024-06-01 10:30:00' },
        { arrivalDateTime: '2024-06-02 14:00:00', departureDateTime: '2024-06-02 14:45:00' },
      ],
    })
    expect(formatTimeOnScene(fd)).toBe(
      '• On scene for multiple visits:\n' +
        '   Visit 1: 2024-06-01 09:00:00 to 2024-06-01 10:30:00\n' +
        '   Visit 2: 2024-06-02 14:00:00 to 2024-06-02 14:45:00\n' +
        '• Total time: 2 hours 15 minutes',
    )
  })

  it('pluralization: 1 hour / 1 minute singular; "0 minutes" when zero', () => {
    const oneHourOneMin = emptyFormData({
      arrivalDepartures: [{ arrivalDateTime: '2024-06-01 09:00:00', departureDateTime: '2024-06-01 10:01:00' }],
    })
    expect(formatTimeOnScene(oneHourOneMin)).toContain('• Total time: 1 hour 1 minute')
    const zero = emptyFormData({
      arrivalDepartures: [{ arrivalDateTime: '2024-06-01 09:00:00', departureDateTime: '2024-06-01 09:00:00' }],
    })
    expect(formatTimeOnScene(zero)).toContain('• Total time: 0 minutes')
  })

  it('an unparseable timestamp poisons the total → honest "unable to calculate" (never 0 minutes)', () => {
    const fd = emptyFormData({
      arrivalDepartures: [
        { arrivalDateTime: '2024-06-01 09:00:00', departureDateTime: '2024-06-01 10:00:00' },
        { arrivalDateTime: 'not a timestamp', departureDateTime: '2024-06-02 10:00:00' },
      ],
    })
    const out = formatTimeOnScene(fd)
    expect(out).toContain('• Total time: unable to calculate (invalid timestamp)')
    expect(out).not.toContain('0 minutes')
  })
})

describe('formatCameras (built + tested, deliberately NOT registry-wired — PR-86)', () => {
  it('empty → ""', () => {
    expect(formatCameras([])).toBe('')
  })

  it('skips cameras without a name entirely (the index still advances — phone parity)', () => {
    const out = formatCameras([
      { cameraName: '', resolution: '1080p', recordingFps: '30' },
      { cameraName: 'Till', resolution: '1080p', recordingFps: '15' },
    ])
    expect(out).toBe('• Camera 2: Till\n  Resolution: 1080p | FPS: 15')
  })

  it('N/A fallbacks for blank resolution/FPS', () => {
    expect(formatCameras([{ cameraName: 'Rear', resolution: '', recordingFps: '' }])).toBe(
      '• Camera 1: Rear\n  Resolution: N/A | FPS: N/A',
    )
  })

  it('GPS line only for captured fixes; the exact (0,0) pair is rejected (BUG-008/BUG-024 policy)', () => {
    const withFix = formatCameras([
      { cameraName: 'Door', resolution: '1080p', recordingFps: '15', gps: { lat: 43.60871, lng: -79.650501, accuracyM: 4.4 } },
    ])
    expect(withFix).toContain('  GPS Location: 43.608710, -79.650501 (±4m)')
    const nullIsland = formatCameras([
      { cameraName: 'Door', resolution: '1080p', recordingFps: '15', gps: { lat: 0, lng: 0, accuracyM: 4 } },
    ])
    expect(nullIsland).not.toContain('GPS Location')
    const outOfRange = formatCameras([
      { cameraName: 'Door', resolution: '1080p', recordingFps: '15', gps: { lat: 99, lng: 0, accuracyM: 4 } },
    ])
    expect(outOfRange).not.toContain('GPS Location')
  })

  it('accuracyM 0 (demo "not measured" marker, e.g. geocoded fill) omits the ± suffix', () => {
    const out = formatCameras([
      { cameraName: 'Door', resolution: '1080p', recordingFps: '15', gps: { lat: 43.6, lng: -79.6, accuracyM: 0 } },
    ])
    expect(out).toContain('  GPS Location: 43.600000, -79.600000')
    expect(out).not.toContain('±')
  })
})
