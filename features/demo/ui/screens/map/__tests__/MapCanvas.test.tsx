import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRef } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MAP_ENGINE_ERROR, MAP_LOAD_ERROR, MapCanvas, isTerminalMapError, type MapCanvasHandle } from '@/features/demo/ui/screens/map/MapCanvas'
import type { MarkerDescriptor } from '@/features/demo/ui/screens/map/buildMarkers'
import { generateRadiusCircle } from '@/features/demo/ui/screens/map/mapProximity'
import type { MapCameraMarker } from '@/features/demo/ui/screens/map/mapData'

// jsdom has no WebGL — mapbox-gl is always mocked. Map + Marker are constructable (regular fns).
// The map stub carries every method MapCanvas reaches for (bounds/zoom for clustering,
// source+layer for the proximity ring, unproject for long-press) plus a handler registry so a
// test can drive 'error' / 'moveend' the way the real map would.
const { MapMock, mapInstance, MarkerMock, markerInstances, handlers, sources, layers } = vi.hoisted(() => {
  const markerInstances: Array<{ _el: HTMLElement; setLngLat: ReturnType<typeof vi.fn>; addTo: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }> = []
  const handlers = new Map<string, Array<(payload?: unknown) => void>>()
  const sources = new Map<string, { data: unknown; setData: ReturnType<typeof vi.fn> }>()
  const layers = new Map<string, unknown>()
  const mapInstance = {
    on: vi.fn((evt: string, cb: (payload?: unknown) => void) => {
      const list = handlers.get(evt) ?? []
      list.push(cb)
      handlers.set(evt, list)
      if (evt === 'load') cb()
    }),
    remove: vi.fn(), flyTo: vi.fn(), fitBounds: vi.fn(), setCenter: vi.fn(), setZoom: vi.fn(),
    getBounds: vi.fn(() => ({ getWest: () => -180, getSouth: () => -85, getEast: () => 180, getNorth: () => 85 })),
    getZoom: vi.fn(() => 10),
    getCenter: vi.fn(() => ({ lng: -79.65, lat: 43.61 })),
    unproject: vi.fn(() => ({ lng: -79.7, lat: 43.7 })),
    addSource: vi.fn((id: string, spec: { data: unknown }) => {
      sources.set(id, { data: spec.data, setData: vi.fn() })
    }),
    getSource: vi.fn((id: string) => sources.get(id)),
    removeSource: vi.fn((id: string) => { sources.delete(id) }),
    addLayer: vi.fn((spec: { id: string }) => { layers.set(spec.id, spec) }),
    getLayer: vi.fn((id: string) => layers.get(id)),
    removeLayer: vi.fn((id: string) => { layers.delete(id) }),
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
  return { MapMock, mapInstance, MarkerMock, markerInstances, handlers, sources, layers }
})
vi.mock('mapbox-gl', () => ({ default: { Map: MapMock, Marker: MarkerMock, accessToken: '' } }))

/** Fire a registered map event the way mapbox would. */
const emit = (evt: string, payload?: unknown) => (handlers.get(evt) ?? []).forEach((cb) => cb(payload))

/**
 * The DEFAULT `on`: records every handler and fires `'load'` synchronously, i.e. a map that
 * boots. Reinstalled in `beforeEach` (review R-8) — `mockClear()` wipes CALLS but keeps any
 * `mockImplementation` a previous test installed, so a never-loads override used by one error
 * test silently leaked into every test declared after it, disabling `ready` for all of them.
 * That leak is what made the transient-error assertion vacuous. `mockReset()` is not a
 * substitute: it would strip this default too.
 */
const defaultOn = (evt: string, cb: (payload?: unknown) => void) => {
  const list = handlers.get(evt) ?? []
  list.push(cb)
  handlers.set(evt, list)
  if (evt === 'load') cb()
}

/** A map that never emits `'load'` — a style/token failure. Opt-in, per test. */
const neverLoads = (evt: string, cb: (payload?: unknown) => void) => {
  const list = handlers.get(evt) ?? []
  list.push(cb)
  handlers.set(evt, list)
}

beforeEach(() => {
  MapMock.mockClear()
  MarkerMock.mockClear()
  markerInstances.length = 0
  handlers.clear()
  sources.clear()
  layers.clear()
  Object.values(mapInstance).forEach((fn) => fn.mockClear?.())
  mapInstance.on.mockImplementation(defaultOn)
  mapInstance.getZoom.mockReturnValue(10)
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

const loc = (id: string, lng: number, lat: number): MarkerDescriptor => ({ id, lng, lat, kind: 'location', color: '#00BFFF' })
const inc = (id: string, lng: number, lat: number): MarkerDescriptor => ({ id, lng, lat, kind: 'incident', color: '#e53935' })

/** Ten pins within a few metres of each other — supercluster aggregates them below zoom 14. */
const tightPins = Array.from({ length: 10 }, (_, i) => loc(`l${i}`, -79.6 + i * 0.0002, 43.6 + i * 0.0002))

/** Markers of a kind that are still ON the map — a re-plot calls `.remove()` on the old set. */
const elFor = (kind: string) =>
  markerInstances.filter((m) => m._el.getAttribute('data-marker-kind') === kind && m.remove.mock.calls.length === 0)

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

  it('plots each pin exactly ONCE for a settled mount — no churn from its own state commits', async () => {
    // The stable-empty-default contract (`NO_MARKERS`/`NO_CAMERAS`). `cameras` is deliberately
    // OMITTED: a `= []` default parameter mints a fresh array on every render, which makes the
    // render callback unstable and re-plots every marker on each of this component's own commits
    // (ready → revealed → cover-unmount). Counting live markers cannot see that — the churn
    // removes and recreates, so the live total is right while the work is doubled. Assert the
    // SETTLED TOTALS instead: constructions and removals.
    render(<MapCanvas markers={[loc('a', -79.6, 43.6), loc('b', -79.9, 43.9)]} />)
    await waitFor(() => expect(screen.getByTestId('map-loading-cover')).toHaveStyle({ opacity: '0' }))
    await waitFor(() => expect(MarkerMock).toHaveBeenCalledTimes(2))
    expect(MarkerMock).toHaveBeenCalledTimes(2)
    expect(markerInstances.filter((m) => m.remove.mock.calls.length > 0)).toHaveLength(0)
  })

  it('removes its markers on unmount', async () => {
    const { unmount } = render(<MapCanvas markers={[loc('a', -79.6, 43.6)]} />)
    await waitFor(() => expect(MarkerMock).toHaveBeenCalledTimes(1))
    unmount()
    await waitFor(() => expect(markerInstances[0].remove).toHaveBeenCalled())
  })
})

describe('MapCanvas — clustering', () => {
  it('collapses nearby location pins into one cluster bubble at the current zoom', async () => {
    render(<MapCanvas markers={tightPins} />)
    await waitFor(() => expect(elFor('cluster')).toHaveLength(1))
    expect(elFor('location')).toHaveLength(0)
    expect(elFor('cluster')[0]._el.getAttribute('data-cluster-count')).toBe('10')
  })

  it('leaves the incident out of the cluster', async () => {
    render(<MapCanvas markers={[...tightPins, inc('c1', -79.6, 43.6)]} />)
    await waitFor(() => expect(elFor('cluster')).toHaveLength(1))
    expect(elFor('incident')).toHaveLength(1)
  })

  it('breaks the pins apart once the camera is past the cluster max zoom', async () => {
    mapInstance.getZoom.mockReturnValue(16)
    render(<MapCanvas markers={tightPins} />)
    await waitFor(() => expect(elFor('location')).toHaveLength(10))
    expect(elFor('cluster')).toHaveLength(0)
    mapInstance.getZoom.mockReturnValue(10)
  })

  it('re-plots on every camera move, because clustering depends on the viewport', async () => {
    render(<MapCanvas markers={tightPins} />)
    await waitFor(() => expect(elFor('cluster')).toHaveLength(1))
    mapInstance.getZoom.mockReturnValue(16)
    emit('moveend')
    await waitFor(() => expect(elFor('location')).toHaveLength(10))
    mapInstance.getZoom.mockReturnValue(10)
  })

  it('tapping a cluster flies to its expansion zoom rather than selecting anything', async () => {
    const onMarkerPress = vi.fn()
    render(<MapCanvas markers={tightPins} onMarkerPress={onMarkerPress} />)
    await waitFor(() => expect(elFor('cluster')).toHaveLength(1))
    fireEvent.click(elFor('cluster')[0]._el)
    expect(onMarkerPress).not.toHaveBeenCalled()
    expect(mapInstance.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: expect.any(Array), zoom: expect.any(Number) }),
    )
  })
})

describe('MapCanvas — cluster keyboard access (review R-7b)', () => {
  it('expands on Enter and on Space, not on other keys', async () => {
    render(<MapCanvas markers={tightPins} />)
    await waitFor(() => expect(elFor('cluster')).toHaveLength(1))
    const bubble = elFor('cluster')[0]._el

    fireEvent.keyDown(bubble, { key: 'Tab' })
    expect(mapInstance.flyTo).not.toHaveBeenCalled()

    fireEvent.keyDown(bubble, { key: 'Enter' })
    await waitFor(() => expect(mapInstance.flyTo).toHaveBeenCalledTimes(1))
    fireEvent.keyDown(bubble, { key: ' ' })
    await waitFor(() => expect(mapInstance.flyTo).toHaveBeenCalledTimes(2))
  })
})

describe('MapCanvas — camera markers', () => {
  const camera: MapCameraMarker = { id: 'l1:cam-1', locationId: 'l1', cameraName: 'Front entry', lng: -79.62, lat: 43.62, resolution: '1080p' }

  it('plots the supplied cameras alongside the pins, un-clustered', async () => {
    render(<MapCanvas markers={tightPins} cameras={[camera]} />)
    await waitFor(() => expect(elFor('camera')).toHaveLength(1))
    expect(elFor('cluster')).toHaveLength(1)
  })

  it('never re-fits when a fresh markers array carries the SAME points (a search keystroke)', async () => {
    const { rerender } = render(<MapCanvas markers={[loc('a', -79.6, 43.6), loc('b', -79.9, 43.9)]} />)
    await waitFor(() => expect(mapInstance.fitBounds).toHaveBeenCalledTimes(1))
    // A filter keystroke mints a new array with byte-identical survivors.
    rerender(<MapCanvas markers={[loc('a', -79.6, 43.6), loc('b', -79.9, 43.9)]} />)
    await waitFor(() => expect(MarkerMock).toHaveBeenCalled())
    expect(mapInstance.fitBounds).toHaveBeenCalledTimes(1)
  })

  it('re-fits when the point VALUES actually change', async () => {
    const { rerender } = render(<MapCanvas markers={[loc('a', -79.6, 43.6), loc('b', -79.9, 43.9)]} />)
    await waitFor(() => expect(mapInstance.fitBounds).toHaveBeenCalledTimes(1))
    rerender(<MapCanvas markers={[loc('a', -79.6, 43.6), loc('b', -78.0, 44.5)]} />)
    await waitFor(() => expect(mapInstance.fitBounds).toHaveBeenCalledTimes(2))
  })

  it('frames `fitPoints` and ignores the plotted markers when both are supplied', async () => {
    // The proximity case: markers narrow to one survivor, fitPoints keeps the pre-proximity pair.
    const fitPoints = [[-79.6, 43.6], [-79.9, 43.9]] as const
    const { rerender } = render(<MapCanvas markers={[loc('a', -79.6, 43.6), loc('b', -79.9, 43.9)]} fitPoints={fitPoints} />)
    await waitFor(() => expect(mapInstance.fitBounds).toHaveBeenCalledTimes(1))
    rerender(<MapCanvas markers={[loc('a', -79.6, 43.6)]} fitPoints={fitPoints} />)
    await waitFor(() => expect(MarkerMock).toHaveBeenCalled())
    // No re-fit, and specifically no single-point teleport.
    expect(mapInstance.fitBounds).toHaveBeenCalledTimes(1)
    expect(mapInstance.setZoom).not.toHaveBeenCalled()
  })

  it('never re-fits the camera when only the camera markers change', async () => {
    // The pin set keeps its identity across the rerender (MapScreen memoises `buildMarkers`), so
    // the ONLY change is the camera list.
    const pins = [loc('a', -79.6, 43.6), loc('b', -79.9, 43.9)]
    const { rerender } = render(<MapCanvas markers={pins} />)
    await waitFor(() => expect(mapInstance.fitBounds).toHaveBeenCalledTimes(1))
    rerender(<MapCanvas markers={pins} cameras={[camera]} />)
    await waitFor(() => expect(elFor('camera')).toHaveLength(1))
    expect(mapInstance.fitBounds).toHaveBeenCalledTimes(1)
  })

  it('an open callout SURVIVES a map move — cameras are not part of the moveend re-plot', async () => {
    render(<MapCanvas markers={tightPins} cameras={[camera]} />)
    await waitFor(() => expect(elFor('camera')).toHaveLength(1))
    const before = elFor('camera')[0]._el
    fireEvent.click(before.querySelector('[data-camera-button]')!)
    expect(before.querySelector<HTMLElement>('[data-camera-callout]')!.style.display).toBe('block')

    // A pan (or a settling flyTo) re-clusters the pins…
    mapInstance.getZoom.mockReturnValue(16)
    emit('moveend')
    await waitFor(() => expect(elFor('location')).toHaveLength(10))
    mapInstance.getZoom.mockReturnValue(10)

    // …and leaves the camera marker — and its open bubble — exactly as they were.
    const after = elFor('camera')
    expect(after).toHaveLength(1)
    expect(after[0]._el).toBe(before)
    expect(before.querySelector<HTMLElement>('[data-camera-callout]')!.style.display).toBe('block')
    expect(before.querySelector('[data-camera-button]')!.getAttribute('aria-expanded')).toBe('true')
  })

  it('a camera tap toggles its callout without selecting', async () => {
    const onMarkerPress = vi.fn()
    render(<MapCanvas markers={[]} cameras={[camera]} onMarkerPress={onMarkerPress} />)
    await waitFor(() => expect(elFor('camera')).toHaveLength(1))
    const el = elFor('camera')[0]._el
    fireEvent.click(el.querySelector('[data-camera-button]')!)
    expect(el.querySelector<HTMLElement>('[data-camera-callout]')!.style.display).toBe('block')
    expect(onMarkerPress).not.toHaveBeenCalled()
  })
})

describe('MapCanvas — proximity ring', () => {
  const ring = generateRadiusCircle([-79.6, 43.6], 1)

  it('adds a fill + line layer over one geojson source when a ring arrives', async () => {
    render(<MapCanvas markers={[loc('a', -79.6, 43.6)]} proximityRing={ring} />)
    await waitFor(() => expect(mapInstance.addSource).toHaveBeenCalledTimes(1))
    const layerIds = mapInstance.addLayer.mock.calls.map((c) => (c[0] as { id: string }).id)
    expect(layerIds).toEqual(['demo-proximity-ring-fill', 'demo-proximity-ring-line'])
    const paintOf = (call: number) =>
      (mapInstance.addLayer.mock.calls[call][0] as unknown as { paint: Record<string, unknown> }).paint
    expect(paintOf(0)['fill-color']).toBe('rgba(0, 191, 255, 0.15)')
    expect(paintOf(1)).toMatchObject({ 'line-color': '#00BFFF', 'line-width': 2, 'line-opacity': 0.85 })
  })

  it('updates the existing source rather than re-adding it when the ring changes', async () => {
    const { rerender } = render(<MapCanvas markers={[]} proximityRing={ring} />)
    await waitFor(() => expect(mapInstance.addSource).toHaveBeenCalledTimes(1))
    const bigger = generateRadiusCircle([-79.6, 43.6], 5)
    rerender(<MapCanvas markers={[]} proximityRing={bigger} />)
    await waitFor(() => expect(sources.get('demo-proximity-ring')!.setData).toHaveBeenCalledWith(bigger))
    expect(mapInstance.addSource).toHaveBeenCalledTimes(1)
  })

  it('tears the layers and source down when the ring clears', async () => {
    const { rerender } = render(<MapCanvas markers={[]} proximityRing={ring} />)
    await waitFor(() => expect(mapInstance.addSource).toHaveBeenCalledTimes(1))
    rerender(<MapCanvas markers={[]} proximityRing={null} />)
    await waitFor(() => expect(mapInstance.removeSource).toHaveBeenCalledWith('demo-proximity-ring'))
    expect(mapInstance.removeLayer.mock.calls.map((c) => c[0])).toEqual([
      'demo-proximity-ring-fill',
      'demo-proximity-ring-line',
    ])
  })
})

describe('MapCanvas — long press', () => {
  it('reports the un-projected coordinate after the hold', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onLongPress = vi.fn()
    const { container } = render(<MapCanvas markers={[]} onLongPress={onLongPress} />)
    await waitFor(() => expect(MapMock).toHaveBeenCalled())
    const canvas = container.querySelector('[data-map-canvas]')!
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 120, isPrimary: true })
    vi.advanceTimersByTime(500)
    expect(onLongPress).toHaveBeenCalledWith(-79.7, 43.7)
    vi.useRealTimers()
  })

  it('cancels on release before the threshold', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onLongPress = vi.fn()
    const { container } = render(<MapCanvas markers={[]} onLongPress={onLongPress} />)
    await waitFor(() => expect(MapMock).toHaveBeenCalled())
    const canvas = container.querySelector('[data-map-canvas]')!
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 120, isPrimary: true })
    vi.advanceTimersByTime(200)
    fireEvent.pointerUp(canvas, { clientX: 100, clientY: 120 })
    vi.advanceTimersByTime(600)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('ignores a secondary contact — only the primary pointer may arm the timer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onLongPress = vi.fn()
    const { container } = render(<MapCanvas markers={[]} onLongPress={onLongPress} />)
    await waitFor(() => expect(MapMock).toHaveBeenCalled())
    const canvas = container.querySelector('[data-map-canvas]')!
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 120, isPrimary: false })
    vi.advanceTimersByTime(600)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('ignores a hold on a marker — holding a pin must not ACTIVATE proximity', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onLongPress = vi.fn()
    const { container } = render(<MapCanvas markers={[loc('a', -79.6, 43.6)]} onLongPress={onLongPress} />)
    await waitFor(() => expect(elFor('location')).toHaveLength(1))
    const canvas = container.querySelector('[data-map-canvas]')!
    const pin = elFor('location')[0]._el
    // Markers live inside the canvas container in production (`Marker.addTo` →
    // `map.getCanvasContainer()`), so their pointerdown reaches this handler by bubbling.
    canvas.appendChild(pin)
    fireEvent.pointerDown(pin, { clientX: 100, clientY: 120, isPrimary: true })
    vi.advanceTimersByTime(600)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("ignores a hold on mapbox's own chrome (attribution / logo)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onLongPress = vi.fn()
    const { container } = render(<MapCanvas markers={[]} onLongPress={onLongPress} />)
    await waitFor(() => expect(MapMock).toHaveBeenCalled())
    const canvas = container.querySelector('[data-map-canvas]')! as HTMLElement
    const ctrl = document.createElement('a')
    ctrl.className = 'mapboxgl-ctrl mapboxgl-ctrl-attrib-inner'
    ctrl.textContent = 'Improve this map'
    canvas.appendChild(ctrl)
    fireEvent.pointerDown(ctrl, { clientX: 100, clientY: 120, isPrimary: true })
    vi.advanceTimersByTime(600)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('cancels when the pointer travels — a drag is a pan, not a long press', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onLongPress = vi.fn()
    const { container } = render(<MapCanvas markers={[]} onLongPress={onLongPress} />)
    await waitFor(() => expect(MapMock).toHaveBeenCalled())
    const canvas = container.querySelector('[data-map-canvas]')!
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 120, isPrimary: true })
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 })
    vi.advanceTimersByTime(600)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

describe('MapCanvas — loading + error states', () => {
  it('mounts a cover that reveals once the map has loaded', async () => {
    render(<MapCanvas markers={[]} />)
    const cover = screen.getByTestId('map-loading-cover')
    await waitFor(() => expect(cover).toHaveStyle({ opacity: '0' }))
  })

  it('shows the retry overlay when mapbox fails BEFORE the first load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mapInstance.on.mockImplementation(neverLoads)
    render(<MapCanvas markers={[]} />)
    await waitFor(() => expect(handlers.get('error')).toBeTruthy())
    emit('error', { error: new Error('style load failed') })
    expect(await screen.findByTestId('map-error-overlay')).toHaveTextContent(MAP_LOAD_ERROR)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('does NOT cover a working map when a transient tile error arrives after load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(<MapCanvas markers={[]} />)
    // The map really did load — without this the component takes the PRE-load branch and the
    // negative assertion below passes for the wrong reason (review R-8).
    await waitFor(() => expect(screen.getByTestId('map-loading-cover')).toHaveStyle({ opacity: '0' }))
    emit('error', { error: new Error('tile 404') })
    // POSITIVE assertion on the branch actually taken — a negative `not.toBeInTheDocument()` is
    // satisfied by its first synchronous check no matter which way the guard went.
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('[demo/map] mapbox error ignored after load:', expect.anything()),
    )
    expect(screen.queryByTestId('map-error-overlay')).not.toBeInTheDocument()
    warn.mockRestore()
  })

  it.each([401, 403, 429])('escalates a terminal HTTP %i after load to the overlay', async (status) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<MapCanvas markers={[]} />)
    await waitFor(() => expect(screen.getByTestId('map-loading-cover')).toHaveStyle({ opacity: '0' }))
    emit('error', { error: Object.assign(new Error('AJAXError'), { status }) })
    expect(await screen.findByTestId('map-error-overlay')).toHaveTextContent(MAP_LOAD_ERROR)
    expect(screen.getByTestId('map-retry-button')).toBeInTheDocument()
    expect(error).toHaveBeenCalledWith('[demo/map] mapbox reported a terminal error after load:', expect.anything())
    error.mockRestore()
  })

  it('escalates a revoked access token after load — its round-trip always lands post-load', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<MapCanvas markers={[]} />)
    await waitFor(() => expect(screen.getByTestId('map-loading-cover')).toHaveStyle({ opacity: '0' }))
    emit('error', { error: new Error('A valid Mapbox access token is required') })
    expect(await screen.findByTestId('map-error-overlay')).toBeInTheDocument()
    error.mockRestore()
  })

  it('classifies terminal vs ignorable causes', () => {
    expect(isTerminalMapError(Object.assign(new Error('x'), { status: 401 }))).toBe(true)
    expect(isTerminalMapError(Object.assign(new Error('x'), { status: 403 }))).toBe(true)
    expect(isTerminalMapError(Object.assign(new Error('x'), { status: 429 }))).toBe(true)
    expect(isTerminalMapError(new Error('WebGL context lost'))).toBe(true)
    // Ignorable: a missed tile, and anything unrecognisable.
    expect(isTerminalMapError(Object.assign(new Error('x'), { status: 404 }))).toBe(false)
    expect(isTerminalMapError(new Error('Failed to fetch tile'))).toBe(false)
    expect(isTerminalMapError(undefined)).toBe(false)
    expect(isTerminalMapError('boom')).toBe(false)
  })

  it('a plain mount still plots — the never-loads override must never leak forward', async () => {
    render(<MapCanvas markers={[loc('a', -79.6, 43.6)]} />)
    await waitFor(() => expect(elFor('location')).toHaveLength(1))
  })

  it('routes a throwing Map constructor into the overlay with the ENGINE copy', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    // Stands in for the whole boot ladder: a rejected mapbox-gl/mapCluster chunk and a
    // constructor that throws on a malformed token all reject the same async IIFE, and none of
    // them can reach `map.on('error')` because no Map instance exists.
    MapMock.mockImplementationOnce(() => {
      throw new Error('Invalid access token')
    })
    render(<MapCanvas markers={[]} />)
    expect(await screen.findByTestId('map-error-overlay')).toHaveTextContent(MAP_ENGINE_ERROR)
    expect(screen.getByTestId('map-retry-button')).toBeInTheDocument()
    expect(warn).toHaveBeenCalledWith(
      '[demo/map] the map engine failed to load — showing the retry overlay:',
      expect.any(Error),
    )
    warn.mockRestore()
  })

  it('Retry after a boot failure rebuilds the map and clears the overlay', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    MapMock.mockImplementationOnce(() => {
      throw new Error('Invalid access token')
    })
    render(<MapCanvas markers={[]} />)
    await screen.findByTestId('map-error-overlay')
    fireEvent.click(screen.getByTestId('map-retry-button'))
    await waitFor(() => expect(MapMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByTestId('map-error-overlay')).not.toBeInTheDocument())
    warn.mockRestore()
  })

  it('Retry rebuilds the map and clears the overlay', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mapInstance.on.mockImplementation(neverLoads)
    render(<MapCanvas markers={[]} />)
    await waitFor(() => expect(handlers.get('error')).toBeTruthy())
    emit('error', { error: new Error('style load failed') })
    await screen.findByTestId('map-error-overlay')
    mapInstance.on.mockImplementation(defaultOn)
    fireEvent.click(screen.getByTestId('map-retry-button'))
    await waitFor(() => expect(MapMock).toHaveBeenCalledTimes(2))
    expect(mapInstance.remove).toHaveBeenCalled()
    expect(screen.queryByTestId('map-error-overlay')).not.toBeInTheDocument()
    warn.mockRestore()
  })
})

describe('MapCanvas — handle', () => {
  it('reports the current camera centre', async () => {
    const ref = createRef<MapCanvasHandle>()
    render(<MapCanvas ref={ref} markers={[]} />)
    await waitFor(() => expect(MapMock).toHaveBeenCalled())
    expect(ref.current!.getCenter()).toEqual([-79.65, 43.61])
  })
})
