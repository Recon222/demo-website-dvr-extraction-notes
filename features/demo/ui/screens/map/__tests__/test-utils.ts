import { vi } from 'vitest'
import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import type {
  IncidentSheetItem,
  LocationSheetItem,
  MapCameraMarker,
  MapData,
  SheetItem,
} from '@/features/demo/ui/screens/map/mapData'
import { countStatuses } from '@/features/demo/ui/screens/map/mapData'

/**
 * Canonical map fixtures (review R-24).
 *
 * Before this, five hand-rolled `LocationSheetItem` literals and two `MapData` builders lived
 * across the map suites, and P6.1's ONE field add (`cameras`) had to be applied by hand to five
 * of them. The repo already learned this on the phone side — CLAUDE.md's "update the factory
 * FIRST, then prefer it over inline literals so a future field add is a one-file change".
 *
 * Every factory takes an overrides object, so a call site only states what it cares about.
 */

export function sheetLocation(over: Partial<LocationSheetItem> = {}): LocationSheetItem {
  // `cameraTotal` defaults to the plotted count so a fixture is coherent unless it deliberately
  // says otherwise (the "some cameras have no GPS fix" case).
  const cameras = over.cameras ?? []
  return {
    kind: 'location',
    id: 'l1',
    locationName: 'Rear door',
    businessName: '',
    address: '',
    status: 'started',
    coord: [-79.6, 43.6],
    streetAddress: '',
    city: '',
    requesterName: '',
    requesterBadge: '',
    requesterUnit: '',
    requesterPhone: '',
    requesterEmail: '',
    locationContact: '',
    locationPhone: '',
    coordinateSource: 'geocoded',
    cameras,
    cameraTotal: cameras.length,
    ...over,
  }
}

export function sheetIncident(over: Partial<IncidentSheetItem> = {}): IncidentSheetItem {
  return {
    kind: 'incident',
    id: 'c1',
    caseNumber: 'PR25-1',
    businessName: '',
    streetAddress: '',
    city: '',
    address: '',
    coord: [-79.5, 43.5],
    ...over,
  }
}

export function cameraMarker(over: Partial<MapCameraMarker> = {}): MapCameraMarker {
  return {
    id: 'l1:cam-1',
    locationId: 'l1',
    cameraName: 'Front entry',
    lng: -79.61,
    lat: 43.61,
    ...over,
  }
}

/**
 * A `MapData` whose `pins` / `incident` / `statusCounts` are DERIVED from the rows, so a fixture
 * can never describe a projection `toMapData` could not have produced.
 */
export function mapDataFrom(items: SheetItem[]): MapData {
  const locations = items.filter((i): i is LocationSheetItem => i.kind === 'location')
  const incident = items.find((i): i is IncidentSheetItem => i.kind === 'incident')
  return {
    pins: locations.map((l) => ({ id: l.id, lng: l.coord[0], lat: l.coord[1], status: l.status })),
    incident: incident
      ? { id: incident.id, caseNumber: incident.caseNumber, lng: incident.coord[0], lat: incident.coord[1] }
      : null,
    items,
    statusCounts: countStatuses(items),
  }
}

/** Shorthand for the common "n locations, one status each" fixture. */
export function locationsWithStatuses(statuses: LocationMapStatus[]): LocationSheetItem[] {
  return statuses.map((status, i) => sheetLocation({ id: `l${i + 1}`, locationName: `Loc ${i + 1}`, status }))
}

// ---- mapbox-gl module stub -------------------------------------------------------------------

/**
 * A complete, CHAINABLE `mapbox-gl` default-export stub (review MR-5).
 *
 * The two `DemoExperience.*` suites carried `Marker: vi.fn()` — a constructor returning
 * `undefined`. `MapCanvas` calls `new Marker({...}).setLngLat(...).addTo(map)`, so that throws
 * `Cannot read properties of undefined (reading 'setLngLat')` the moment markers are plotted.
 * Both files are green today only by accident: neither contains a single `await` or `waitFor`, so
 * the render returns before the map's async boot resolves and the plot never runs. The first
 * `await` any author adds turns ~15 tests red with a TypeError that reads like a production bug
 * in `MapCanvas` rather than a stub gap.
 *
 * Lives here — R-24's home for map fixtures — so the marker-chain contract has ONE definition and
 * a third suite cannot re-derive a shorter one.
 */
/** One stubbed `mapboxgl.Marker`. The chain members are the contract this stub exists to hold. */
export interface StubMarker {
  element?: HTMLElement
  setLngLat: ReturnType<typeof vi.fn>
  addTo: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  getElement(): HTMLElement | undefined
}

export function createMapboxModuleStub() {
  const markerInstances: StubMarker[] = []
  const mapInstance = {
    on: vi.fn((evt: string, cb: () => void) => {
      if (evt === 'load') cb()
    }),
    remove: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    getBounds: vi.fn(() => ({ getWest: () => -180, getSouth: () => -85, getEast: () => 180, getNorth: () => 85 })),
    getZoom: vi.fn(() => 16),
    getCenter: vi.fn(() => ({ lng: -79.65, lat: 43.61 })),
    unproject: vi.fn(() => ({ lng: -79.7, lat: 43.7 })),
    addSource: vi.fn(),
    getSource: vi.fn(() => undefined),
    removeSource: vi.fn(),
    addLayer: vi.fn(),
    getLayer: vi.fn(() => undefined),
    removeLayer: vi.fn(),
  }
  const Marker = vi.fn(function (opts?: { element?: HTMLElement }) {
    const inst: StubMarker = {
      element: opts?.element,
      // Chainable, exactly as the real Marker is — `.setLngLat(...).addTo(map)`.
      setLngLat: vi.fn(function () {
        return inst
      }),
      addTo: vi.fn(function () {
        return inst
      }),
      remove: vi.fn(),
      getElement: () => opts?.element,
    }
    markerInstances.push(inst)
    return inst
  })
  const Map = vi.fn(function () {
    return mapInstance
  })
  const stub = { module: { default: { Map, Marker, accessToken: '' } }, mapInstance, Map, Marker, markerInstances }
  ;(globalThis as MapboxStubHost)[MAPBOX_STUB_KEY] = stub
  return stub
}

/**
 * Where the created stub is parked so a suite can read it back.
 *
 * `globalThis`, deliberately, not a module-level `let`: a `vi.mock` factory's `await import()`
 * resolves through vitest's mock registry, which is a DIFFERENT module instance from the one the
 * suite imports statically — a module-level singleton is written by one and read as `null` by
 * the other (found the hard way). The global crosses that boundary; the symbol keeps it from
 * colliding with anything else.
 */
const MAPBOX_STUB_KEY = Symbol.for('demo.test.mapboxModuleStub')
type MapboxStubHost = { [MAPBOX_STUB_KEY]?: ReturnType<typeof createMapboxModuleStub> }

/**
 * The stub the `vi.mock('mapbox-gl')` factory built.
 *
 * Needed because the stub's `addTo` is a no-op — a stubbed Marker never reaches the DOM — so
 * "did the map plot?" has to be asked of the constructor, not of `document`.
 */
export function latestMapboxStub(): ReturnType<typeof createMapboxModuleStub> {
  const stub = (globalThis as MapboxStubHost)[MAPBOX_STUB_KEY]
  if (!stub) throw new Error('latestMapboxStub(): no stub created — is vi.mock("mapbox-gl") wired to createMapboxModuleStub?')
  return stub
}
