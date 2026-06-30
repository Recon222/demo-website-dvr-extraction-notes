import { describe, it, expect } from 'vitest'
import { buildMarkers } from '@/features/demo/ui/screens/map/buildMarkers'
import type { MapData } from '@/features/demo/ui/screens/map/mapData'
import { MAP_PIN_COLORS } from '@/features/demo/ui/screens/map/mapTokens'

const data = (over: Partial<MapData> = {}): MapData => ({
  pins: [],
  incident: null,
  items: [],
  statusCounts: { started: 0, working: 0, complete: 0 },
  ...over,
})

describe('buildMarkers', () => {
  it('builds a status-coloured descriptor per located pin plus the incident', () => {
    const m = buildMarkers(
      data({
        pins: [
          { id: 'a', lng: -79.6, lat: 43.6, status: 'started' },
          { id: 'b', lng: -79.7, lat: 43.7, status: 'complete' },
        ],
        incident: { id: 'case1', caseNumber: 'PR25-1', lng: -79.5, lat: 43.5 },
      }),
    )
    expect(m).toHaveLength(3)
    expect(m[0]).toMatchObject({ id: 'a', kind: 'location', color: MAP_PIN_COLORS.started, lng: -79.6, lat: 43.6 })
    expect(m[1]).toMatchObject({ kind: 'location', color: MAP_PIN_COLORS.complete })
    const inc = m.find((x) => x.kind === 'incident')!
    expect(inc).toMatchObject({ kind: 'incident', color: MAP_PIN_COLORS.incident, lng: -79.5, lat: 43.5 })
  })

  it('omits the incident descriptor when the case has none', () => {
    const m = buildMarkers(data({ pins: [{ id: 'a', lng: 1, lat: 2, status: 'working' }] }))
    expect(m).toHaveLength(1)
    expect(m[0].kind).toBe('location')
  })
})
