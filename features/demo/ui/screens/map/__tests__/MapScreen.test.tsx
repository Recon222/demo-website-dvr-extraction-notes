import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { toMapData, type MapData } from '@/features/demo/ui/screens/map/mapData'

const { mapInstance, markerInstances } = vi.hoisted(() => {
  const markerInstances: Array<{ _el: HTMLElement }> = []
  const mapInstance = {
    on: vi.fn((evt: string, cb: () => void) => { if (evt === 'load') cb() }),
    remove: vi.fn(), flyTo: vi.fn(), fitBounds: vi.fn(), setCenter: vi.fn(), setZoom: vi.fn(),
  }
  return { mapInstance, markerInstances }
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
  store.getState().addLocation(caseId, { locationName: 'Rear door', gps: { lat: 43.61, lng: -79.61, source: 'geocoded' } })
  const s = store.getState()
  return toMapData(s.cases.find((c) => c.id === caseId)!, s.locations.filter((l) => l.caseId === caseId))
}

beforeEach(() => {
  markerInstances.length = 0
  mapInstance.flyTo.mockClear()
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
})
afterEach(() => vi.unstubAllEnvs())

describe('MapScreen — select + fly', () => {
  it('clicking a location row flies to it and opens detail mode', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} />)
    await waitFor(() => expect(markerInstances.length).toBeGreaterThan(0)) // map ready + markers added
    fireEvent.click(screen.getByText('Rear door'))
    expect(mapInstance.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-79.61, 43.61] }))
    expect(screen.getByText('Location Details')).toBeInTheDocument()
  })

  it('a marker click drives the same select path', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} />)
    await waitFor(() => expect(markerInstances.length).toBeGreaterThan(0))
    const locEl = markerInstances.find((m) => m._el.getAttribute('data-marker-kind') === 'location')!._el
    fireEvent.click(locEl)
    expect(mapInstance.flyTo).toHaveBeenCalled()
    expect(screen.getByText('Location Details')).toBeInTheDocument()
  })

  it('back returns to the list', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} />)
    await waitFor(() => expect(markerInstances.length).toBeGreaterThan(0))
    fireEvent.click(screen.getByText('Rear door'))
    expect(screen.getByText('Location Details')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/All Locations/))
    expect(screen.queryByText('Location Details')).not.toBeInTheDocument()
    expect(screen.getByText('1 Location')).toBeInTheDocument()
  })
})
