import { describe, it, expect } from 'vitest'
import { toCaseCards, caseStatusTheme, locationStatusTheme } from '@/features/demo/ui/screens/screenData'
import { MAP_PIN_COLORS, STATUS_LABEL } from '@/features/demo/ui/screens/map/mapTokens'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { DemoCase, DemoLocation, LocationForm } from '@/features/demo/engine/types'

const aCase = (over: Partial<DemoCase> = {}): DemoCase => ({
  id: 'c1',
  caseNumber: 'PR25-0001',
  displayName: 'Case One',
  unit: 'Robbery',
  oicName: 'L. McHugh',
  oicBadge: '4471',
  vcName: '',
  vcBadge: '',
  incidentBusinessName: '',
  incidentStreetAddress: '',
  incidentCity: '',
  notes: '',
  status: 'draft',
  createdLabel: 'Mar 9, 2025',
  locationIds: ['l1'],
  ...over,
})

const aLoc = (over: Partial<DemoLocation> = {}): DemoLocation => ({
  id: 'l1',
  caseId: 'c1',
  locationName: "Kim's Convenience",
  businessName: '',
  streetAddress: '1450 Eglinton Ave W',
  city: 'Mississauga',
  requesterName: '',
  requesterBadge: '',
  requesterUnit: '',
  requesterPhone: '',
  requesterEmail: '',
  locationContact: '',
  locationPhone: '',
  form: blankLocationForm(),
  ...over,
})

describe('toCaseCards', () => {
  it('maps personnel, status theme, and location rows', () => {
    const [card] = toCaseCards([aCase()], [aLoc()])
    expect(card.caseNumber).toBe('PR25-0001')
    expect(card.status.label).toBe('Draft')
    expect(card.personnel[0]).toMatchObject({ role: 'OIC', name: 'L. McHugh', badge: '4471' })
    expect(card.locationCountLabel).toBe('1 location')
    expect(card.locations[0]).toMatchObject({ locationName: "Kim's Convenience", address: '1450 Eglinton Ave W, Mississauga' })
  })

  it('pluralises the location count and only attaches a case\'s own locations', () => {
    const cards = toCaseCards([aCase()], [aLoc(), aLoc({ id: 'l2', caseId: 'other' })])
    expect(cards[0].locationCountLabel).toBe('1 location')
    const [card] = toCaseCards([aCase({ locationIds: ['l1', 'l2'] })], [aLoc(), aLoc({ id: 'l2' })])
    expect(card.locationCountLabel).toBe('2 locations')
  })

  it('themes a complete case green', () => {
    expect(caseStatusTheme('complete').label).toBe('Complete')
    expect(caseStatusTheme('complete').color).toBe('#10d177')
  })
})

describe('truthful location-row status (G3)', () => {
  // A truly untouched location has no submission fields at all — the aLoc() fixture's
  // street/city already count toward the submission screen, i.e. 'working'.
  const untouched = (over: Partial<DemoLocation> = {}) => aLoc({ streetAddress: '', city: '', ...over })

  it('an untouched location reads Started — never a hardcoded Draft', () => {
    const [card] = toCaseCards([aCase()], [untouched()])
    expect(card.locations[0].status.label).toBe('Started')
    expect(card.locations[0].status.color).toBe(MAP_PIN_COLORS.started)
  })

  it('a partially-filled form reads Working', () => {
    const [card] = toCaseCards([aCase()], [aLoc({ requesterName: 'L. McHugh' })])
    expect(card.locations[0].status.label).toBe('Working')
    expect(card.locations[0].status.color).toBe(MAP_PIN_COLORS.working)
  })

  it('per-location: each row derives its own status independently', () => {
    const cards = toCaseCards(
      [aCase({ locationIds: ['l1', 'l2'] })],
      [untouched(), untouched({ id: 'l2', requesterName: 'A. Okafor' })],
    )
    expect(cards[0].locations.map((l) => l.status.label)).toEqual(['Started', 'Working'])
  })

  it('locationStatusTheme colors + labels match the map tokens (phone parity, one palette)', () => {
    for (const status of ['started', 'working', 'complete'] as const) {
      expect(locationStatusTheme(status).color).toBe(MAP_PIN_COLORS[status])
      expect(locationStatusTheme(status).label).toBe(STATUS_LABEL[status])
    }
  })

  it('a fully-complete form reads Complete (green end to end)', () => {
    // Fill every counted field on every wizard screen (mirrors selectDrawerStatus's field map).
    const form: LocationForm = {
      ...blankLocationForm(),
      scopes: [{ id: 's1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '3' }],
      extractedScopes: [{ id: 'es1', startDateTime: '2025-03-08 23:50:00', endDateTime: '2025-03-09 01:40:00', isActualTime: false, cameras: '3' }],
      arrivalDepartures: [{ id: 'a1', arrival: '2025-03-09 09:00', departure: '2025-03-09 11:00' }],
      timeOffset: {
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
      },
      dvr: {
        dvrLocation: 'Back office',
        dvrTypeBrand: 'Hikvision',
        serialModelNumber: '',
        dvrUsername: 'admin',
        dvrPassword: 'x',
        numberOfChannels: '8',
        activeCameras: '6',
        recordingSchedule: 'Continuous',
        resolution: '1080p',
        recordingFps: '15',
        firstRecordedDate: '2025-02-20 00:00',
        totalDvrRetention: '17 days',
      },
      cameras: [{ id: 'c1', cameraName: 'Front door', resolution: '1080p', recordingFps: '15' }],
      export: { exportMedia: 'USB', fileType: '.mp4', sizeGb: '2', mediaPlayerIncluded: false, mediaProvidedVia: 'USB' },
      notesFreeText: 'Notes',
      dateTimeCompleted: '2025-03-09 12:00',
      completedBy: 'Det. McHugh',
    }
    const loc = aLoc({
      requesterName: 'L. McHugh',
      requesterBadge: '4471',
      requesterPhone: '905-555-0000',
      requesterEmail: 'lm@peel.ca',
      businessName: "Kim's Convenience",
      locationContact: 'S. Gill',
      locationPhone: '905-555-0001',
      form,
    })
    const [card] = toCaseCards([aCase()], [loc])
    expect(card.locations[0].status.label).toBe('Complete')
    expect(card.locations[0].status.color).toBe(MAP_PIN_COLORS.complete)
  })
})
