import { describe, it, expect } from 'vitest'
import { COUNT_ALL_FIELDS, selectDrawerStatus, selectLocationMapStatus } from '@/features/demo/engine/store/selectors'
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
    form: { ...blankLocationForm(), ...formOver },
    ...over,
  }
}

describe('selectDrawerStatus', () => {
  it('null location → every screen empty', () => {
    expect(Object.values(selectDrawerStatus(null, COUNT_ALL_FIELDS)).every((v) => v === 'empty')).toBe(true)
  })

  it('blank location → every screen empty', () => {
    expect(Object.values(selectDrawerStatus(loc(), COUNT_ALL_FIELDS)).every((v) => v === 'empty')).toBe(true)
  })

  it('submission: all counted fields filled → complete; some → partial', () => {
    const full = loc({ requesterName: 'A', requesterBadge: 'B', requesterPhone: 'C', requesterEmail: 'D', businessName: 'E', streetAddress: 'F', city: 'G', locationContact: 'H', locationPhone: 'I' })
    expect(selectDrawerStatus(full, COUNT_ALL_FIELDS).submission).toBe('complete')
    expect(selectDrawerStatus(loc({ requesterName: 'A' }), COUNT_ALL_FIELDS).submission).toBe('partial')
  })

  it('dvrInfo: serialModelNumber is excluded; counted fields drive the status', () => {
    const blank = blankLocationForm().dvr
    // only the excluded field → still empty
    expect(selectDrawerStatus(loc({}, { dvr: { ...blank, serialModelNumber: 'SN-123' } }), COUNT_ALL_FIELDS).dvrInfo).toBe('empty')
    // one COUNTED field → partial (fails if dvrLocation weren't counted)
    expect(selectDrawerStatus(loc({}, { dvr: { ...blank, dvrLocation: 'Office' } }), COUNT_ALL_FIELDS).dvrInfo).toBe('partial')
    // all counted filled, serial still blank → complete (serial doesn't gate green)
    const allCounted = { ...blank, dvrLocation: 'a', dvrTypeBrand: 'b', dvrUsername: 'c', dvrPassword: 'd', numberOfChannels: '8', activeCameras: '4', resolution: '1920x1080', recordingFps: '30fps', firstRecordedDate: '2025-01-01' }
    expect(selectDrawerStatus(loc({}, { dvr: allCounted }), COUNT_ALL_FIELDS).dvrInfo).toBe('complete')
  })

  it('exportInfo: mediaPlayerIncluded is excluded; counted fields drive the status', () => {
    const blank = blankLocationForm().export
    expect(selectDrawerStatus(loc({}, { export: { ...blank, mediaPlayerIncluded: true } }), COUNT_ALL_FIELDS).exportInfo).toBe('empty')
    expect(selectDrawerStatus(loc({}, { export: { ...blank, exportMedia: 'USB Drive' } }), COUNT_ALL_FIELDS).exportInfo).toBe('partial')
    const allCounted = { ...blank, exportMedia: 'USB Drive', fileType: 'MP4', sizeGb: '12', mediaProvidedVia: 'Hand Delivered' }
    expect(selectDrawerStatus(loc({}, { export: allCounted }), COUNT_ALL_FIELDS).exportInfo).toBe('complete')
  })

  it('arrivalDeparture array: full item → complete; mixed → partial; [] → empty', () => {
    const full = [{ id: '1', arrival: '2025-03-08 10:00', departure: '2025-03-08 11:00' }]
    const mixed = [...full, { id: '2', arrival: '', departure: '' }]
    expect(selectDrawerStatus(loc({}, { arrivalDepartures: full }), COUNT_ALL_FIELDS).arrivalDeparture).toBe('complete')
    expect(selectDrawerStatus(loc({}, { arrivalDepartures: mixed }), COUNT_ALL_FIELDS).arrivalDeparture).toBe('partial')
    expect(selectDrawerStatus(loc(), COUNT_ALL_FIELDS).arrivalDeparture).toBe('empty')
  })

  it('cameras array: full item → complete; mixed → partial; [] → empty', () => {
    const full = [{ id: '1', cameraName: 'Rear', resolution: '1920x1080', recordingFps: '30fps' }]
    const mixed = [...full, { id: '2', cameraName: '', resolution: '', recordingFps: '' }]
    expect(selectDrawerStatus(loc({}, { cameras: full }), COUNT_ALL_FIELDS).cameras).toBe('complete')
    expect(selectDrawerStatus(loc({}, { cameras: mixed }), COUNT_ALL_FIELDS).cameras).toBe('partial')
    expect(selectDrawerStatus(loc(), COUNT_ALL_FIELDS).cameras).toBe('empty')
  })

  it('requestedScope array: full item → complete; mixed → partial; [] → empty', () => {
    const full = [{ id: '1', startDateTime: '2025-03-08 23:45', endDateTime: '2025-03-09 01:30', isActualTime: true, cameras: '3' }]
    const mixed = [...full, { id: '2', startDateTime: '', endDateTime: '', isActualTime: false, cameras: '' }]
    expect(selectDrawerStatus(loc({}, { scopes: full }), COUNT_ALL_FIELDS).requestedScope).toBe('complete')
    expect(selectDrawerStatus(loc({}, { scopes: mixed }), COUNT_ALL_FIELDS).requestedScope).toBe('partial')
    expect(selectDrawerStatus(loc(), COUNT_ALL_FIELDS).requestedScope).toBe('empty')
  })

  it('extractedScope: [] empty; present-but-blank partial; all filled complete', () => {
    const blankItem = [{ id: '1', startDateTime: '', endDateTime: '', isActualTime: false, cameras: '' }]
    const fullItem = [{ id: '1', startDateTime: '2025-03-08 23:45', endDateTime: '2025-03-09 01:30', isActualTime: false, cameras: '3' }]
    expect(selectDrawerStatus(loc(), COUNT_ALL_FIELDS).extractedScope).toBe('empty')
    expect(selectDrawerStatus(loc({}, { extractedScopes: blankItem }), COUNT_ALL_FIELDS).extractedScope).toBe('partial')
    expect(selectDrawerStatus(loc({}, { extractedScopes: fullItem }), COUNT_ALL_FIELDS).extractedScope).toBe('complete')
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
    expect(selectDrawerStatus(loc({}, { timeOffset: off }), COUNT_ALL_FIELDS).timeOffset).toBe('complete')
    expect(selectDrawerStatus(loc(), COUNT_ALL_FIELDS).timeOffset).toBe('empty')
  })

  it('notes is two-state: section content, an addendum, or free text → complete; blank → empty (never partial)', () => {
    const section = (over: Partial<import('@/features/demo/engine/types').NoteSection> = {}) => ({
      id: 'address' as const,
      content: '',
      generatedContent: '',
      manuallyEdited: false,
      ...over,
    })
    expect(selectDrawerStatus(loc({}, { notesFreeText: 'Some notes' }), COUNT_ALL_FIELDS).notes).toBe('complete')
    expect(selectDrawerStatus(loc({}, { notesSections: [section({ content: '• line' })] }), COUNT_ALL_FIELDS).notes).toBe('complete')
    // a deleted section carrying only an addendum still counts (it renders in the assembly)
    expect(
      selectDrawerStatus(loc({}, { notesSections: [section({ userAddendum: 'kept note', manuallyEdited: true })] }), COUNT_ALL_FIELDS).notes,
    ).toBe('complete')
    expect(selectDrawerStatus(loc({}, { notesSections: [section()] }), COUNT_ALL_FIELDS).notes).toBe('empty')
    expect(selectDrawerStatus(loc(), COUNT_ALL_FIELDS).notes).toBe('empty')
  })

  it('completion: blank → empty; one field → partial; both → complete', () => {
    expect(selectDrawerStatus(loc(), COUNT_ALL_FIELDS).completion).toBe('empty')
    expect(selectDrawerStatus(loc({}, { completedBy: 'Det. X' }), COUNT_ALL_FIELDS).completion).toBe('partial')
    expect(selectDrawerStatus(loc({}, { dateTimeCompleted: '2025-03-09 12:00', completedBy: 'Det. X' }), COUNT_ALL_FIELDS).completion).toBe('complete')
  })
})

describe('selectDrawerStatus with a visibility (P7.3)', () => {
  // The mode is NAMED on both arms (R-23): `COUNT_ALL_FIELDS` above is the map-pin reading, a
  // FormVisibility here is the drawer's. Neither is "the default" and neither is signalled by
  // an omitted argument.
  const blankDvr = blankLocationForm().dvr
  const forensic = { profile: 'forensic' as const, formOverrides: { steps: {}, fields: {} } }
  const canvas = { profile: 'canvas' as const, formOverrides: { steps: {}, fields: {} } }

  it('changes nothing when every field is visible', () => {
    const l = loc({ requesterName: 'A' })
    expect(selectDrawerStatus(l, forensic)).toEqual(selectDrawerStatus(l, COUNT_ALL_FIELDS))
  })

  it('stops counting a field the visitor can no longer fill', () => {
    // The canvas case: five of the nine counted DVR fields are hidden, so without this the dot
    // could never go green no matter what the visitor typed.
    const filled = {
      ...blankDvr,
      dvrTypeBrand: 'Hikvision',
      dvrUsername: 'admin',
      dvrPassword: 'pw',
      firstRecordedDate: '2025-01-01',
    }
    const l = loc({}, { dvr: filled })
    expect(selectDrawerStatus(l, COUNT_ALL_FIELDS).dvrInfo).toBe('partial') // unfiltered: the 5 canvas-hidden ones are blank
    expect(selectDrawerStatus(l, canvas).dvrInfo).toBe('complete')
  })

  it('applies inside array screens too', () => {
    const scopes = [{ id: 's1', startDateTime: '2025-01-01 00:00:00', endDateTime: '2025-01-01 01:00:00', isActualTime: true, cameras: '' }]
    const l = loc({}, { scopes })
    expect(selectDrawerStatus(l, COUNT_ALL_FIELDS).requestedScope).toBe('partial') // blank cameras
    const noCameras = { profile: 'forensic' as const, formOverrides: { steps: {}, fields: { 'scope.cameras': false } } }
    expect(selectDrawerStatus(l, noCameras).requestedScope).toBe('complete')
  })

  it('reads a screen with every counted field hidden as complete, not stuck empty', () => {
    const hideExport = {
      profile: 'forensic' as const,
      formOverrides: {
        steps: {},
        fields: {
          'export.exportMedia': false,
          'export.fileType': false,
          'export.sizeGb': false,
          'export.mediaProvidedVia': false,
        },
      },
    }
    expect(selectDrawerStatus(loc(), hideExport).exportInfo).toBe('complete')
  })

  it('leaves the MAP pin unfiltered — a location does not grade differently per reader', () => {
    // `selectLocationMapStatus` deliberately passes no visibility: the exported case map and the
    // in-app pin describe the LOCATION, not this device's form profile.
    const l = loc({}, { dvr: { ...blankDvr, dvrTypeBrand: 'Hikvision' } })
    expect(selectLocationMapStatus(l)).toBe('working')
  })
})

