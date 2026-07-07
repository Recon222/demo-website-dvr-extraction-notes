import type { DemoCase, DemoLocation } from '@/features/demo/engine/types'
import { selectLocationMapStatus, type LocationMapStatus } from '@/features/demo/engine/store/selectors'

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
  coordinateSource: 'gps' | 'geocoded' | 'manual'
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

const joinAddress = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(', ')

export function toMapData(viewerCase: DemoCase | null, locations: DemoLocation[]): MapData {
  if (!viewerCase) {
    return { pins: [], incident: null, items: [], statusCounts: { started: 0, working: 0, complete: 0 } }
  }

  const ic = viewerCase.incidentCoordinates
  const incident: MapIncident | null = ic
    ? { id: viewerCase.id, caseNumber: viewerCase.caseNumber, displayName: viewerCase.displayName || undefined, lng: ic.lng, lat: ic.lat }
    : null

  // Only locations WITH coordinates plot (typed-without-pick / imported stay coord-less — the honest
  // "no coordinate" case). Status is computed once per location and reused for the pin + the sheet row.
  const located = locations.filter((l) => l.gps)
  const statusById = new Map(located.map((l) => [l.id, selectLocationMapStatus(l)]))

  const pins: MapPin[] = located.map((l) => ({ id: l.id, lng: l.gps!.lng, lat: l.gps!.lat, status: statusById.get(l.id)! }))

  const statusCounts = { started: 0, working: 0, complete: 0 }
  for (const p of pins) statusCounts[p.status]++

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
      address: joinAddress([l.streetAddress, l.city]),
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
    })
  }

  return { pins, incident, items, statusCounts }
}
