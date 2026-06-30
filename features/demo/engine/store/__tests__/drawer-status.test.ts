import { describe, it, expect } from 'vitest'
import { selectDrawerStatus } from '@/features/demo/engine/store/selectors'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { DemoLocation, LocationForm } from '@/features/demo/engine/types'

function loc(over: Partial<DemoLocation> = {}, formOver: Partial<LocationForm> = {}): DemoLocation {
  return {
    id: 'L',
    caseId: 'C',
    locationName: '',
    businessName: '',
    streetAddress: '',
    city: '',
    requesterName: '',
    requesterBadge: '',
    requesterUnit: '',
    requesterPhone: '',
    requesterEmail: '',
    locationContact: '',
    locationPhone: '',
    isSeed: false,
    form: { ...blankLocationForm(), ...formOver },
    ...over,
  }
}

describe('selectDrawerStatus', () => {
  it('null location → every screen empty', () => {
    expect(Object.values(selectDrawerStatus(null)).every((v) => v === 'empty')).toBe(true)
  })

  it('blank location → every screen empty', () => {
    expect(Object.values(selectDrawerStatus(loc())).every((v) => v === 'empty')).toBe(true)
  })

  it('submission: all counted fields filled → complete; some → partial', () => {
    const full = loc({ requesterName: 'A', requesterBadge: 'B', requesterPhone: 'C', requesterEmail: 'D', businessName: 'E', streetAddress: 'F', city: 'G', locationContact: 'H', locationPhone: 'I' })
    expect(selectDrawerStatus(full).submission).toBe('complete')
    expect(selectDrawerStatus(loc({ requesterName: 'A' })).submission).toBe('partial')
  })

  it('dvrInfo: serialModelNumber is excluded; counted fields drive the status', () => {
    const blank = blankLocationForm().dvr
    // only the excluded field → still empty
    expect(selectDrawerStatus(loc({}, { dvr: { ...blank, serialModelNumber: 'SN-123' } })).dvrInfo).toBe('empty')
    // one COUNTED field → partial (fails if dvrLocation weren't counted)
    expect(selectDrawerStatus(loc({}, { dvr: { ...blank, dvrLocation: 'Office' } })).dvrInfo).toBe('partial')
    // all counted filled, serial still blank → complete (serial doesn't gate green)
    const allCounted = { ...blank, dvrLocation: 'a', dvrTypeBrand: 'b', dvrUsername: 'c', dvrPassword: 'd', numberOfChannels: '8', activeCameras: '4', resolution: '1920x1080', recordingFps: '30fps', firstRecordedDate: '2025-01-01' }
    expect(selectDrawerStatus(loc({}, { dvr: allCounted })).dvrInfo).toBe('complete')
  })

  it('exportInfo: mediaPlayerIncluded is excluded; counted fields drive the status', () => {
    const blank = blankLocationForm().export
    expect(selectDrawerStatus(loc({}, { export: { ...blank, mediaPlayerIncluded: true } })).exportInfo).toBe('empty')
    expect(selectDrawerStatus(loc({}, { export: { ...blank, exportMedia: 'USB Drive' } })).exportInfo).toBe('partial')
    const allCounted = { ...blank, exportMedia: 'USB Drive', fileType: 'MP4', sizeGb: '12', mediaProvidedVia: 'Hand Delivered' }
    expect(selectDrawerStatus(loc({}, { export: allCounted })).exportInfo).toBe('complete')
  })

  it('arrivalDeparture array: full item → complete; mixed → partial; [] → empty', () => {
    const full = [{ id: '1', arrival: '2025-03-08 10:00', departure: '2025-03-08 11:00' }]
    const mixed = [...full, { id: '2', arrival: '', departure: '' }]
    expect(selectDrawerStatus(loc({}, { arrivalDepartures: full })).arrivalDeparture).toBe('complete')
    expect(selectDrawerStatus(loc({}, { arrivalDepartures: mixed })).arrivalDeparture).toBe('partial')
    expect(selectDrawerStatus(loc()).arrivalDeparture).toBe('empty')
  })

  it('cameras array: full item → complete; mixed → partial; [] → empty', () => {
    const full = [{ id: '1', cameraName: 'Rear', resolution: '1920x1080', recordingFps: '30fps' }]
    const mixed = [...full, { id: '2', cameraName: '', resolution: '', recordingFps: '' }]
    expect(selectDrawerStatus(loc({}, { cameras: full })).cameras).toBe('complete')
    expect(selectDrawerStatus(loc({}, { cameras: mixed })).cameras).toBe('partial')
    expect(selectDrawerStatus(loc()).cameras).toBe('empty')
  })

  it('requestedScope array: full item → complete; mixed → partial; [] → empty', () => {
    const full = [{ id: '1', startDateTime: '2025-03-08 23:45', endDateTime: '2025-03-09 01:30', isActualTime: true, cameras: '3' }]
    const mixed = [...full, { id: '2', startDateTime: '', endDateTime: '', isActualTime: false, cameras: '' }]
    expect(selectDrawerStatus(loc({}, { scopes: full })).requestedScope).toBe('complete')
    expect(selectDrawerStatus(loc({}, { scopes: mixed })).requestedScope).toBe('partial')
    expect(selectDrawerStatus(loc()).requestedScope).toBe('empty')
  })

  it('extractedScope: [] empty; present-but-blank partial; all filled complete', () => {
    const blankItem = [{ id: '1', startDateTime: '', endDateTime: '', isActualTime: false, cameras: '' }]
    const fullItem = [{ id: '1', startDateTime: '2025-03-08 23:45', endDateTime: '2025-03-09 01:30', isActualTime: false, cameras: '3' }]
    expect(selectDrawerStatus(loc()).extractedScope).toBe('empty')
    expect(selectDrawerStatus(loc({}, { extractedScopes: blankItem })).extractedScope).toBe('partial')
    expect(selectDrawerStatus(loc({}, { extractedScopes: fullItem })).extractedScope).toBe('complete')
  })

  it('timeOffset: committed offset → complete; null → empty', () => {
    const off = {
      dvrDateTime: '2025-03-08 23:45',
      actualDateTime: '2025-03-08 23:50',
      differenceMs: 0,
      formattedDifference: '',
      direction: 'AHEAD OF' as const,
      isDvrAhead: false,
      isCorrect: true,
      dvrAppliesDST: false,
      sync: null,
      captureMethod: 'manual' as const,
    }
    expect(selectDrawerStatus(loc({}, { timeOffset: off })).timeOffset).toBe('complete')
    expect(selectDrawerStatus(loc()).timeOffset).toBe('empty')
  })

  it('notes is two-state: text → complete; blank → empty (never partial)', () => {
    expect(selectDrawerStatus(loc({}, { notesText: 'Some notes' })).notes).toBe('complete')
    expect(selectDrawerStatus(loc()).notes).toBe('empty')
  })

  it('completion: blank → empty; one field → partial; both → complete', () => {
    expect(selectDrawerStatus(loc()).completion).toBe('empty')
    expect(selectDrawerStatus(loc({}, { completedBy: 'Det. X' })).completion).toBe('partial')
    expect(selectDrawerStatus(loc({}, { dateTimeCompleted: '2025-03-09 12:00', completedBy: 'Det. X' })).completion).toBe('complete')
  })
})
