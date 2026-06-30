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
    markers.push({
      id: `incident-${data.incident.id}`,
      lng: data.incident.lng,
      lat: data.incident.lat,
      kind: 'incident',
      color: MAP_PIN_COLORS.incident,
    })
  }
  return markers
}
