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
  // Clear EVERY stub, not the three that happened to be asserted (review R-26c): a call count
  // surviving into the next test is the same class of leak as R-8's implementation leak.
  Object.values(mapInstance).forEach((fn) => fn.mockClear?.())
  mapInstance.on.mockImplementation((evt: string, cb: () => void) => {
    if (evt === 'load') cb()
  })
  // Past CLUSTER_MAX_ZOOM so the tiny fixtures plot as individual pins unless a test says otherwise.
  mapInstance.getZoom.mockReturnValue(16)
  // ~13 km from every fixture pin unless a test aims the long press somewhere else. Restored
  // HERE and not just cleared, because `mockClear` above keeps the implementation: a
  // `mockReturnValue` set inside one case would otherwise steer the next one's long press
  // (the same leak class R-26c closed for call counts).
  mapInstance.unproject.mockReturnValue({ lng: -79.7, lat: 43.7 })
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

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

/**
 * Three located locations with distinct statuses + names, plus (by default) the incident.
 *
 * `withIncident: false` matters for the empty-sheet cases: the incident row is deliberately
 * exempt from the status/text filters (`map-data-service.ts:108-113`), so a zero-match SEARCH on
 * a case that has one never empties the sheet at all. A case with no incident coordinates is the
 * common one, and the only one where the filter can empty the list.
 */
function buildRichMapData(opts: { withIncident?: boolean } = {}): MapData {
  const store = createDemoStore()
  const caseId = store.getState().createCase({
    caseNumber: 'PR25-9',
    displayName: 'Plaza series',
    unit: 'R',
    ...(opts.withIncident === false ? {} : { incidentCoordinates: { lat: 43.6, lng: -79.6, source: 'geocoded' as const } }),
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

/**
 * Activate proximity the only way the visitor still can (U5.2).
 *
 * The `proximity-toggle-button` pill and the four `radius-preset-*` pills moved into
 * `MapFiltersSheet` (U5.3), so long-press is the surviving on-map route — which is also the
 * phone's: `MapControls` has had no proximity toggle since PR #127, and the chip's ✕ is the
 * only on-map way back off. Aiming `unproject` is what makes a long press land near the
 * fixtures instead of the default ~13 km away.
 */
function longPressMap(container: HTMLElement, at?: { lng: number; lat: number }) {
  if (at) mapInstance.unproject.mockReturnValue(at)
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const canvas = container.querySelector('[data-map-canvas]')!
  fireEvent.pointerDown(canvas, { clientX: 40, clientY: 40, isPrimary: true })
  vi.advanceTimersByTime(500)
  vi.useRealTimers()
}

/** Inside the ring: near the two clustered fixtures, ~2.5 km from the far annex. */
const NEAR_THE_PINS = { lng: -79.6, lat: 43.6 }

/**
 * U5.2 collapsed the chrome: the status pills, the Clear pill, the proximity toggle, the four
 * radius presets and the `map-location-count` pill are gone (matrix "pill-chrome deletion"), and
 * `MapFiltersSheet` (U5.3) is where they land. Everything below that used to be driven through one
 * of those controls is now driven through a route that still exists — the search field, a map
 * long-press, the chip's ✕, or the sheet's own Clear button — and keeps its original assertion.
 *
 * What has NO surviving route is parked as `it.todo` naming U5.3, never deleted: a todo is loud in
 * the reporter, a deletion is silent. That is this repo's own idiom for a pin whose surface does
 * not exist yet (`ui/__tests__/palette-contrast.test.ts:740`, and plan §5 U0.5's "land them
 * `it.todo` and un-todo in U5.2").
 */
describe('MapScreen — status + text filters', () => {
  it('starts unfiltered, with the sheet header covering every plottable location', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    // The count moved out of the deleted `map-location-count` pill; the sheet header is where a
    // no-proximity total is still stated.
    expect(screen.getByText('3 Locations')).toBeInTheDocument()
  })

  it('a text filter narrows the pins, the sheet list and the sheet header together', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'Rear' } })
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(1))
    expect(screen.getByText('1 Location')).toBeInTheDocument()
    expect(screen.queryByText('Loading dock')).not.toBeInTheDocument()
    expect(screen.getByText('Rear door')).toBeInTheDocument()
  })

  // The STATUS half of the same pipeline. `mapFilters.test.ts` pins `matchesStatusFilter` and
  // `toggleStatus` as functions; what is parked is the screen-level wiring, which U5.3 restores
  // through the sheet's status chips (`onStatusToggle` emits the full array).
  it.todo('(U5.3) a status chip narrows the pins, the sheet list and the sheet header together')

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

  it('renders the whole bar over the token-less fallback panel — and admits proximity is unreachable there', async () => {
    // `features/demo/CLAUDE.md`: a missing Mapbox token must never break a flow. `MapControls` is
    // a SIBLING of `MapCanvas` in `MapScreen`, not a child, so the chrome paints over
    // `[data-map-fallback]` exactly as it paints over tiles.
    vi.unstubAllEnvs()
    const { container } = renderRich()
    expect(container.querySelector('[data-map-fallback]')).toBeInTheDocument()
    expect(screen.getByTestId('map-search-pill')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'Rear' } })
    expect(screen.getByTestId('map-search-input')).toHaveValue('Rear')

    // The honest half. `MapCanvas` returns the fallback BEFORE the `[data-map-canvas]` surface, so
    // there is nothing to long-press — and long-press is the only proximity route U5.2 leaves.
    // A visitor with no token could previously reach proximity through the toggle pill; between
    // U5.2 and U5.3 they cannot. U5.3's sheet Toggle restores it token-less.
    expect(container.querySelector('[data-map-canvas]')).not.toBeInTheDocument()
    expect(screen.queryByTestId('proximity-chip')).not.toBeInTheDocument()
  })

  it('renders NO filters button at all until a sheet is wired — no affordance that lies', async () => {
    // `MapScreen` deliberately omits `onOpenFilters` until U5.3 mounts `MapFiltersSheet`
    // (§49a: "a mount without a handler simply has no button, rather than a button that swallows
    // every press"). Search stays whole, so the bar is a working search bar rather than a broken
    // filter bar.
    const { container } = renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    expect(screen.queryByTestId('map-open-filters')).not.toBeInTheDocument()
    expect(screen.getByTestId('map-search-input')).toBeInTheDocument()

    // …and that stays true with something to count, which is the case a "just render it disabled"
    // regression would sail through.
    longPressMap(container, NEAR_THE_PINS)
    await waitFor(() => expect(screen.getByTestId('proximity-chip')).toBeInTheDocument())
    expect(screen.queryByTestId('map-filter-badge')).not.toBeInTheDocument()
  })

  // `MapScreen`'s badge derivation — `filters.statuses.length + (proximityActive ? 1 : 0)` — is
  // pinned inside `MapControls` (rendering, label, threshold, fill) but not yet AT the screen,
  // because the screen paints no filters button until U5.3 supplies `onOpenFilters`. U5.3 un-todos
  // this by asserting three statuses + proximity reads 4 while `countActiveFilters` reads 3.
  it.todo('(U5.3) the filters badge counts active statuses + proximity, never the search text')

  // The Clear pill went into the sheet's footer as "Clear All". The sheet's EMPTY-state clear
  // route survives and is pinned below ("names the FILTER, offers Clear, …"); what is parked is
  // the two-slot count that used to ride on the pill's own label.
  it.todo('(U5.3) counts both filter slots on the sheet footer`s Clear All, and restores on clear')

  it('drops a detail card whose location the filter just removed', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.click(screen.getByText('Loading dock'))
    expect(screen.getByText('Location Details')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'Rear' } })
    await waitFor(() => expect(screen.queryByText('Location Details')).not.toBeInTheDocument())
  })
})

describe('MapScreen — proximity', () => {
  it('activating narrows to the radius, draws the ring and reports "N of M" on the chip', async () => {
    const { container } = renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    longPressMap(container, NEAR_THE_PINS)
    // The Turf module is fetched on first activation.
    await waitFor(() => expect(mapInstance.addSource).toHaveBeenCalledWith('demo-proximity-ring', expect.anything()))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(2))
    // The "N of M" the deleted count pill used to carry now rides on the proximity chip — the
    // phone's own home for it, and the only place it is stated at all.
    expect(screen.getByTestId('proximity-chip')).toHaveTextContent('1 km · 2 of 3')
  })

  // The four radius presets moved into the sheet, so there is no on-map route to a radius change.
  // `mapProximity.test.ts` still pins the radius maths; what is parked is the screen wiring.
  it.todo('(U5.3) the sheet`s radius chips widen and tighten the surviving set')

  it('the chip ✕ restores every location and tears the ring down', async () => {
    const { container } = renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    longPressMap(container, NEAR_THE_PINS)
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(2))
    fireEvent.click(screen.getByTestId('proximity-chip-dismiss'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    expect(mapInstance.removeSource).toHaveBeenCalledWith('demo-proximity-ring')
    // Off means gone: the chip is the whole on-map indication that proximity is running.
    expect(screen.queryByTestId('proximity-chip')).not.toBeInTheDocument()
  })

  it('a long press on the map activates proximity at the pressed coordinate', async () => {
    const { container } = renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    longPressMap(container)
    await waitFor(() => expect(screen.getByTestId('proximity-chip')).toBeInTheDocument())
    // unproject defaults to a coordinate ~13 km from every fixture pin, so nothing survives.
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(0))
  })

  it('stacks with the text filter — proximity narrows what the filter already left', async () => {
    const { container } = renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    // "ar" matches "Rear door" (0 km) and "Far annex" (3.3 km) but not "Loading dock", so the
    // text filter leaves 2 and the 1 km ring then drops one — "1 of 2" only exists if both
    // stages ran, in that order.
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'ar' } })
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(2))
    longPressMap(container, NEAR_THE_PINS)
    await waitFor(() => expect(screen.getByTestId('proximity-chip')).toHaveTextContent('1 km · 1 of 2'))
  })
})

describe('MapScreen — the sheet never lies about why it is empty (review R-6)', () => {
  it('names the FILTER, offers Clear, and keeps a badge that contradicts "no data"', async () => {
    // No incident: it is exempt from the filters, so a case that has one never empties.
    render(<MapScreen viewerCaseId="x" mapData={buildRichMapData({ withIncident: false })} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'nothing matches' } })

    const empty = await screen.findByTestId('map-sheet-empty')
    expect(empty).toHaveAttribute('data-empty-reason', 'filters')
    expect(empty).toHaveTextContent('No locations match your filters.')
    expect(empty).not.toHaveTextContent('add an address')
    // The `map-location-count` pill that used to carry the contradiction ("No locations match")
    // is deleted with the rest of the pill chrome. It was insurance against the sheet's OWN copy
    // lying, and review R-6 fixed that copy — which is the sentence being read one line above.

    fireEvent.click(screen.getByTestId('map-sheet-clear-filters'))
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    expect(screen.queryByTestId('map-sheet-empty')).not.toBeInTheDocument()
  })

  it('names PROXIMITY when the radius is what emptied it, and the chip shows "0 of 3"', async () => {
    const { container } = renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    // Long-press far from every fixture pin (the unproject default is ~13 km away).
    longPressMap(container)

    const empty = await screen.findByTestId('map-sheet-empty')
    expect(empty).toHaveAttribute('data-empty-reason', 'proximity')
    expect(empty).toHaveTextContent('No locations inside the proximity radius')
    expect(screen.queryByTestId('map-sheet-clear-filters')).not.toBeInTheDocument()
    expect(screen.getByTestId('proximity-chip')).toHaveTextContent('1 km · 0 of 3')
  })

  it('keeps the no-data sentence when a search runs on a nothing-plottable case (MR-3)', async () => {
    const store = createDemoStore()
    const caseId = store.getState().createCase({ caseNumber: 'PR25-0', displayName: 'Empty', unit: 'R' })
    store.getState().addLocation(caseId, { locationName: 'Typed, never picked' }) // no gps
    const st = store.getState()
    const empty = toMapData(st.cases.find((c) => c.id === caseId)!, st.locations.filter((l) => l.caseId === caseId))
    render(<MapScreen viewerCaseId="x" mapData={empty} onEditIncident={vi.fn()} />)

    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'rear' } })

    // The filter is not why this sheet is empty — it was empty before anyone typed. Blaming the
    // filter would offer a Clear button that cannot bring back rows that never existed.
    const node = await screen.findByTestId('map-sheet-empty')
    expect(node).toHaveAttribute('data-empty-reason', 'no-data')
    expect(node).toHaveTextContent('No located locations yet')
    expect(screen.queryByTestId('map-sheet-clear-filters')).not.toBeInTheDocument()
  })

  it('still says "no data" when the case genuinely has nothing plotted', async () => {
    const store = createDemoStore()
    const caseId = store.getState().createCase({ caseNumber: 'PR25-0', displayName: 'Empty', unit: 'R' })
    store.getState().addLocation(caseId, { locationName: 'Typed, never picked' }) // no gps
    const s = store.getState()
    const empty = toMapData(s.cases.find((c) => c.id === caseId)!, s.locations.filter((l) => l.caseId === caseId))
    render(<MapScreen viewerCaseId="x" mapData={empty} onEditIncident={vi.fn()} />)

    const node = await screen.findByTestId('map-sheet-empty')
    expect(node).toHaveAttribute('data-empty-reason', 'no-data')
    expect(node).toHaveTextContent('No located locations yet')
    // Nothing filtering, so no chip either — the chrome is a bare search bar over an empty map.
    expect(screen.queryByTestId('proximity-chip')).not.toBeInTheDocument()
  })
})

describe('MapScreen — the camera is never yanked (review R-1)', () => {
  it('does not re-fit when a search keystroke leaves the surviving set unchanged', async () => {
    renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    const before = mapInstance.fitBounds.mock.calls.length
    // "Kim's Convenience" matches one row; typing further characters of the SAME match keeps the
    // survivors byte-identical, so the camera must not move.
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'kim' } })
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(1))
    const afterFirstNarrow = mapInstance.fitBounds.mock.calls.length
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'kim\'' } })
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: "kim's" } })
    await waitFor(() => expect(screen.getByTestId('map-search-input')).toHaveValue("kim's"))
    expect(mapInstance.fitBounds.mock.calls.length).toBe(afterFirstNarrow)
    expect(afterFirstNarrow).toBeGreaterThanOrEqual(before)
  })

  it('does not re-fit on proximity activation', async () => {
    const { container } = renderRich()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    const before = mapInstance.fitBounds.mock.calls.length
    const beforeSingle = mapInstance.setZoom.mock.calls.length

    longPressMap(container, NEAR_THE_PINS)
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(2))

    // Neither the bbox fit nor the single-survivor centre+zoom teleport may fire.
    expect(mapInstance.fitBounds.mock.calls.length).toBe(before)
    expect(mapInstance.setZoom.mock.calls.length).toBe(beforeSingle)
  })

  // The radius half of the same guard: tightening 1 km → 0.5 km must not re-frame either. No
  // on-map radius control survives U5.2's collapse, so the second half waits for the sheet.
  it.todo('(U5.3) does not re-fit on a radius change')
})

/**
 * The anchor chain — `handleProximityToggle`'s ON branch — has NO caller between U5.2 and U5.3.
 *
 * It only ever ran when proximity was switched on without a coordinate, and the one control that
 * did that (the "Proximity" pill) moved into `MapFiltersSheet`. A long press always supplies its
 * own centre, so it reaches `handleLongPress` instead and never derives one. The code is
 * untouched and still reachable through the chip ✕'s OFF branch; U5.3's "Filter by radius" Toggle
 * is what brings the ON branch — and `PROXIMITY_CENTRED_ON_VIEW` with it — back into reach.
 *
 * Parked, not deleted: three real behaviours (R-18a/R-18b) with a named owner and a live route
 * waiting for them one package away.
 */
describe('MapScreen — the proximity anchor chain (review R-18)', () => {
  it.todo('(U5.3) anchors on the first plotted row, silently — a visible row explains itself')
  it.todo("(U5.3) falls back to the map's own centre when nothing is plotted, and SAYS so")
  it.todo('(U5.3) KEEPS a long-pressed centre across off→on — it must not re-derive an anchor')
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
    const { container, rerender } = render(<MapScreen viewerCaseId="a" mapData={buildRichMapData()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'dock' } })
    longPressMap(container, NEAR_THE_PINS)
    await waitFor(() => expect(screen.getByTestId('proximity-chip')).toBeInTheDocument())

    rerender(<MapScreen viewerCaseId="b" mapData={buildRichMapData()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(screen.getByTestId('map-search-input')).toHaveValue(''))
    // Proximity off is now visible as the chip's absence, and the radius reset comes back with it
    // when the chip returns.
    expect(screen.queryByTestId('proximity-chip')).not.toBeInTheDocument()
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))
  })

  it('collapses the sheet back to peek and drops the detail card (review R-23)', async () => {
    const { container, rerender } = render(<MapScreen viewerCaseId="a" mapData={buildRichMapData()} onEditIncident={vi.fn()} />)
    await waitFor(() => expect(liveMarkers('location')).toHaveLength(3))

    // Selecting a row raises the detent to at least 1 and opens the detail card.
    fireEvent.click(screen.getByText('Loading dock'))
    expect(screen.getByText('Location Details')).toBeInTheDocument()
    expect(container.querySelector('[data-map-sheet]')).toHaveAttribute('data-snap', '1')

    rerender(<MapScreen viewerCaseId="b" mapData={buildRichMapData()} onEditIncident={vi.fn()} />)
    // `setSnapIndex(0)` is the user-visible half of the reset: a case switch must not leave the
    // new case's map hidden behind a sheet the visitor opened for the old one.
    await waitFor(() => expect(container.querySelector('[data-map-sheet]')).toHaveAttribute('data-snap', '0'))
    expect(screen.queryByText('Location Details')).not.toBeInTheDocument()
  })
})
