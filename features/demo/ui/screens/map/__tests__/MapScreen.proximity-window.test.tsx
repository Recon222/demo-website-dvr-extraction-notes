import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { toMapData, type MapData } from '@/features/demo/ui/screens/map/mapData'

/**
 * F62 — the chunk-load WINDOW, held open.
 *
 * Its own file for the same reason `MapScreen.proximity-chunk.test.tsx` is: this mocks the
 * proximity module so its `import()` NEVER SETTLES, and every other MapScreen case needs the real
 * Turf. The sibling file mocks it to REJECT (the failure path, review R-2); this one mocks it to
 * hang, which is the path between "the visitor asked" and "the filter exists".
 *
 * Without a hanging mock this state is unobservable: the dynamic import resolves within the same
 * tick in jsdom, so the window closes before any assertion can see it — and that is precisely why
 * it shipped.
 */

const { mapInstance } = vi.hoisted(() => {
  const mapInstance = {
    on: vi.fn((evt: string, cb: () => void) => { if (evt === 'load') cb() }),
    remove: vi.fn(), flyTo: vi.fn(), fitBounds: vi.fn(), setCenter: vi.fn(), setZoom: vi.fn(),
    getBounds: vi.fn(() => ({ getWest: () => -180, getSouth: () => -85, getEast: () => 180, getNorth: () => 85 })),
    getZoom: vi.fn(() => 16),
    getCenter: vi.fn(() => ({ lng: -79.65, lat: 43.61 })),
    unproject: vi.fn(() => ({ lng: -79.6, lat: 43.6 })),
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

/** The chunk that is still in flight. Never settles, so the window stays open for the whole test. */
vi.mock('@/features/demo/ui/screens/map/mapProximity', () => new Promise<never>(() => {}))

import { MapScreen } from '@/features/demo/ui/screens/map/MapScreen'

function buildMapData(): MapData {
  const store = createDemoStore()
  const caseId = store.getState().createCase({ caseNumber: 'PR25-9', displayName: 'Plaza series', unit: 'R' })
  store.getState().addLocation(caseId, { locationName: 'Rear door', gps: { lat: 43.6, lng: -79.6, source: 'geocoded' } })
  store.getState().addLocation(caseId, { locationName: 'Loading dock', gps: { lat: 43.606, lng: -79.6, source: 'geocoded' } })
  store.getState().addLocation(caseId, { locationName: 'Far annex', gps: { lat: 43.63, lng: -79.6, source: 'geocoded' } })
  const s = store.getState()
  return toMapData(s.cases.find((c) => c.id === caseId)!, s.locations.filter((l) => l.caseId === caseId))
}

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test'))
afterEach(() => vi.unstubAllEnvs())

/** Ask for proximity the way the sheet does — the route that reaches the ON branch. */
function requestProximity() {
  fireEvent.click(screen.getByTestId('map-open-filters'))
  fireEvent.click(screen.getByTestId('filter-proximity'))
}

describe('MapScreen — proximity ON but not yet filtering (F62)', () => {
  it('shows NO chip while the Turf chunk is in flight — the map claims no filter it is not running', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} onEditIncident={vi.fn()} />)
    requestProximity()

    // The switch has committed; the chunk has not arrived. Settle every already-resolved
    // microtask so this is the steady state, not a race we happened to win.
    await waitFor(() => expect(screen.getByTestId('filter-proximity')).toHaveAttribute('aria-checked', 'true'))
    expect(screen.queryByTestId('proximity-chip')).not.toBeInTheDocument()
    // …and specifically not the "N of M" claim it used to print over an unringed map.
    expect(screen.queryByTestId('proximity-chip-summary')).not.toBeInTheDocument()
  })

  it('keeps the SWITCH on — the request is honest, only the filter claim is withheld', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} onEditIncident={vi.fn()} />)
    requestProximity()

    // Gating the switch on `proximityResult` too would spring it back under the visitor's finger.
    await waitFor(() => expect(screen.getByTestId('filter-proximity')).toHaveAttribute('aria-checked', 'true'))
    // The radius chips ride the request for the same reason: they configure what was asked for.
    expect(screen.getByTestId('filter-radius-1')).toBeInTheDocument()
  })

  it('leaves every location plotted and the counts unnarrowed while it waits', async () => {
    render(<MapScreen viewerCaseId="x" mapData={buildMapData()} onEditIncident={vi.fn()} />)
    requestProximity()

    await waitFor(() => expect(screen.getByTestId('filter-proximity')).toHaveAttribute('aria-checked', 'true'))
    // `display` is still the pre-proximity set, so the sheet's subtitle must say so rather than
    // reporting a narrowing that has not happened.
    expect(screen.getAllByText('3 locations').length).toBeGreaterThan(0)
    expect(screen.queryByText(/of 3 locations shown/)).not.toBeInTheDocument()
  })
})
