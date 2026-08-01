import { describe, it, expect, vi } from 'vitest'
import {
  buildCaseMapGeoJson,
  camerasToFeatures,
  caseToIncidentFeature,
  hasPlottableFeatures,
  locationToFeature,
  summariseCaseMapCoverage,
} from '@/features/demo/engine/logic/case-map/geojson'
import { FEATURE_TYPES, type GeoJSONFeature } from '@/features/demo/engine/logic/case-map/types'
import { demoCase, demoLocation } from '@/features/demo/engine/store/__tests__/test-utils'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { CameraEntry, LocationForm } from '@/features/demo/engine/types'

const form = (over: Partial<LocationForm> = {}): LocationForm => ({ ...blankLocationForm(), ...over })
const camera = (over: Partial<CameraEntry> = {}): CameraEntry => ({
  id: 'cam1',
  cameraName: 'Till',
  resolution: '',
  recordingFps: '',
  ...over,
})

describe('summariseCaseMapCoverage (review R-1)', () => {
  const located = (id: string, name: string) =>
    demoLocation({ id, locationName: name, gps: { lat: 43.6, lng: -79.6, source: 'gps' } })
  const typedOnly = (id: string, name: string) => demoLocation({ id, locationName: name, gps: undefined })

  it('counts what plots and NAMES what does not', () => {
    // The demo's normal mixed state: some addresses picked, some typed. The typed ones cannot
    // be plotted, and the visitor has to be told which.
    expect(
      summariseCaseMapCoverage([located('a', 'Front Counter'), typedOnly('b', 'Rear Alley'), typedOnly('c', 'Loading Bay')]),
    ).toEqual({
      totalLocations: 3,
      plottedLocations: 1,
      droppedLocationNames: ['Rear Alley', 'Loading Bay'],
      hasPlottedLocations: true,
    })
  })

  it('reports zero plotted for a case whose locations are all coordinate-less', () => {
    expect(summariseCaseMapCoverage([typedOnly('a', 'One'), typedOnly('b', 'Two')])).toMatchObject({
      totalLocations: 2,
      plottedLocations: 0,
      hasPlottedLocations: false,
    })
  })

  it('is empty-safe', () => {
    expect(summariseCaseMapCoverage([])).toEqual({
      totalLocations: 0,
      plottedLocations: 0,
      droppedLocationNames: [],
      hasPlottedLocations: false,
    })
  })

  it('drops the (0,0) pair, exactly as the builder does', () => {
    // ONE gate for the count and the file — otherwise the sentence on screen and the artifact
    // disagree about the same location.
    const nullIsland = demoLocation({ id: 'z', locationName: 'Null Island', gps: { lat: 0, lng: 0, source: 'manual' } })
    expect(summariseCaseMapCoverage([nullIsland])).toMatchObject({
      plottedLocations: 0,
      droppedLocationNames: ['Null Island'],
    })
    expect(buildCaseMapGeoJson(null, [nullIsland]).features).toEqual([])
  })

  it('agrees with the builder on every mix', () => {
    const locations = [located('a', 'A'), typedOnly('b', 'B'), located('c', 'C')]
    const coverage = summariseCaseMapCoverage(locations)
    const plotted = buildCaseMapGeoJson(null, locations).features.filter(
      (f) => f.properties.featureType === 'location',
    )
    expect(plotted).toHaveLength(coverage.plottedLocations)
  })

  it('does NOT count the incident pin as a plotted location', () => {
    // R-1's second half: `hasPlottableFeatures` counts the incident, so gating the empty-map
    // caveat on it kept the caveat silent for a case with an incident and zero plotted sites.
    const collection = buildCaseMapGeoJson(
      demoCase({ incidentCoordinates: { lat: 43.7, lng: -79.4, source: 'geocoded' } }),
      [typedOnly('b', 'Rear Alley')],
    )
    expect(hasPlottableFeatures(collection)).toBe(true) // the incident is a feature…
    expect(summariseCaseMapCoverage([typedOnly('b', 'Rear Alley')]).hasPlottedLocations).toBe(false) // …but not a site
  })

  it('dev-warns when the builder omits a location, like generateExtractedScopes does', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    buildCaseMapGeoJson(null, [typedOnly('a', 'One'), typedOnly('b', 'Two')])
    expect(warn).toHaveBeenCalledWith(
      '[demo] buildCaseMapGeoJson omitted 2 location(s) with no captured coordinates',
    )
    warn.mockClear()
    buildCaseMapGeoJson(null, [located('a', 'One')])
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('featureType is a closed id space (review R-28)', () => {
  it('every emitted featureType is a declared member', () => {
    const collection = buildCaseMapGeoJson(
      demoCase({ incidentCoordinates: { lat: 43.7, lng: -79.4, source: 'geocoded' } }),
      [
        demoLocation({
          gps: { lat: 43.6, lng: -79.6, source: 'gps' },
          form: form({ cameras: [camera({ gps: { lat: 43.6, lng: -79.6, source: 'gps', capturedAt: '2025-03-08T12:00:00.000Z' } })] }),
        }),
      ],
    )
    for (const feature of collection.features) {
      expect(FEATURE_TYPES).toContain(feature.properties.featureType)
    }
    expect(new Set(collection.features.map((f) => f.properties.featureType))).toEqual(
      new Set(FEATURE_TYPES),
    )
  })

  it('refuses an undeclared featureType at compile time', () => {
    // A COMPILE-TIME pin (`tsc --noEmit` is the gate that reads it). A writer typo used to be
    // invisible: it surfaced only as `hasPlottedLocations` mis-answering, i.e. as the wrong
    // success sentence on a real download.
    const typo: GeoJSONFeature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      // @ts-expect-error 'locations' is not a FeatureType — this is the typo the type now catches
      properties: { featureType: 'locations' },
    }
    expect(typo.type).toBe('Feature')
  })
})

describe('caseToIncidentFeature', () => {
  it('projects the incident scene with case personnel and the address parts', () => {
    const feature = caseToIncidentFeature(
      demoCase({
        incidentBusinessName: 'Kim’s',
        incidentStreetAddress: '1450 Eglinton Avenue West',
        incidentCity: 'Mississauga',
        incidentCoordinates: { lat: 43.6, lng: -79.65, source: 'geocoded' },
        vcName: 'A. Vance',
        vcBadge: '2201',
      }),
    )
    expect(feature).not.toBeNull()
    expect(feature!.geometry).toEqual({ type: 'Point', coordinates: [-79.65, 43.6] })
    expect(feature!.properties).toMatchObject({
      featureType: 'incident',
      id: 'c1',
      caseId: 'c1',
      caseNumber: 'PR25-0001',
      businessName: 'Kim’s',
      streetAddress: '1450 Eglinton Avenue West',
      city: 'Mississauga',
      // NOT street-type-abbreviated: the incident keeps what the case creator typed.
      address: '1450 Eglinton Avenue West, Mississauga',
      coordinateSource: 'geocoded',
      oicName: 'L. McHugh',
      oicBadgeNumber: '4471',
      videoCoordinatorName: 'A. Vance',
      videoCoordinatorBadgeNumber: '2201',
      unit: 'Robbery',
    })
  })

  it('returns null without captured coordinates, and for the (0,0) pair', () => {
    expect(caseToIncidentFeature(demoCase({ incidentCoordinates: undefined }))).toBeNull()
    expect(
      caseToIncidentFeature(demoCase({ incidentCoordinates: { lat: 0, lng: 0, source: 'manual' } })),
    ).toBeNull()
  })

  it('omits empty personnel and display-name keys rather than emitting blanks', () => {
    const feature = caseToIncidentFeature(
      demoCase({
        displayName: '   ',
        oicName: '',
        oicBadge: '',
        vcName: '',
        vcBadge: '',
        unit: '',
        incidentCoordinates: { lat: 43.6, lng: -79.65, source: 'manual' },
      }),
    )
    const keys = Object.keys(feature!.properties)
    expect(keys).not.toContain('displayName')
    expect(keys).not.toContain('oicName')
    expect(keys).not.toContain('unit')
    // Address parts stay present-but-null (the phone's `|| null` shape), unlike the truthy-only set.
    expect(feature!.properties.businessName).toBeNull()
    expect(feature!.properties.address).toBeNull()
  })
})

describe('locationToFeature', () => {
  it('projects the full exportable field set', () => {
    const feature = locationToFeature(
      demoLocation({
        businessName: 'Kim’s Convenience',
        requesterName: 'Det. McHugh',
        requesterBadge: '4471',
        requesterUnit: 'Central Robbery',
        requesterPhone: '905-555-0100',
        requesterEmail: 'mchugh@example.test',
        locationContact: 'Mr. Kim',
        locationPhone: '905-555-0199',
        gps: { lat: 43.5891234567, lng: -79.6412345678, accuracyM: 8, source: 'gps' },
        form: form({
          scopes: [{ id: 's1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '3, 4, 7' }],
          notesFreeText: 'Manager pulled the clips.',
          dateTimeCompleted: '2025-03-10 09:00:00',
          completedBy: 'PC Reyes',
          export: { ...blankLocationForm().export, fileType: 'MP4' },
        }),
      }),
    )
    expect(feature!.properties).toMatchObject({
      featureType: 'location',
      id: 'l1',
      caseId: 'c1',
      locationName: "Kim's Convenience",
      businessName: 'Kim’s Convenience',
      streetAddress: '1450 Eglinton Ave W',
      city: 'Mississauga',
      address: '1450 Eglinton Ave W, Mississauga',
      requesterName: 'Det. McHugh',
      requesterBadgeNumber: '4471',
      requesterUnit: 'Central Robbery',
      requesterPhone: '905-555-0100',
      requesterEmail: 'mchugh@example.test',
      locationContact: 'Mr. Kim',
      locationPhone: '905-555-0199',
      coordinateAccuracy: 8,
      coordinateSource: 'gps',
      fileType: 'MP4',
      notesFreeText: 'Manager pulled the clips.',
      dateTimeCompleted: '2025-03-10 09:00:00',
      completedBy: 'PC Reyes',
      cameraCount: 0,
    })
    expect(feature!.properties.scopes).toHaveLength(1)
    // Coordinates round to the canonical 6 decimals.
    expect(feature!.geometry.coordinates).toEqual([-79.641235, 43.589123])
  })

  it('always emits the three array properties, even when empty (review R-24)', () => {
    // Stated contract is PRESENCE, not truthiness — the phone's read side keys off it
    // (geojson-service.ts:68,84-85) — and it was unpinned: deleting two of the three emissions
    // stayed green (mutation-verified by the tests lane). On a forensic-style artifact an
    // absent key and an empty list are different claims.
    const bare = locationToFeature(demoLocation({ gps: { lat: 43.6, lng: -79.6, source: 'gps' } }))
    expect(Object.keys(bare!.properties)).toEqual(
      expect.arrayContaining(['scopes', 'extractedScopes', 'arrivalDepartures']),
    )
    expect(bare!.properties.scopes).toEqual([])
    expect(bare!.properties.extractedScopes).toEqual([])
    expect(bare!.properties.arrivalDepartures).toEqual([])
  })

  it('never emits a status the live map would not colour the same pin with', () => {
    // Derived, not stored: an explicitly completed location is `complete`; a location with
    // nothing filled in is `started`; anything in between is `working` — the same rule
    // `selectLocationMapStatus` gives the in-app map's pin colours.
    const untouched = locationToFeature(
      demoLocation({ locationName: '', streetAddress: '', city: '', gps: { lat: 43.6, lng: -79.6, source: 'gps' } }),
    )
    expect(untouched!.properties.status).toBe('started')
    const partial = locationToFeature(demoLocation({ gps: { lat: 43.6, lng: -79.6, source: 'gps' } }))
    expect(partial!.properties.status).toBe('working')
    const done = locationToFeature(
      demoLocation({ gps: { lat: 43.6, lng: -79.6, source: 'gps' }, form: form({ completed: true }) }),
    )
    expect(done!.properties.status).toBe('complete')
  })

  it('emits timeCalibration with only the sub-fields that are present, and omits it when empty', () => {
    const withOffset = locationToFeature(
      demoLocation({
        gps: { lat: 43.6, lng: -79.6, source: 'gps' },
        form: form({
          timeOffset: {
            dvrDateTime: '2025-03-08 12:05:30',
            actualDateTime: '',
            differenceMs: 0,
            formattedDifference: '2 minutes',
            direction: 'BEHIND',
            isDvrAhead: false,
            isCorrect: false,
            dvrAppliesDST: true,
            sync: null,
            captureMethod: 'manual',
          },
        }),
      }),
    )
    expect(withOffset!.properties.timeCalibration).toEqual({
      dvrDateTime: '2025-03-08 12:05:30',
      timeDifference: '2 minutes',
      direction: 'BEHIND',
    })

    const noOffset = locationToFeature(demoLocation({ gps: { lat: 43.6, lng: -79.6, source: 'gps' } }))
    expect(Object.keys(noOffset!.properties)).not.toContain('timeCalibration')
  })

  it('counts only cameras that will actually plot', () => {
    const feature = locationToFeature(
      demoLocation({
        gps: { lat: 43.6, lng: -79.6, source: 'gps' },
        form: form({
          cameras: [
            camera({ id: 'a', gps: { lat: 43.6, lng: -79.6, source: 'gps', capturedAt: '2025-03-08T12:00:00.000Z' } }),
            camera({ id: 'b' }), // no fix
            camera({ id: 'c', gps: { lat: 0, lng: 0, source: 'gps', capturedAt: '2025-03-08T12:00:00.000Z' } }), // Null Island
          ],
        }),
      }),
    )
    expect(feature!.properties.cameraCount).toBe(1)
  })

  it('returns null for a location with no captured fix', () => {
    expect(locationToFeature(demoLocation({ gps: undefined }))).toBeNull()
    expect(locationToFeature(demoLocation({ gps: { lat: 0, lng: 0, source: 'manual' } }))).toBeNull()
  })

  it('drops a zero accuracy rather than claiming a ±0 m fix', () => {
    const feature = locationToFeature(demoLocation({ gps: { lat: 43.6, lng: -79.6, accuracyM: 0, source: 'gps' } }))
    expect(Object.keys(feature!.properties)).not.toContain('coordinateAccuracy')
  })
})

describe('camerasToFeatures', () => {
  it('gives every camera a collection-unique composite id', () => {
    const features = camerasToFeatures(
      demoLocation({
        id: 'locA',
        form: form({
          cameras: [
            camera({ id: 'cam1', cameraName: 'Till', resolution: '1080p', recordingFps: '15', gps: { lat: 43.6, lng: -79.6, accuracyM: 4, source: 'gps', capturedAt: '2025-03-08T12:00:00.000Z' } }),
            camera({ id: 'cam2', cameraName: 'Rear', gps: { lat: 43.61, lng: -79.61, source: 'gps', capturedAt: '2025-03-08T12:01:00.000Z' } }),
          ],
        }),
      }),
    )
    expect(features.map((f) => f.properties.id)).toEqual(['locA:cam1', 'locA:cam2'])
    expect(features[0].properties).toMatchObject({
      featureType: 'camera',
      cameraId: 'cam1',
      locationId: 'locA',
      caseId: 'c1',
      cameraName: 'Till',
      resolution: '1080p',
      recordingFps: '15',
      coordinateAccuracy: 4,
      coordinateSource: 'gps',
    })
    expect(Object.keys(features[1].properties)).not.toContain('resolution')
  })

  it('skips cameras with no fix, and the (0,0) pair', () => {
    const features = camerasToFeatures(
      demoLocation({
        form: form({
          cameras: [
            camera({ id: 'a' }),
            camera({ id: 'b', gps: { lat: 0, lng: 0, source: 'gps', capturedAt: '2025-03-08T12:00:00.000Z' } }),
          ],
        }),
      }),
    )
    expect(features).toEqual([])
  })
})

describe('buildCaseMapGeoJson', () => {
  it('emits incident → locations → cameras, in that order', () => {
    const collection = buildCaseMapGeoJson(
      demoCase({ incidentCoordinates: { lat: 43.7, lng: -79.4, source: 'geocoded' } }),
      [
        demoLocation({
          id: 'l1',
          gps: { lat: 43.6, lng: -79.6, source: 'gps' },
          form: form({ cameras: [camera({ id: 'cam1', gps: { lat: 43.6, lng: -79.6, source: 'gps', capturedAt: '2025-03-08T12:00:00.000Z' } })] }),
        }),
        demoLocation({ id: 'l2', gps: { lat: 43.5, lng: -79.5, source: 'manual' } }),
      ],
    )
    expect(collection.type).toBe('FeatureCollection')
    expect(collection.features.map((f) => f.properties.featureType)).toEqual([
      'incident',
      'location',
      'location',
      'camera',
    ])
  })

  it('omits an unplottable case entirely rather than pinning it at Null Island', () => {
    const collection = buildCaseMapGeoJson(demoCase({ incidentCoordinates: undefined }), [
      demoLocation({ gps: undefined }),
    ])
    expect(collection.features).toEqual([])
    expect(hasPlottableFeatures(collection)).toBe(false)
  })

  it('handles a null case (nothing to project) without throwing', () => {
    expect(buildCaseMapGeoJson(null, [])).toEqual({ type: 'FeatureCollection', features: [] })
  })

  it('treats a camera-only collection as having nothing worth exporting', () => {
    const collection = buildCaseMapGeoJson(demoCase({ incidentCoordinates: undefined }), [
      demoLocation({
        gps: undefined,
        form: form({ cameras: [camera({ id: 'cam1', gps: { lat: 43.6, lng: -79.6, source: 'gps', capturedAt: '2025-03-08T12:00:00.000Z' } })] }),
      }),
    ])
    expect(collection.features).toHaveLength(1)
    expect(hasPlottableFeatures(collection)).toBe(false)
  })
})
