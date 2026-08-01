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
    cameras: [],
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
