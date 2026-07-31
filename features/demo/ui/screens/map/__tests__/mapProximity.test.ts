import { describe, it, expect } from 'vitest'
import type { MapCameraMarker, MapData, SheetItem } from '@/features/demo/ui/screens/map/mapData'
import {
  RING_STEPS,
  computeProximity,
  generateRadiusCircle,
  itemsWithinRadius,
} from '@/features/demo/ui/screens/map/mapProximity'
import { DEFAULT_PROXIMITY_RADIUS, PROXIMITY_PRESETS } from '@/features/demo/ui/screens/map/mapTokens'

const CENTER: [number, number] = [-79.6, 43.6]

const loc = (id: string, coord: [number, number], cameras: MapCameraMarker[] = []): SheetItem => ({
  kind: 'location',
  id,
  locationName: `Loc ${id}`,
  businessName: '',
  address: '',
  status: 'working',
  coord,
  streetAddress: '',
  city: '',
  requesterName: '',
  requesterBadge: '',
  requesterUnit: '',
  requesterPhone: '',
  requesterEmail: '',
  locationContact: '',
  locationPhone: '',
  coordinateSource: 'gps',
  cameras,
})

const incident = (coord: [number, number]): SheetItem => ({
  kind: 'incident',
  id: 'c1',
  caseNumber: 'PR25-1',
  businessName: '',
  streetAddress: '',
  city: '',
  address: '',
  coord,
})

/** ~0.9 km north of CENTER (1 deg latitude ≈ 111 km). */
const NEAR: [number, number] = [-79.6, 43.608]
/** ~3.3 km north of CENTER. */
const FAR: [number, number] = [-79.6, 43.63]

function data(items: SheetItem[]): MapData {
  const locations = items.filter((i) => i.kind === 'location')
  const inc = items.find((i) => i.kind === 'incident')
  return {
    pins: locations.map((l) => ({ id: l.id, lng: l.coord[0], lat: l.coord[1], status: l.status })),
    incident: inc ? { id: inc.id, caseNumber: inc.caseNumber, lng: inc.coord[0], lat: inc.coord[1] } : null,
    items,
    statusCounts: { started: 0, working: locations.length, complete: 0 },
  }
}

describe('mapProximity — presets', () => {
  it('carries the phone presets and default verbatim', () => {
    expect(PROXIMITY_PRESETS).toEqual([0.5, 1, 2, 5])
    expect(DEFAULT_PROXIMITY_RADIUS).toBe(1)
  })
})

describe('mapProximity — itemsWithinRadius', () => {
  it('keeps rows inside the radius and drops rows outside it', () => {
    const items = [loc('near', NEAR), loc('far', FAR)]
    expect(itemsWithinRadius(items, CENTER, 1).map((i) => i.id)).toEqual(['near'])
    expect(itemsWithinRadius(items, CENTER, 5).map((i) => i.id)).toEqual(['near', 'far'])
  })

  it('subjects the incident to the radius too — the phone exempts only cameras', () => {
    const items = [incident(FAR), loc('near', NEAR)]
    expect(itemsWithinRadius(items, CENTER, 1).map((i) => i.id)).toEqual(['near'])
  })

  it('keeps a row exactly on the centre at radius 0', () => {
    expect(itemsWithinRadius([loc('on', CENTER), loc('near', NEAR)], CENTER, 0).map((i) => i.id)).toEqual(['on'])
  })

  it('returns an empty list for an empty input', () => {
    expect(itemsWithinRadius([], CENTER, 1)).toEqual([])
  })
})

describe('mapProximity — generateRadiusCircle', () => {
  it('builds a closed polygon with the default vertex count', () => {
    const ring = generateRadiusCircle(CENTER, 1)
    expect(ring.geometry.type).toBe('Polygon')
    const coords = ring.geometry.coordinates[0]
    expect(coords).toHaveLength(RING_STEPS + 1)
    expect(coords[0]).toEqual(coords[coords.length - 1])
  })

  it('scales with the radius', () => {
    const small = generateRadiusCircle(CENTER, 1).geometry.coordinates[0]
    const large = generateRadiusCircle(CENTER, 5).geometry.coordinates[0]
    const spread = (ring: number[][]) => Math.max(...ring.map((c) => Math.abs(c[1] - CENTER[1])))
    expect(spread(large)).toBeGreaterThan(spread(small) * 4)
  })

  it('honours an explicit step count', () => {
    expect(generateRadiusCircle(CENTER, 1, { steps: 8 }).geometry.coordinates[0]).toHaveLength(9)
  })
})

describe('mapProximity — computeProximity', () => {
  it('filters items, pins and the incident together, and recounts', () => {
    const result = computeProximity(data([incident(FAR), loc('near', NEAR), loc('far', FAR)]), CENTER, 1)
    expect(result.data.items.map((i) => i.id)).toEqual(['near'])
    expect(result.data.pins.map((p) => p.id)).toEqual(['near'])
    expect(result.data.incident).toBeNull()
    expect(result.data.statusCounts).toEqual({ started: 0, working: 1, complete: 0 })
  })

  it('keeps the incident when it falls inside the radius', () => {
    const result = computeProximity(data([incident(NEAR), loc('near', NEAR)]), CENTER, 1)
    expect(result.data.incident).not.toBeNull()
  })

  it('counts only locations — the incident never inflates the badge', () => {
    const result = computeProximity(data([incident(NEAR), loc('a', NEAR), loc('b', NEAR)]), CENTER, 1)
    expect(result.data.items).toHaveLength(3)
    expect(result.locationCount).toBe(2)
  })

  it('emits a ring centred on the requested coordinate', () => {
    const result = computeProximity(data([loc('near', NEAR)]), CENTER, 2)
    expect(result.ring.geometry.type).toBe('Polygon')
    const lngs = result.ring.geometry.coordinates[0].map((c) => c[0])
    expect((Math.min(...lngs) + Math.max(...lngs)) / 2).toBeCloseTo(CENTER[0], 4)
  })

  it('never mutates the input projection', () => {
    const input = data([incident(FAR), loc('near', NEAR), loc('far', FAR)])
    const before = JSON.stringify(input)
    computeProximity(input, CENTER, 1)
    expect(JSON.stringify(input)).toBe(before)
  })
})
