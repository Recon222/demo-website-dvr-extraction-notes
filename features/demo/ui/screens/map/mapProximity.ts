import turfCircle from '@turf/circle'
import turfDistance from '@turf/distance'
import { point } from '@turf/helpers'
import type { Feature, Polygon } from 'geojson'
import { countLocations, narrowProjection, type MapData, type SheetItem } from '@/features/demo/ui/screens/map/mapData'

/**
 * Proximity analysis — the demo's port of the phone's `proximity-service.ts` + `useProximity.ts`,
 * running the SAME Turf calls (`@turf/distance` Haversine, `@turf/circle` polygon) at the same
 * presets.
 *
 * Individual `@turf/*` packages, not the `@turf/turf` monolith — the phone made the same choice
 * (`proximity-service.ts:10-13`, there because the bundle transitively pulls ESM-only packages
 * Jest can't transform; here because the monolith is ~600 kB of geodesy for two functions).
 *
 * Loaded through a dynamic `import()` from `MapScreen` on first activation, so Turf never
 * reaches the demo's own chunk.
 */

/** Phone `generateRadiusCircle`'s default vertex count (proximity-service.ts:82). */
export const RING_STEPS = 64

export type ProximityRing = Feature<Polygon>

export interface ProximityResult {
  /** The projection with everything outside the radius removed. */
  data: MapData
  /** The ring polygon to draw. */
  ring: ProximityRing
  /** Rows inside the radius — LOCATIONS only, so the incident can't inflate the
   *  "N of M" badge (phone useProximity.ts:58-62). */
  locationCount: number
}

/**
 * Phone `getLocationsWithinRadius` (proximity-service.ts:31-65): Haversine distance per feature,
 * keep `distance <= radiusKm`.
 *
 * The phone's one bypass — camera features always pass, so a selected location's cameras don't
 * vanish when a camera's own fix falls outside the ring — is structural here rather than a
 * branch: the demo carries cameras INSIDE their `LocationSheetItem` (`mapData.ts`
 * `MapCameraMarker[]`), so a surviving location brings its cameras with it and a filtered-out
 * location has no cameras to show. The INCIDENT is deliberately not exempt — it isn't on the
 * phone either, where only `featureType === 'camera'` short-circuits.
 */
export function itemsWithinRadius(
  items: readonly SheetItem[],
  center: [number, number],
  radiusKm: number,
): SheetItem[] {
  const centerPoint = point(center)
  return items.filter((item) => {
    const distance = turfDistance(centerPoint, point(item.coord), { units: 'kilometers' })
    return distance <= radiusKm
  })
}

/** Phone `generateRadiusCircle` (proximity-service.ts:77-90). */
export function generateRadiusCircle(
  center: [number, number],
  radiusKm: number,
  options?: { steps?: number },
): ProximityRing {
  return turfCircle(point(center), radiusKm, {
    steps: options?.steps ?? RING_STEPS,
    units: 'kilometers',
  })
}

/**
 * Phone `useProximity`'s memo body (useProximity.ts:47-64): filter, build the ring, count.
 * Pure — the hook state lives in the screen.
 */
export function computeProximity(
  data: MapData,
  center: [number, number],
  radiusKm: number,
): ProximityResult {
  const items = itemsWithinRadius(data.items, center, radiusKm)

  return {
    data: narrowProjection(data, items),
    ring: generateRadiusCircle(center, radiusKm),
    locationCount: countLocations(items),
  }
}
