import { describe, it, expect } from 'vitest'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { toMapData } from '@/features/demo/ui/screens/map/mapData'

function build() {
  const store = createDemoStore()
  const caseId = store.getState().createCase({
    caseNumber: 'PR25-1',
    displayName: 'Kim B&E',
    unit: 'Robbery',
    incidentCoordinates: { lat: 43.6, lng: -79.6, source: 'geocoded' },
  })
  store.getState().addLocation(caseId, { locationName: 'Rear door', gps: { lat: 43.61, lng: -79.61, source: 'geocoded' } })
  store.getState().addLocation(caseId, { locationName: 'No coords' }) // no gps → not plotted
  const s = store.getState()
  return {
    viewerCase: s.cases.find((c) => c.id === caseId)!,
    locations: s.locations.filter((l) => l.caseId === caseId),
  }
}

describe('toMapData', () => {
  it('returns an empty projection for a null case', () => {
    expect(toMapData(null, [])).toEqual({ pins: [], incident: null, items: [], statusCounts: { started: 0, working: 0, complete: 0 } })
  })

  it('projects the incident from incidentCoordinates and lists it first', () => {
    const { viewerCase, locations } = build()
    const data = toMapData(viewerCase, locations)
    expect(data.incident).toMatchObject({ lng: -79.6, lat: 43.6, caseNumber: 'PR25-1' })
    expect(data.items[0].kind).toBe('incident')
  })

  // ---- the plotting policy (review R-7, discharging §49g) -----------------------------------
  //
  // `hasCapturedCoordinates` is the app's answer to "should this ever DISPLAY as a captured
  // position?", and P3.7 wired the case sheet, the PDF camera row and the notes formatter to it
  // while the map kept reading plain presence. One stored pair, three consumers, two behaviours.

  it('does not plot a (0,0) incident — Null Island is never a captured position', () => {
    const store = createDemoStore()
    const caseId = store.getState().createCase({
      caseNumber: 'PR25-NULL',
      displayName: 'Null Island',
      unit: 'Robbery',
      // Geometrically valid, and `parseCoordinate` accepts it, so a visitor CAN type it.
      incidentCoordinates: { lat: 0, lng: 0, source: 'manual' },
    })
    const s = store.getState()
    const data = toMapData(s.cases.find((c) => c.id === caseId)!, [])

    expect(data.incident).toBeNull()
    expect(data.items.some((i) => i.kind === 'incident')).toBe(false)
  })

  it('does not plot a (0,0) location, and does not count it in the status tallies', () => {
    const store = createDemoStore()
    const caseId = store.getState().createCase({ caseNumber: 'PR25-NULL2', displayName: 'X', unit: 'Robbery' })
    store.getState().addLocation(caseId, { locationName: 'Null Island', gps: { lat: 0, lng: 0, source: 'manual' } })
    store.getState().addLocation(caseId, { locationName: 'Real', gps: { lat: 43.61, lng: -79.61, source: 'gps' } })
    const s = store.getState()
    const data = toMapData(
      s.cases.find((c) => c.id === caseId)!,
      s.locations.filter((l) => l.caseId === caseId),
    )

    expect(data.pins).toHaveLength(1)
    expect(data.pins[0]).toMatchObject({ lat: 43.61, lng: -79.61 })
    expect(data.items.filter((i) => i.kind === 'location')).toHaveLength(1)
    expect(data.statusCounts.started).toBe(1)
  })

  it('plots only located locations (a coord-less location is excluded from pins and items)', () => {
    const { viewerCase, locations } = build()
    const data = toMapData(viewerCase, locations)
    expect(data.pins).toHaveLength(1)
    expect(data.pins[0]).toMatchObject({ lng: -79.61, lat: 43.61 })
    const locItems = data.items.filter((i) => i.kind === 'location')
    expect(locItems).toHaveLength(1)
    expect(locItems[0]).toMatchObject({ locationName: 'Rear door', coord: [-79.61, 43.61] })
  })

  it("tallies status counts (a blank located location is 'started')", () => {
    const { viewerCase, locations } = build()
    const data = toMapData(viewerCase, locations)
    expect(data.pins[0].status).toBe('started')
    expect(data.statusCounts).toEqual({ started: 1, working: 0, complete: 0 })
  })

  it('projects with no incident when the case has no coordinates', () => {
    const store = createDemoStore()
    const caseId = store.getState().createCase({ caseNumber: 'PR25-2', displayName: 'No incident', unit: 'R' })
    store.getState().addLocation(caseId, { locationName: 'A', gps: { lat: 1, lng: 2, source: 'geocoded' } })
    const s = store.getState()
    const data = toMapData(s.cases.find((c) => c.id === caseId)!, s.locations.filter((l) => l.caseId === caseId))
    expect(data.incident).toBeNull()
    expect(data.items.every((i) => i.kind === 'location')).toBe(true)
  })
})

// ---- per-camera GPS → camera markers (P3.7 feeds P6.1) --------------------------------------
describe('toMapData — camera markers', () => {
  function buildWithCameras() {
    const store = createDemoStore()
    const caseId = store.getState().createCase({ caseNumber: 'PR25-3', displayName: 'Cams', unit: 'R' })
    const locId = store.getState().addLocation(caseId, {
      locationName: 'Rear door',
      gps: { lat: 43.61, lng: -79.61, source: 'geocoded' },
    })
    store.getState().switchLocation(locId)
    store.getState().updateField('form.cameras', [
      { id: 'cam-1', cameraName: 'Front entry', resolution: '1080p', recordingFps: '15' },
      { id: 'cam-2', cameraName: 'Loading bay', resolution: '', recordingFps: '' },
      { id: 'cam-3', cameraName: 'No fix', resolution: '4K', recordingFps: '30' },
    ])
    return { store, caseId, locId }
  }

  const fix = (lat: number, lng: number, accuracyM?: number) => ({
    lat,
    lng,
    source: 'gps' as const,
    capturedAt: '2026-07-31T12:00:00.000Z',
    ...(accuracyM != null ? { accuracyM } : {}),
  })

  function project(store: ReturnType<typeof createDemoStore>, caseId: string) {
    const s = store.getState()
    return toMapData(s.cases.find((c) => c.id === caseId)!, s.locations.filter((l) => l.caseId === caseId))
  }

  it('plots only cameras with a captured fix, keyed by the composite locationId:cameraId', () => {
    const { store, caseId, locId } = buildWithCameras()
    store.getState().setCameraGps('cam-1', fix(43.615, -79.615, 4.2))
    store.getState().setCameraGps('cam-2', fix(43.616, -79.616))
    const item = project(store, caseId).items.find((i) => i.kind === 'location')!
    expect(item.kind).toBe('location')
    if (item.kind !== 'location') return
    expect(item.cameras.map((c) => c.id)).toEqual([`${locId}:cam-1`, `${locId}:cam-2`])
    expect(item.cameras[0]).toMatchObject({ cameraName: 'Front entry', lng: -79.615, lat: 43.615, resolution: '1080p', accuracyM: 4.2 })
  })

  it('omits resolution and accuracy keys when absent, rather than emitting empty values', () => {
    const { store, caseId } = buildWithCameras()
    store.getState().setCameraGps('cam-2', fix(43.616, -79.616))
    const item = project(store, caseId).items.find((i) => i.kind === 'location')!
    if (item.kind !== 'location') return
    expect(item.cameras[0]).not.toHaveProperty('resolution')
    expect(item.cameras[0]).not.toHaveProperty('accuracyM')
  })

  it('never plots a (0,0) camera fix — the same Null Island policy as the location pins', () => {
    const { store, caseId } = buildWithCameras()
    store.getState().setCameraGps('cam-1', fix(0, 0, 3))
    const item = project(store, caseId).items.find((i) => i.kind === 'location')!
    if (item.kind !== 'location') return
    expect(item.cameras).toEqual([])
  })

  it('gives a location with no geolocated cameras an empty array (hides the toggle)', () => {
    const { store, caseId } = buildWithCameras()
    const item = project(store, caseId).items.find((i) => i.kind === 'location')!
    if (item.kind !== 'location') return
    expect(item.cameras).toEqual([])
  })
})
