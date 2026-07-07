import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRef } from 'react'
import { render, waitFor } from '@testing-library/react'
import { MapCanvas, type MapCanvasHandle } from '@/features/demo/ui/screens/map/MapCanvas'
import type { MarkerDescriptor } from '@/features/demo/ui/screens/map/buildMarkers'

// jsdom has no WebGL — mapbox-gl is always mocked. Map + Marker are constructable (regular fns).
const { MapMock, mapInstance, MarkerMock, markerInstances } = vi.hoisted(() => {
  const markerInstances: Array<{ _el: HTMLElement; setLngLat: ReturnType<typeof vi.fn>; addTo: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }> = []
  const mapInstance = {
    on: vi.fn((evt: string, cb: () => void) => { if (evt === 'load') cb() }),
    remove: vi.fn(), flyTo: vi.fn(), fitBounds: vi.fn(), setCenter: vi.fn(), setZoom: vi.fn(),
  }
  const MapMock = vi.fn(function (_opts: { style?: string; container?: unknown }) { return mapInstance })
  const MarkerMock = vi.fn(function (opts: { element?: HTMLElement }) {
    const el = opts?.element as HTMLElement
    const inst = {
      _el: el,
      setLngLat: vi.fn(function () { return inst }),
      addTo: vi.fn(function () { return inst }),
      remove: vi.fn(),
      getElement: () => el,
    }
    markerInstances.push(inst)
    return inst
  })
  return { MapMock, mapInstance, MarkerMock, markerInstances }
})
vi.mock('mapbox-gl', () => ({ default: { Map: MapMock, Marker: MarkerMock, accessToken: '' } }))

beforeEach(() => {
  MapMock.mockClear()
  MarkerMock.mockClear()
  markerInstances.length = 0
  Object.values(mapInstance).forEach((fn) => fn.mockClear?.())
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
})
afterEach(() => vi.unstubAllEnvs())

const loc = (id: string, lng: number, lat: number): MarkerDescriptor => ({ id, lng, lat, kind: 'location', color: '#00BFFF' })
const inc = (id: string, lng: number, lat: number): MarkerDescriptor => ({ id, lng, lat, kind: 'incident', color: '#e53935' })

describe('MapCanvas — map lifecycle', () => {
  it('constructs a satellite-streets map in the container', async () => {
    render(<MapCanvas />)
    await waitFor(() => expect(MapMock).toHaveBeenCalledTimes(1))
    const opts = MapMock.mock.calls[0][0]
    expect(opts.style).toBe('mapbox://styles/mapbox/satellite-streets-v12')
    expect(opts.container).toBeTruthy()
  })

  it('removes the map on unmount', async () => {
    const { unmount } = render(<MapCanvas />)
    await waitFor(() => expect(MapMock).toHaveBeenCalledTimes(1))
    unmount()
    await waitFor(() => expect(mapInstance.remove).toHaveBeenCalledTimes(1))
  })

  it('renders the fallback and builds no map when the token is absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', '')
    const { getByText } = render(<MapCanvas />)
    expect(getByText(/map preview/i)).toBeInTheDocument()
    await Promise.resolve()
    expect(MapMock).not.toHaveBeenCalled()
  })

  it('flyTo on the ref drives map.flyTo', async () => {
    const ref = createRef<MapCanvasHandle>()
    render(<MapCanvas ref={ref} />)
    await waitFor(() => expect(MapMock).toHaveBeenCalledTimes(1))
    ref.current!.flyTo(-79.65, 43.61, 16)
    expect(mapInstance.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-79.65, 43.61], zoom: 16 }))
  })
})

describe('MapCanvas — markers + fit', () => {
  it('adds a marker per descriptor (with data-marker-id) and fits to ≥2 points', async () => {
    render(<MapCanvas markers={[loc('a', -79.6, 43.6), inc('case1', -79.7, 43.7)]} />)
    await waitFor(() => expect(MarkerMock).toHaveBeenCalledTimes(2))
    expect(markerInstances[0].setLngLat).toHaveBeenCalledWith([-79.6, 43.6])
    expect(markerInstances[0].addTo).toHaveBeenCalled()
    expect(markerInstances[0]._el.getAttribute('data-marker-id')).toBe('a')
    expect(mapInstance.fitBounds).toHaveBeenCalled()
  })

  it('centers + zooms on a single point', async () => {
    render(<MapCanvas markers={[loc('a', -79.6, 43.6)]} />)
    await waitFor(() => expect(MarkerMock).toHaveBeenCalledTimes(1))
    expect(mapInstance.setCenter).toHaveBeenCalledWith([-79.6, 43.6])
    expect(mapInstance.setZoom).toHaveBeenCalled()
  })

  it('removes its markers on unmount', async () => {
    const { unmount } = render(<MapCanvas markers={[loc('a', -79.6, 43.6)]} />)
    await waitFor(() => expect(MarkerMock).toHaveBeenCalledTimes(1))
    unmount()
    await waitFor(() => expect(markerInstances[0].remove).toHaveBeenCalled())
  })
})
