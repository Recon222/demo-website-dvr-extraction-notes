import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { toMapData, type MapData } from '@/features/demo/ui/screens/map/mapData'

const { mapInstance, markerInstances, sources, layers } = vi.hoisted(() => {
  const markerInstances: Array<{ _el: HTMLElement; remove: ReturnType<typeof vi.fn> }> = []
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>()
  const layers = new Map<string, unknown>()
  const mapInstance = {
    on: vi.fn((evt: string, cb: () => void) => { if (evt === 'load') cb() }),
    remove: vi.fn(), flyTo: vi.fn(), fitBounds: vi.fn(), setCenter: vi.fn(), setZoom: vi.fn(),
    getBounds: vi.fn(() => ({ getWest: () => -180, getSouth: () => -85, getEast: () => 180, getNorth: () => 85 })),
    getZoom: vi.fn(() => 16),
    getCenter: vi.fn(() => ({ lng: -79.65, lat: 43.61 })),
    unproject: vi.fn(() => ({ lng: -79.7, lat: 43.7 })),
    addSource: vi.fn((id: string) => { sources.set(id, { setData: vi.fn() }) }),
    getSource: vi.fn((id: string) => sources.get(id)),
    removeSource: vi.fn((id: string) => { sources.delete(id) }),
    addLayer: vi.fn((spec: { id: string }) => { layers.set(spec.id, spec) }),
    getLayer: vi.fn((id: string) => layers.get(id)),
    removeLayer: vi.fn((id: string) => { layers.delete(id) }),
  }
  return { mapInstance, markerInstances, sources, layers }
})
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(function () { return mapInstance }),
    Marker: vi.fn(function (opts: { element?: HTMLElement }) {
      const el = opts?.element as HTMLElement
      const inst = { _el: el, setLngLat: vi.fn(function () { return inst }), addTo: vi.fn(function () { return inst }), remove: vi.fn(), getElement: () => el }
      markerInstances.push(inst)
      return inst
    }),
    accessToken: '',
  },
}))

import { MapScreen } from '@/features/demo/ui/screens/map/MapScreen'

function buildMapData(): MapData {
  const store = createDemoStore()
  const caseId = store.getState().createCase({ caseNumber: 'PR25-1', displayName: 'Kim B&E', unit: 'R', incidentCoordinates: { lat: 43.5, lng: -79.5, source: 'geocoded' } })
  store.getState().addLocation(caseId, {
    locationName: 'Rear door',
    gps: { lat: 43.61, lng: -79.61, source: 'geocoded' },
    requesterEmail: 'det@peel.ca',
    locationContact: 'Sandeep Gill',
    locationPhone: '905-555-0142',
  })
  const s = store.getState()
  return toMapData(s.cases.find((c) => c.id === caseId)!, s.locations.filter((l) => l.caseId === caseId))
}

/** Markers of a kind that are still ON the map — a re-plot calls `.remove()` on the old set. */
const liveMarkers = (kind: string) =>
  markerInstances.filter((m) => m._el.getAttribute('data-marker-kind') === kind && m.remove.mock.calls.length === 0)

beforeEach(() => {
  markerInstances.length = 0
  sources.clear()
  layers.clear()
  mapInstance.flyTo.mockClear()
  mapInstance.addSource.mockClear()
  mapInstance.removeSource.mockClear()
  // Past CLUSTER_MAX_ZOOM so the tiny fixtures plot as individual pins unless a test says otherwise.
  mapInstance.getZoom.mockReturnValue(16)
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
})
afterEach(() => vi.unstubAllEnvs())

describe('MapScreen — select + fly', () => {
  it('clicking a location row flies to it and opens detail mode', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(markerInstances.length).toBeGreaterThan(0)) // map ready + markers added
    fireEvent.click(screen.getByText('Rear door'))
    expect(mapInstance.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-79.61, 43.61] }))
    expect(screen.getByText('Location Details')).toBeInTheDocument()
  })

  it('a marker click drives the same select path', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(markerInstances.length).toBeGreaterThan(0))
    const locEl = markerInstances.find((m) => m._el.getAttribute('data-marker-kind') === 'location')!._el
    fireEvent.click(locEl)
    expect(mapInstance.flyTo).toHaveBeenCalled()
    expect(screen.getByText('Location Details')).toBeInTheDocument()
  })

  it('back returns to the list', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(markerInstances.length).toBeGreaterThan(0))
    fireEvent.click(screen.getByText('Rear door'))
    expect(screen.getByText('Location Details')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/All Locations/))
    expect(screen.queryByText('Location Details')).not.toBeInTheDocument()
    expect(screen.getByText('1 Location')).toBeInTheDocument()
  })
})

describe('MapScreen — call/email mock + Go to Location', () => {
  async function openDetail() {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} onEditIncident={vi.fn()} onGoToLocation={onGoTo} />)
    await waitFor(() => expect(markerInstances.length).toBeGreaterThan(0))
    fireEvent.click(screen.getByText('Rear door'))
  }
  const onGoTo = vi.fn()
  beforeEach(() => onGoTo.mockClear())

  it('tapping a phone confirms, then notifies that calling is unavailable', async () => {
    await openDetail()
    fireEvent.click(screen.getByText('905-555-0142'))
    expect(screen.getByText(/Call 905-555-0142/)).toBeInTheDocument() // the confirm sheet
    fireEvent.click(screen.getByText('Call'))
    expect(screen.getByText(/Calling isn't available in the demo/)).toBeInTheDocument()
  })

  it('cancelling the call shows no notification', async () => {
    await openDetail()
    fireEvent.click(screen.getByText('905-555-0142'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText(/Calling isn't available/)).not.toBeInTheDocument()
  })

  it('tapping an email notifies directly (no confirm sheet)', async () => {
    await openDetail()
    fireEvent.click(screen.getByText('det@peel.ca'))
    expect(screen.queryByText(/Email .* \?/)).not.toBeInTheDocument()
    expect(screen.getByText(/Email isn't available in the demo/)).toBeInTheDocument()
  })

  it('Go to Location invokes onGoToLocation with the id', async () => {
    await openDetail()
    fireEvent.click(screen.getByText('Go to Location'))
    expect(onGoTo).toHaveBeenCalledTimes(1)
  })
})

describe('MapScreen — incident edit affordance', () => {
  it('selecting the incident pin exposes Edit Incident Location, forwarding the case id', async () => {
    const onEditIncident = vi.fn()
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} onEditIncident={onEditIncident} />)
    await waitFor(() => expect(markerInstances.length).toBeGreaterThan(0))
    const incidentEl = markerInstances.find((m) => m._el.getAttribute('data-marker-kind') === 'incident')!._el
    fireEvent.click(incidentEl)
    fireEvent.click(screen.getByText('Edit Incident Location'))
    // mapData's incident item carries the CASE id (mapData.ts:97) — that's what the editor needs.
    expect(onEditIncident).toHaveBeenCalledWith(expect.stringMatching(/^c/))
  })
})

// ============================================================================================
// P6.1 — filters, proximity, camera visibility
// ============================================================================================

/** Three located locations with distinct statuses + names, plus the incident. */
function buildRichMapData(): MapData {
  const store = createDemoStore()
  const caseId = store.getState().createCase({
    caseNumber: 'PR25-9',
    displayName: 'Plaza series',
    unit: 'R',
    incidentCoordinates: { lat: 43.6, lng: -79.6, source: 'geocoded' },
  })
  // Distances from the incident scene (43.6, -79.6), which is what the proximity toggle anchors
  // on: Rear door 0 km, Loading dock ~0.67 km, Far annex ~3.3 km. So a 0.5 km ring keeps one,
  // 1 km keeps two, 5 km keeps all three.
  const near = store.getState().addLocation(caseId, {
    locationName: 'Rear door',
    businessName: "Kim's Convenience",
    gps: { lat: 43.6, lng: -79.6, source: 'geocoded' },
  })
  store.getState().addLocation(caseId, {
    locationName: 'Loading dock',
    gps: { lat: 43.606, lng: -79.6, source: 'geocoded' },
  })
  store.getState().addLocation(caseId, {
    locationName: 'Far annex',
    gps: { lat: 43.63, lng: -79.6, source: 'geocoded' },
  })
  // Mark the first one complete so the status pills have something to separate.
  store.getState().switchLocation(near)
  store.getState().updateField('form.completed', true)
  const s = store.getState()
  return toMapData(s.cases.find((c) => c.id === caseId)!, s.locations.filter((l) => l.caseId === caseId))
}

function renderRich(over: Partial<Parameters<typeof MapScreen>[0]> = {}) {
  return render(<MapScreen viewerCaseId="x" mapData={buildRichMapData()} onEditIncident={vi.fn()} {...over} />)
}

describe('MapScreen — status + text filters', () => {
  it('starts unfiltered, with the count badge covering every plottable location', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    expect(screen.getByTestId('map-location-count')).toHaveTextContent('3 locations')
    expect(screen.getByText('3 Locations')).toBeInTheDocument()
  })

  it('a status pill narrows the pins, the sheet list and the sheet header together', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.click(screen.getByTestId('status-toggle-complete'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(1))
    expect(screen.getByText('1 Location')).toBeInTheDocument()
    expect(screen.queryByText('Loading dock')).not.toBeInTheDocument()
    expect(screen.getByText('Rear door')).toBeInTheDocument()
  })

  it('keeps the incident pin through a filter that matches no location', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('incident')).toHaveLength(1))
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'nothing matches' } })
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(0))
    expect(liveMarkers('incident')).toHaveLength(1)
  })

  it('searches name and business name case-insensitively', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'CONVENIENCE' } })
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(1))
    expect(screen.getByText('Rear door')).toBeInTheDocument()
  })

  it('counts both filter slots on the Clear pill and restores everything on clear', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.click(screen.getByTestId('status-toggle-started'))
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'dock' } })
    await waitFor(() => expect(screen.getByTestId('clear-filters-button')).toHaveTextContent('Clear (2)'))
    fireEvent.click(screen.getByTestId('clear-filters-button'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    expect(screen.getByTestId('clear-filters-button')).toHaveTextContent('Clear')
    expect(screen.getByTestId('map-search-input')).toHaveValue('')
  })

  it('drops a detail card whose location the filter just removed', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.click(screen.getByText('Loading dock'))
    expect(screen.getByText('Location Details')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('status-toggle-complete'))
    await waitFor(() => expect(screen.queryByText('Location Details')).not.toBeInTheDocument())
  })
})

describe('MapScreen — proximity', () => {
  it('activating narrows to the radius, draws the ring and reports "N of M"', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    // The Turf module is fetched on first activation.
    await waitFor(() => expect(mapInstance.addSource).toHaveBeenCalledWith('demo-proximity-ring', expect.anything()))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(2))
    expect(screen.getByTestId('map-location-count')).toHaveTextContent('2 of 3 locations')
    expect(screen.getByTestId('proximity-toggle-button')).toHaveTextContent('Proximity ON')
  })

  it('the radius presets widen and tighten the surviving set', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(2)) // 1 km default
    fireEvent.click(screen.getByTestId('radius-preset-5'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.click(screen.getByTestId('radius-preset-0.5'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(1))
  })

  it('deactivating restores every location and tears the ring down', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(2))
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    expect(mapInstance.removeSource).toHaveBeenCalledWith('demo-proximity-ring')
    expect(screen.getByTestId('map-location-count')).toHaveTextContent('3 locations')
  })

  it('a long press on the map activates proximity at the pressed coordinate', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { container } = renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    const canvas = container.querySelector('[data-map-canvas]')!
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 40 })
    vi.advanceTimersByTime(500)
    vi.useRealTimers()
    await waitFor(() => expect(screen.getByTestId('proximity-toggle-button')).toHaveTextContent('Proximity ON'))
    // unproject is stubbed to a coordinate ~11 km from every fixture pin, so nothing survives.
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(0))
  })

  it('stacks with the status filter — proximity narrows what the filter already left', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.click(screen.getByTestId('status-toggle-started'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(2))
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(1))
    expect(screen.getByTestId('map-location-count')).toHaveTextContent('1 of 2 locations')
  })
})

describe('MapScreen — camera visibility', () => {
  function buildWithCameras(): MapData {
    const store = createDemoStore()
    const caseId = store.getState().createCase({ caseNumber: 'PR25-7', displayName: 'Cams', unit: 'R' })
    const locId = store.getState().addLocation(caseId, {
      locationName: 'Rear door',
      gps: { lat: 43.6, lng: -79.6, source: 'geocoded' },
    })
    store.getState().switchLocation(locId)
    store.getState().updateField('form.cameras', [
      { id: 'cam-1', cameraName: 'Front entry', resolution: '1080p', recordingFps: '15' },
      { id: 'cam-2', cameraName: 'Till', resolution: '', recordingFps: '' },
    ])
    store.getState().setCameraGps('cam-1', { lat: 43.6001, lng: -79.6001, source: 'gps', capturedAt: '2026-07-31T12:00:00.000Z', accuracyM: 4 })
    store.getState().setCameraGps('cam-2', { lat: 43.6002, lng: -79.6002, source: 'gps', capturedAt: '2026-07-31T12:00:00.000Z' })
    const s = store.getState()
    return toMapData(s.cases.find((c) => c.id === caseId)!, s.locations.filter((l) => l.caseId === caseId))
  }

  it('plots no camera markers until the detail card toggle is pressed', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildWithCameras()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(1))
    expect(liveMarkers('camera')).toHaveLength(0)

    fireEvent.click(screen.getByText('Rear door'))
    expect(screen.getByTestId('detail-cameras-toggle')).toHaveTextContent('Show cameras (2)')
    expect(liveMarkers('camera')).toHaveLength(0)

    fireEvent.click(screen.getByTestId('detail-cameras-toggle'))
    await waitFor(() => expect(liveMarkers('camera')).toHaveLength(2))
    expect(screen.getByTestId('detail-cameras-toggle')).toHaveTextContent('Hide cameras (2)')
  })

  it('hides them again on a second press', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildWithCameras()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(1))
    fireEvent.click(screen.getByText('Rear door'))
    fireEvent.click(screen.getByTestId('detail-cameras-toggle'))
    await waitFor(() => expect(liveMarkers('camera')).toHaveLength(2))
    fireEvent.click(screen.getByTestId('detail-cameras-toggle'))
    await waitFor(() => expect(liveMarkers('camera')).toHaveLength(0))
  })

  it('hides them when the visitor goes back to the list — cameras follow the SELECTED location', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildWithCameras()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(1))
    fireEvent.click(screen.getByText('Rear door'))
    fireEvent.click(screen.getByTestId('detail-cameras-toggle'))
    await waitFor(() => expect(liveMarkers('camera')).toHaveLength(2))
    fireEvent.click(screen.getByText(/All Locations/))
    await waitFor(() => expect(liveMarkers('camera')).toHaveLength(0))
  })

  it('offers no toggle for a location with no geolocated cameras', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(1))
    fireEvent.click(screen.getByText('Rear door'))
    expect(screen.queryByTestId('detail-cameras-toggle')).not.toBeInTheDocument()
  })
})

describe('MapScreen — case switch', () => {
  it('clears filters, proximity and the selection when the viewer case changes', async () => {
    const { rerender } = render(<MapScreen viewerCaseId="a" mapData={buildRichMapData()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'dock' } })
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    await waitFor(() => expect(screen.getByTestId('proximity-toggle-button')).toHaveTextContent('Proximity ON'))

    rerender(<MapScreen viewerCaseId="b" mapData={buildRichMapData()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(screen.getByTestId('map-search-input')).toHaveValue(''))
    expect(screen.getByTestId('proximity-toggle-button')).toHaveTextContent('Proximity')
    expect(screen.getByTestId('clear-filters-button')).toHaveTextContent('Clear')
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
  })
})
