import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { toMapData, type MapData } from '@/features/demo/ui/screens/map/mapData'

/**
 * The poisoned-chunk suite (review R-2). Lives in its OWN file because it mocks the proximity
 * module to reject at import time — the whole point — and every other MapScreen test needs the
 * real Turf.
 */

const { mapInstance } = vi.hoisted(() => {
  const mapInstance = {
    on: vi.fn((evt: string, cb: () => void) => { if (evt === 'load') cb() }),
    remove: vi.fn(), flyTo: vi.fn(), fitBounds: vi.fn(), setCenter: vi.fn(), setZoom: vi.fn(),
    getBounds: vi.fn(() => ({ getWest: () => -180, getSouth: () => -85, getEast: () => 180, getNorth: () => 85 })),
    getZoom: vi.fn(() => 16),
    getCenter: vi.fn(() => ({ lng: -79.65, lat: 43.61 })),
    unproject: vi.fn(() => ({ lng: -79.7, lat: 43.7 })),
    addSource: vi.fn(), getSource: vi.fn(() => undefined), removeSource: vi.fn(),
    addLayer: vi.fn(), getLayer: vi.fn(() => undefined), removeLayer: vi.fn(),
  }
  return { mapInstance }
})
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(function () { return mapInstance }),
    Marker: vi.fn(function (opts: { element?: HTMLElement }) {
      const el = opts?.element as HTMLElement
      const inst = { _el: el, setLngLat: vi.fn(function () { return inst }), addTo: vi.fn(function () { return inst }), remove: vi.fn(), getElement: () => el }
      return inst
    }),
    accessToken: '',
  },
}))

// The chunk that never arrives. Throwing from the factory makes `import()` reject exactly as a
// webpack `ChunkLoadError` does.
vi.mock('@/features/demo/ui/screens/map/mapProximity', () => {
  throw new Error('ChunkLoadError: Loading chunk 454 failed')
})

import { MapScreen } from '@/features/demo/ui/screens/map/MapScreen'

function buildMapData(): MapData {
  const store = createDemoStore()
  const caseId = store.getState().createCase({ caseNumber: 'PR25-1', displayName: 'Kim B&E', unit: 'R' })
  store.getState().addLocation(caseId, { locationName: 'Rear door', gps: { lat: 43.6, lng: -79.6, source: 'geocoded' } })
  store.getState().addLocation(caseId, { locationName: 'Loading dock', gps: { lat: 43.606, lng: -79.6, source: 'geocoded' } })
  store.getState().addLocation(caseId, { locationName: 'Far annex', gps: { lat: 43.63, lng: -79.6, source: 'geocoded' } })
  const s = store.getState()
  return toMapData(s.cases.find((c) => c.id === caseId)!, s.locations.filter((l) => l.caseId === caseId))
}

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.unstubAllEnvs()
  warn.mockRestore()
})

const renderScreen = () =>
  render(<MapScreen viewerCaseId="x" mapData={buildMapData()} onEditIncident={vi.fn()} />)

describe('MapScreen — the proximity chunk fails to load', () => {
  it('leaves the control OFF instead of asserting "Proximity ON" over an unfiltered map', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('proximity-toggle-button')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))

    await waitFor(() =>
      expect(screen.getByTestId('proximity-toggle-button')).toHaveTextContent('Proximity'),
    )
    const toggle = screen.getByTestId('proximity-toggle-button')
    expect(toggle).not.toHaveTextContent('Proximity ON')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    // No radius presets, because there is no radius to choose.
    expect(screen.queryByTestId('radius-preset-1')).not.toBeInTheDocument()
  })

  it('tells the visitor, out loud and in the console', async () => {
    renderScreen()
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    expect(await screen.findByText(/Proximity analysis couldn't load/)).toBeInTheDocument()
    expect(warn).toHaveBeenCalledWith(
      '[demo/map] the proximity module failed to load — proximity stays off:',
      expect.anything(),
    )
  })

  it('never draws a ring, and never claims a narrowed count', async () => {
    renderScreen()
    await waitFor(() => expect(screen.getByTestId('map-location-count')).toHaveTextContent('3 locations'))
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    await waitFor(() => expect(warn).toHaveBeenCalled())
    expect(mapInstance.addSource).not.toHaveBeenCalled()
    expect(screen.getByTestId('map-location-count')).toHaveTextContent('3 locations')
  })

  it('RE-ATTEMPTS on the next press — the rejected promise must not be parked in the ref', async () => {
    renderScreen()
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1))
    // Dismiss the first notice so the second one is unambiguous.
    fireEvent.click(screen.getByText(/Proximity analysis couldn't load/))

    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    // A second breadcrumb can only exist if a second import was attempted: a memoised rejected
    // promise has already run its single `.catch` and would stay silent forever.
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(2))
    expect(screen.getByTestId('proximity-toggle-button')).toHaveAttribute('aria-pressed', 'false')
  })
})
