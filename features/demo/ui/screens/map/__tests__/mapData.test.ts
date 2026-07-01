import { describe, it, expect } from 'vitest'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { toMapData } from '@/features/demo/ui/screens/map/mapData'

function build() {
  const store = createDemoStore()
  const caseId = store.getState().createCase({
    caseNumber: 'PR25-1',
    displayName: 'Kim B&E',
    unit: 'Robbery',
    incidentCoordinates: { lat: 43.6, lng: -79.6, source: 'geocoded' },
  })
  store.getState().addLocation(caseId, { locationName: 'Rear door', gps: { lat: 43.61, lng: -79.61, source: 'geocoded' } })
  store.getState().addLocation(caseId, { locationName: 'No coords' }) // no gps → not plotted
  const s = store.getState()
  return {
    viewerCase: s.cases.find((c) => c.id === caseId)!,
    locations: s.locations.filter((l) => l.caseId === caseId),
  }
}

describe('toMapData', () => {
  it('returns an empty projection for a null case', () => {
    expect(toMapData(null, [])).toEqual({ pins: [], incident: null, items: [], statusCounts: { started: 0, working: 0, complete: 0 } })
  })

  it('projects the incident from incidentCoordinates and lists it first', () => {
    const { viewerCase, locations } = build()
    const data = toMapData(viewerCase, locations)
    expect(data.incident).toMatchObject({ lng: -79.6, lat: 43.6, caseNumber: 'PR25-1' })
    expect(data.items[0].kind).toBe('incident')
  })

  it('plots only located locations (a coord-less location is excluded from pins and items)', () => {
    const { viewerCase, locations } = build()
    const data = toMapData(viewerCase, locations)
    expect(data.pins).toHaveLength(1)
    expect(data.pins[0]).toMatchObject({ lng: -79.61, lat: 43.61 })
    const locItems = data.items.filter((i) => i.kind === 'location')
    expect(locItems).toHaveLength(1)
    expect(locItems[0]).toMatchObject({ locationName: 'Rear door', coord: [-79.61, 43.61] })
  })

  it("tallies status counts (a blank located location is 'started')", () => {
    const { viewerCase, locations } = build()
    const data = toMapData(viewerCase, locations)
    expect(data.pins[0].status).toBe('started')
    expect(data.statusCounts).toEqual({ started: 1, working: 0, complete: 0 })
  })

  it('projects with no incident when the case has no coordinates', () => {
    const store = createDemoStore()
    const caseId = store.getState().createCase({ caseNumber: 'PR25-2', displayName: 'No incident', unit: 'R' })
    store.getState().addLocation(caseId, { locationName: 'A', gps: { lat: 1, lng: 2, source: 'geocoded' } })
    const s = store.getState()
    const data = toMapData(s.cases.find((c) => c.id === caseId)!, s.locations.filter((l) => l.caseId === caseId))
    expect(data.incident).toBeNull()
    expect(data.items.every((i) => i.kind === 'location')).toBe(true)
  })
})
