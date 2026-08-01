import type { DemoCase, DemoLocation } from '@/features/demo/engine/types'
import { formatAddress } from '@/features/demo/engine/logic/address-format'
import { selectLocationMapStatus, type LocationMapStatus } from '@/features/demo/engine/store/selectors'
import { hasCapturedCoordinates } from '@/features/demo/engine/logic/coordinates'
import type { GpsSource } from '@/features/demo/engine/types'

/**
 * Map data projection — the viewer case + its locations → everything the map and sheet render. Pure
 * (UI-layer mapper, like screenData.ts), so it's unit-tested without the map. Per-case today; an
 * aggregate `toMapDataAll` is the additive All-Cases hook.
 */

export interface MapPin {
  id: string
  lng: number
  lat: number
  status: LocationMapStatus
}

export interface MapIncident {
  id: string
  caseNumber: string
  displayName?: string
  lng: number
  lat: number
}

/**
 * One plottable camera of a location — the demo's form of the phone's `featureType: 'camera'`
 * GeoJSON features (`camerasToGeoJSONFeatures`, geojson-service.ts:254-300).
 *
 * `id` is the phone's composite `${locationId}:${cameraId}` (geojson-service.ts:283-285):
 * `CameraEntry.id` is only unique inside one location's array, and these markers are keyed
 * globally on the map.
 *
 * `resolution` / `accuracyM` are emitted truthy-only, exactly as the phone does, so the callout
 * can rely on key presence rather than re-testing for the empty string.
 */
export interface MapCameraMarker {
  id: string
  locationId: string
  cameraName: string
  resolution?: string
  lng: number
  lat: number
  accuracyM?: number
}

export interface LocationSheetItem {
  kind: 'location'
  id: string
  locationName: string
  businessName: string
  address: string
  status: LocationMapStatus
  coord: [number, number] // [lng, lat]
  streetAddress: string
  city: string
  requesterName: string
  requesterBadge: string
  requesterUnit: string
  requesterPhone: string
  requesterEmail: string
  locationContact: string
  locationPhone: string
  coordinateSource: GpsSource
  /** This location's geolocated cameras (P3.7 per-camera GPS). Empty when none has a fix —
   *  which is what hides the detail card's cameras toggle, phone LocationDetailCard.tsx:509. */
  cameras: MapCameraMarker[]
}

export interface IncidentSheetItem {
  kind: 'incident'
  id: string
  caseNumber: string
  displayName?: string
  businessName: string
  streetAddress: string
  city: string
  address: string
  coord: [number, number] // [lng, lat]
}

export type SheetItem = LocationSheetItem | IncidentSheetItem

export interface MapData {
  pins: MapPin[]
  incident: MapIncident | null
  items: SheetItem[]
  statusCounts: { started: number; working: number; complete: number }
}

/** Incident street+city. Deliberately NOT street-type-abbreviated: on the phone only the
 *  LOCATION address goes through `formatAddress` (submission.tsx:75, NewLocationModal.tsx:149) —
 *  the incident scene keeps whatever the case creator typed. */
const joinAddress = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(', ')

/** Status tally over a set of sheet rows. The incident carries no status, so only location rows
 *  count — the same rule the phone applies in `computeStatusCounts` (sheet-data-service.ts). */
export function countStatuses(items: readonly SheetItem[]): { started: number; working: number; complete: number } {
  const counts = { started: 0, working: 0, complete: 0 }
  for (const item of items) {
    if (item.kind === 'location') counts[item.status]++
  }
  return counts
}

/** "N locations" — cameras and the incident pin never inflate it (phone MapHost.tsx:250-254). */
export function countLocations(items: readonly SheetItem[]): number {
  return items.filter((i) => i.kind === 'location').length
}

/**
 * Project a location's cameras into plottable markers. Gated on `hasCapturedCoordinates`, not on
 * presence — same policy as the location/incident pins above, and the same guard the phone runs
 * per camera (geojson-service.ts:260-271) so a zeroed fix never plots at Null Island.
 */
export function toCameraMarkers(loc: DemoLocation): MapCameraMarker[] {
  const markers: MapCameraMarker[] = []
  for (const cam of loc.form.cameras) {
    if (!hasCapturedCoordinates(cam.gps)) continue
    const gps = cam.gps!
    markers.push({
      id: `${loc.id}:${cam.id}`,
      locationId: loc.id,
      cameraName: cam.cameraName,
      lng: gps.lng,
      lat: gps.lat,
      ...(cam.resolution ? { resolution: cam.resolution } : {}),
      ...(gps.accuracyM != null ? { accuracyM: gps.accuracyM } : {}),
    })
  }
  return markers
}

export function toMapData(viewerCase: DemoCase | null, locations: DemoLocation[]): MapData {
  if (!viewerCase) {
    return { pins: [], incident: null, items: [], statusCounts: { started: 0, working: 0, complete: 0 } }
  }

  // PLOTTING GATE — `hasCapturedCoordinates`, not plain presence (review R-7, discharging §49g's
  // trigger, which named "P3.7 or P6.1, whichever touches plotting first" and was left pointing
  // at a package that had already shipped). P3.7 introduced the policy and wired the case sheet,
  // the PDF camera row and the notes formatter to it; the map was the one consumer left reading
  // presence, so a single stored pair had two behaviours — suppressed in the sheet and the
  // document, plotted in the Gulf of Guinea on the map beside them. The demo has no zero-init
  // artifact (coordinates only arrive via a capture, a geocode or `parseCoordinate`, which
  // correctly accepts a typed 0/0), so this is consistency between consumers rather than a
  // fabricated position — but three consumers silently disagreeing about one record is exactly
  // what the policy exists to prevent.
  const ic = viewerCase.incidentCoordinates
  const incident: MapIncident | null = hasCapturedCoordinates(ic)
    ? { id: viewerCase.id, caseNumber: viewerCase.caseNumber, displayName: viewerCase.displayName || undefined, lng: ic.lng, lat: ic.lat }
    : null

  // Only locations WITH a captured position plot (typed-without-pick / imported stay coord-less —
  // the honest "no coordinate" case). Status is computed once per location and reused for the pin
  // + the sheet row.
  const located = locations.filter((l) => hasCapturedCoordinates(l.gps))
  const statusById = new Map(located.map((l) => [l.id, selectLocationMapStatus(l)]))

  const pins: MapPin[] = located.map((l) => ({ id: l.id, lng: l.gps!.lng, lat: l.gps!.lat, status: statusById.get(l.id)! }))

  const items: SheetItem[] = []
  if (incident && ic) {
    items.push({
      kind: 'incident',
      id: viewerCase.id,
      caseNumber: viewerCase.caseNumber,
      displayName: viewerCase.displayName || undefined,
      businessName: viewerCase.incidentBusinessName,
      streetAddress: viewerCase.incidentStreetAddress,
      city: viewerCase.incidentCity,
      address: joinAddress([viewerCase.incidentStreetAddress, viewerCase.incidentCity]),
      coord: [ic.lng, ic.lat],
    })
  }
  for (const l of located) {
    items.push({
      kind: 'location',
      id: l.id,
      locationName: l.locationName,
      businessName: l.businessName,
      address: formatAddress('', l.streetAddress, l.city),
      status: statusById.get(l.id)!,
      coord: [l.gps!.lng, l.gps!.lat],
      streetAddress: l.streetAddress,
      city: l.city,
      requesterName: l.requesterName,
      requesterBadge: l.requesterBadge,
      requesterUnit: l.requesterUnit,
      requesterPhone: l.requesterPhone,
      requesterEmail: l.requesterEmail,
      locationContact: l.locationContact,
      locationPhone: l.locationPhone,
      coordinateSource: l.gps!.source,
      cameras: toCameraMarkers(l),
    })
  }

  return { pins, incident, items, statusCounts: countStatuses(items) }
}
