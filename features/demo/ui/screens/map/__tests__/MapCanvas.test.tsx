import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRef } from 'react'
import { render, waitFor } from '@testing-library/react'
import { MapCanvas, type MapCanvasHandle } from '@/features/demo/ui/screens/map/MapCanvas'

// jsdom has no WebGL — mapbox-gl is always mocked. We assert constructor/method calls, not pixels.
const { MapMock, mapInstance } = vi.hoisted(() => {
  const mapInstance = {
    on: vi.fn((evt: string, cb: () => void) => { if (evt === 'load') cb() }),
    remove: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
  }
  // Regular function (not an arrow) so it is constructable via `new mapboxgl.Map(...)`.
  const MapMock = vi.fn(function (_opts: { style?: string; container?: unknown }) {
    return mapInstance
  })
  return { MapMock, mapInstance }
})
vi.mock('mapbox-gl', () => ({ default: { Map: MapMock, Marker: vi.fn(), accessToken: '' } }))

beforeEach(() => {
  MapMock.mockClear()
  Object.values(mapInstance).forEach((fn) => fn.mockClear?.())
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
})
afterEach(() => vi.unstubAllEnvs())

describe('MapCanvas', () => {
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
    // give any (incorrect) async effect a tick to (not) run
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
