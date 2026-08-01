import Supercluster from 'supercluster'
import type { MarkerDescriptor } from '@/features/demo/ui/screens/map/buildMarkers'

/**
 * Location-pin clustering — the demo's port of the phone's clustered `Mapbox.ShapeSource`
 * (`CaseMapView.tsx:835-875`) driven by the SAME algorithm.
 *
 * Why the `supercluster` package rather than mapbox-gl's built-in `cluster: true` GeoJSON
 * source: the phone does not depend on supercluster directly either — `@rnmapbox/maps` runs it
 * natively inside the ShapeSource, which is why `cluster-press-service.ts:5-9` describes it as
 * "supercluster under the hood". mapbox-gl would put the same library behind a Web Worker whose
 * `getClusterExpansionZoom` is async and unobservable in jsdom, and its cluster COUNT needs a
 * SymbolLayer, i.e. a network glyph fetch that silently renders nothing when it fails (the exact
 * trap `ClusterBadge.tsx:38-45` documents on the phone). Running the library in-process keeps
 * the existing DOM-marker seam, keeps the count text local, and makes the expansion maths a pure
 * unit test — while producing the identical clustering, at the phone's identical config.
 *
 * Only `kind: 'location'` markers cluster. The incident teardrop is a separate MarkerView on the
 * phone precisely so it never aggregates into (and hides) a cluster circle
 * (`CaseMapView.tsx:877-882`); cameras are likewise their own non-clustered markers.
 *
 * This module is loaded through a dynamic `import()` from `MapCanvas`, alongside `mapbox-gl`, so
 * `supercluster` never reaches the demo's own chunk.
 */

/** Phone `MAP_CONFIG.clusterRadius` (constants/index.ts:35). */
export const CLUSTER_RADIUS = 50
/** Phone `MAP_CONFIG.clusterMaxZoom` (constants/index.ts:36) — above it, points stand alone. */
export const CLUSTER_MAX_ZOOM = 14

/** Phone `CLUSTER_EXPANSION_ZOOM_NUDGE` (cluster-press-service.ts:34): land just past the split
 *  threshold, so sub-pixel rounding can't leave the cluster re-formed. */
export const CLUSTER_EXPANSION_ZOOM_NUDGE = 0.5
/** Phone `CLUSTER_EXPANSION_MAX_ZOOM` (cluster-press-service.ts:42): a very tight cluster reports
 *  a huge expansion zoom; without the clamp the camera rockets to roof level. */
export const CLUSTER_EXPANSION_MAX_ZOOM = 20

/** A rendered cluster bubble. `id` is namespaced so it can never collide with a location or case
 *  id in the marker map / selection path. */
export interface ClusterDescriptor {
  kind: 'cluster'
  id: string
  clusterId: number
  lng: number
  lat: number
  count: number
  /** Mapbox's `point_count_abbreviated` — the label the phone's ClusterBadge renders. */
  label: string
}

export type PlottedMarker = MarkerDescriptor | ClusterDescriptor

/** [west, south, east, north] — supercluster's bbox order. */
export type ClusterBbox = readonly [west: number, south: number, east: number, north: number]

/** Frozen: this tuple is handed to callers (`MapCanvas` reads it off the module) and a mutation
 *  would silently reshape every later clustering query in the session (review R-13). */
export const WORLD_BBOX: ClusterBbox = Object.freeze([-180, -85, 180, 85]) as ClusterBbox

export interface ClusterIndex {
  /** Cluster bubbles + loose location pins for the given viewport, plus every non-clustered
   *  marker (the incident) unchanged. */
  markersFor(bbox: ClusterBbox, zoom: number): PlottedMarker[]
  /** The zoom at which a cluster breaks apart. Phone: `ShapeSource.getClusterExpansionZoom`. */
  expansionZoom(clusterId: number): number
}

/**
 * What each loaded point carries. `LocationMarker` (not the whole `MarkerDescriptor` union) so
 * the index literally cannot hold an incident — the passthrough split below is then a compile-time
 * fact rather than a convention (review R-12, R-27e).
 */
interface PointProps {
  marker: LocationMarker
}

/** The union member the index accepts. */
type LocationMarker = MarkerDescriptor & { kind: 'location' }

/**
 * Mapbox's `point_count_abbreviated` rule: counts under 1000 print whole; 1000+ collapse to one
 * decimal with a `k` suffix (trailing `.0` dropped). Reimplemented because the label is produced
 * locally rather than by a SymbolLayer expression.
 */
export function abbreviateCount(count: number): string {
  if (count < 1000) return String(count)
  const thousands = count / 1000
  const rounded = Math.round(thousands * 10) / 10
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}k`
}

/** Clamp a viewport bbox into supercluster's accepted range (mapbox reports wrapped longitudes
 *  once the user pans past the antimeridian; an unclamped bbox returns nothing). */
export function normalizeBbox(bbox: ClusterBbox): ClusterBbox {
  const [w, s, e, n] = bbox
  if (!Number.isFinite(w) || !Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(n)) return WORLD_BBOX
  if (e - w >= 360) return WORLD_BBOX
  return [Math.max(w, -180), Math.max(s, -90), Math.min(e, 180), Math.min(n, 90)]
}

/**
 * Build the index for a marker set. Non-location markers bypass clustering entirely and are
 * re-emitted from every `markersFor` call.
 */
export function buildClusterIndex(markers: readonly MarkerDescriptor[]): ClusterIndex {
  const locations = markers.filter((m): m is LocationMarker => m.kind === 'location')
  const passthrough = markers.filter((m) => m.kind !== 'location')

  // Both generics closed: point props AND cluster props. Leaving the second open defaults it to
  // `any`, which is what made every read below need a cast (review R-12).
  const index = new Supercluster<PointProps, Record<string, never>>({
    radius: CLUSTER_RADIUS,
    maxZoom: CLUSTER_MAX_ZOOM,
  })
  index.load(
    locations.map((m) => ({
      type: 'Feature' as const,
      properties: { marker: m },
      geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
    })),
  )

  return {
    markersFor(bbox, zoom) {
      const safeZoom = Number.isFinite(zoom) ? Math.round(zoom) : 0
      // `'cluster' in props` narrows supercluster's own union — no casts, no all-optional bag,
      // and no fabricated `count: 0` fallback for a field the cluster branch always has.
      // supercluster types its bbox parameter mutable; the copy keeps our own tuple readonly
      // without handing the library a reference it could write through.
      const [w, s, e, n] = normalizeBbox(bbox)
      const out: PlottedMarker[] = index.getClusters([w, s, e, n], safeZoom).map((feature) => {
        const [lng, lat] = feature.geometry.coordinates
        const props = feature.properties
        if ('cluster' in props) {
          return {
            kind: 'cluster',
            id: `cluster-${props.cluster_id}`,
            clusterId: props.cluster_id,
            lng,
            lat,
            count: props.point_count,
            label: abbreviateCount(props.point_count),
          }
        }
        return props.marker
      })
      return [...out, ...passthrough]
    },
    expansionZoom(clusterId) {
      return index.getClusterExpansionZoom(clusterId)
    },
  }
}

export interface ClusterCameraTarget {
  center: [number, number]
  zoom: number
}

/**
 * Phone `computeClusterExpansionCamera` (cluster-press-service.ts:70-79), verbatim: keep the
 * cluster's centre, step just past the split threshold, clamp to the max. Pure.
 */
export function computeClusterExpansionCamera(
  expansionZoom: number,
  center: [number, number],
): ClusterCameraTarget {
  const zoom = Math.min(expansionZoom + CLUSTER_EXPANSION_ZOOM_NUDGE, CLUSTER_EXPANSION_MAX_ZOOM)
  return { center: [center[0], center[1]], zoom }
}

/**
 * Phone `expandClusterFeature` (cluster-press-service.ts:90-119): resolve the expansion zoom and
 * move the camera. Error-safe by contract — a rejected/NaN lookup routes to `onError` and never
 * throws and never moves the camera, so callers can fire-and-forget.
 */
export function expandCluster(
  cluster: ClusterDescriptor,
  deps: {
    expansionZoom(clusterId: number): number
    flyToCluster(target: ClusterCameraTarget): void
    onError?(error: Error): void
  },
): void {
  try {
    const zoom = deps.expansionZoom(cluster.clusterId)
    if (!Number.isFinite(zoom)) {
      throw new Error(`expandCluster: expansion zoom was not finite (${zoom})`)
    }
    deps.flyToCluster(computeClusterExpansionCamera(zoom, [cluster.lng, cluster.lat]))
  } catch (err) {
    deps.onError?.(err instanceof Error ? err : new Error(String(err)))
  }
}
