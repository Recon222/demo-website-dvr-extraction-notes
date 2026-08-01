import type { LngLat } from '@/features/demo/ui/screens/map/mapTokens'
import type { MapData } from '@/features/demo/ui/screens/map/mapData'
import { MAP_PIN_COLORS } from '@/features/demo/ui/screens/map/mapTokens'

/** A flat, render-agnostic marker spec — pure, so the map-marker logic is unit-tested without WebGL. */
export interface MarkerDescriptor {
  id: string
  lng: number
  lat: number
  kind: 'location' | 'incident'
  color: string
}

/** Project map data into marker descriptors: a status-coloured dot per located location, plus the
 *  red incident teardrop when the case has coordinates. */
export function buildMarkers(data: MapData): MarkerDescriptor[] {
  const markers: MarkerDescriptor[] = data.pins.map((p) => ({
    id: p.id,
    lng: p.lng,
    lat: p.lat,
    kind: 'location',
    color: MAP_PIN_COLORS[p.status],
  }))
  if (data.incident) {
    // Use the incident item id (= caseId) directly so a marker tap maps straight to its sheet item.
    // Case ids ('c*'/'seed-case') and location ids ('l*'/'seed-loc') are distinct, so no collision.
    markers.push({
      id: data.incident.id,
      lng: data.incident.lng,
      lat: data.incident.lat,
      kind: 'incident',
      color: MAP_PIN_COLORS.incident,
    })
  }
  return markers
}

/**
 * The points the CAMERA should frame — every plotted pin plus the incident.
 *
 * Separate from `buildMarkers` because the two answer different questions and take different
 * inputs (review R-1a). The phone splits them the same way: `useMapData` derives `cameraBounds`
 * from the status/text-FILTERED collection, while proximity narrows `displayCollection`, which
 * never reaches the `Camera` props (`MapHost.tsx:255-256`, `:492-493`). Framing the
 * post-proximity set instead would re-fit the camera away from the point the visitor just
 * long-pressed, and a lone survivor would teleport them to zoom 15.
 */
export function buildFitPoints(data: MapData): LngLat[] {
  const points: LngLat[] = data.pins.map((p) => [p.lng, p.lat])
  if (data.incident) points.push([data.incident.lng, data.incident.lat])
  return points
}
