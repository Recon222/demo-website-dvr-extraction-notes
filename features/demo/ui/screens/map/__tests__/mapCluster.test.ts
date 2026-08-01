import { describe, it, expect, vi } from 'vitest'
import type { MarkerDescriptor } from '@/features/demo/ui/screens/map/buildMarkers'
import {
  CLUSTER_EXPANSION_MAX_ZOOM,
  CLUSTER_EXPANSION_ZOOM_NUDGE,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  WORLD_BBOX,
  abbreviateCount,
  buildClusterIndex,
  computeClusterExpansionCamera,
  expandCluster,
  normalizeBbox,
  type ClusterDescriptor,
} from '@/features/demo/ui/screens/map/mapCluster'
import { clusterFontSizeFor, clusterRadiusFor } from '@/features/demo/ui/screens/map/mapTokens'

const loc = (id: string, lng: number, lat: number): MarkerDescriptor => ({ id, lng, lat, kind: 'location', color: '#00BFFF' })
const inc = (id: string, lng: number, lat: number): MarkerDescriptor => ({ id, lng, lat, kind: 'incident', color: '#e53935' })

/** Ten pins within ~50 m of each other — guaranteed to aggregate at low zoom. */
const tightCluster = Array.from({ length: 10 }, (_, i) => loc(`l${i}`, -79.6 + i * 0.0002, 43.6 + i * 0.0002))

describe('mapCluster — config parity', () => {
  it('uses the phone cluster config verbatim', () => {
    expect(CLUSTER_RADIUS).toBe(50)
    expect(CLUSTER_MAX_ZOOM).toBe(14)
    // Literal, not self-referential (review R-22): asserting the constant against itself lets
    // the phone-parity value drift silently. Phone `cluster-press-service.ts:42`.
    expect(CLUSTER_EXPANSION_MAX_ZOOM).toBe(20)
    expect(CLUSTER_EXPANSION_ZOOM_NUDGE).toBe(0.5)
  })
})

describe('mapCluster — index', () => {
  it('aggregates nearby location pins into one cluster at low zoom', () => {
    const index = buildClusterIndex(tightCluster)
    const markers = index.markersFor(WORLD_BBOX, 8)
    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({ kind: 'cluster', count: 10, label: '10' })
  })

  it('breaks the cluster apart above the cluster max zoom', () => {
    const index = buildClusterIndex(tightCluster)
    const markers = index.markersFor(WORLD_BBOX, CLUSTER_MAX_ZOOM + 1)
    expect(markers.every((m) => m.kind === 'location')).toBe(true)
    expect(markers).toHaveLength(10)
  })

  it('carries the original marker descriptor through for un-clustered pins', () => {
    const index = buildClusterIndex([loc('l1', -79.6, 43.6)])
    const [marker] = index.markersFor(WORLD_BBOX, 10)
    expect(marker).toEqual(loc('l1', -79.6, 43.6))
  })

  it('never clusters the incident — it is emitted unchanged at every zoom', () => {
    const index = buildClusterIndex([...tightCluster, inc('c1', -79.6, 43.6)])
    const low = index.markersFor(WORLD_BBOX, 4)
    expect(low.filter((m) => m.kind === 'incident')).toHaveLength(1)
    expect(low.filter((m) => m.kind === 'cluster')).toHaveLength(1)
  })

  it('emits nothing but passthrough markers for an out-of-view bbox', () => {
    const index = buildClusterIndex([...tightCluster, inc('c1', -79.6, 43.6)])
    const markers = index.markersFor([10, 10, 20, 20], 10)
    expect(markers).toEqual([inc('c1', -79.6, 43.6)])
  })

  it('resolves an expansion zoom for a real cluster id', () => {
    const index = buildClusterIndex(tightCluster)
    const cluster = index.markersFor(WORLD_BBOX, 8)[0] as ClusterDescriptor
    expect(index.expansionZoom(cluster.clusterId)).toBeGreaterThan(8)
  })

  it('handles an empty marker set', () => {
    expect(buildClusterIndex([]).markersFor(WORLD_BBOX, 10)).toEqual([])
  })
})

describe('mapCluster — bbox normalisation', () => {
  it('falls back to the world box for a non-finite or wrapped-past-360 viewport', () => {
    expect(normalizeBbox([NaN, 0, 1, 1])).toEqual(WORLD_BBOX)
    expect(normalizeBbox([-200, -90, 200, 90])).toEqual(WORLD_BBOX)
  })

  it('clamps a partly out-of-range viewport instead of dropping it', () => {
    expect(normalizeBbox([-190, -95, -70, 50])).toEqual([-180, -90, -70, 50])
  })
})

describe('mapCluster — badge sizing + label', () => {
  it('steps the circle radius 16 / 22 / 28 at 10 and 50 points', () => {
    expect(clusterRadiusFor(2)).toBe(16)
    expect(clusterRadiusFor(9)).toBe(16)
    expect(clusterRadiusFor(10)).toBe(22)
    expect(clusterRadiusFor(49)).toBe(22)
    expect(clusterRadiusFor(50)).toBe(28)
  })

  it('steps the count font 12 / 14 / 16 on the same thresholds', () => {
    expect(clusterFontSizeFor(9)).toBe(12)
    expect(clusterFontSizeFor(10)).toBe(14)
    expect(clusterFontSizeFor(50)).toBe(16)
  })

  it('abbreviates like Mapbox point_count_abbreviated', () => {
    expect(abbreviateCount(7)).toBe('7')
    expect(abbreviateCount(999)).toBe('999')
    expect(abbreviateCount(1000)).toBe('1k')
    expect(abbreviateCount(1500)).toBe('1.5k')
    expect(abbreviateCount(12000)).toBe('12k')
  })
})

describe('mapCluster — expansion camera', () => {
  it('nudges past the split threshold and keeps the centre', () => {
    expect(computeClusterExpansionCamera(11, [-79.6, 43.6])).toEqual({ center: [-79.6, 43.6], zoom: 11.5 })
  })

  it('clamps a runaway expansion zoom', () => {
    expect(computeClusterExpansionCamera(40, [0, 0]).zoom).toBe(CLUSTER_EXPANSION_MAX_ZOOM)
  })
})

describe('mapCluster — expandCluster', () => {
  const cluster: ClusterDescriptor = { kind: 'cluster', id: 'cluster-1', clusterId: 1, lng: -79.6, lat: 43.6, count: 4, label: '4' }

  it('flies to the nudged camera target', () => {
    const flyToCluster = vi.fn()
    expandCluster(cluster, { expansionZoom: () => 12, flyToCluster })
    expect(flyToCluster).toHaveBeenCalledWith({ center: [-79.6, 43.6], zoom: 12.5 })
  })

  it('routes a thrown lookup to onError and never moves the camera', () => {
    const flyToCluster = vi.fn()
    const onError = vi.fn()
    expandCluster(cluster, {
      expansionZoom: () => {
        throw new Error('index gone')
      },
      flyToCluster,
      onError,
    })
    expect(flyToCluster).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'index gone' }))
  })

  it('refuses a non-finite expansion zoom', () => {
    const flyToCluster = vi.fn()
    const onError = vi.fn()
    expandCluster(cluster, { expansionZoom: () => NaN, flyToCluster, onError })
    expect(flyToCluster).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('not finite') }))
  })

  it('never throws when no onError sink is supplied', () => {
    expect(() =>
      expandCluster(cluster, {
        expansionZoom: () => {
          throw new Error('boom')
        },
        flyToCluster: vi.fn(),
      }),
    ).not.toThrow()
  })
})
