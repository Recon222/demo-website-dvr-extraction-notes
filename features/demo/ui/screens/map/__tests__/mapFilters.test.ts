import { describe, it, expect } from 'vitest'
import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import type { MapData, SheetItem } from '@/features/demo/ui/screens/map/mapData'
import {
  EMPTY_MAP_FILTERS,
  MAP_FILTER_STATUSES,
  applyMapFilters,
  countActiveFilters,
  matchesSearchFilter,
  matchesStatusFilter,
  toggleStatus,
} from '@/features/demo/ui/screens/map/mapFilters'

const loc = (
  id: string,
  status: LocationMapStatus,
  over: Partial<Extract<SheetItem, { kind: 'location' }>> = {},
): SheetItem => ({
  kind: 'location',
  id,
  locationName: `Loc ${id}`,
  businessName: '',
  address: '',
  status,
  coord: [-79.6, 43.6],
  streetAddress: '',
  city: '',
  requesterName: '',
  requesterBadge: '',
  requesterUnit: '',
  requesterPhone: '',
  requesterEmail: '',
  locationContact: '',
  locationPhone: '',
  coordinateSource: 'geocoded',
  cameras: [],
  ...over,
})

const incident: SheetItem = {
  kind: 'incident',
  id: 'c1',
  caseNumber: 'PR25-1',
  businessName: '',
  streetAddress: '10 Main St',
  city: 'Brampton',
  address: '10 Main St, Brampton',
  coord: [-79.5, 43.5],
}

function data(items: SheetItem[]): MapData {
  const locations = items.filter((i) => i.kind === 'location')
  return {
    pins: locations.map((l) => ({ id: l.id, lng: l.coord[0], lat: l.coord[1], status: l.status })),
    incident: { id: 'c1', caseNumber: 'PR25-1', lng: -79.5, lat: 43.5 },
    items,
    statusCounts: { started: 0, working: 0, complete: 0 },
  }
}

describe('mapFilters — state helpers', () => {
  it('counts one active filter per non-empty slot, not one per selected status', () => {
    expect(countActiveFilters(EMPTY_MAP_FILTERS)).toBe(0)
    expect(countActiveFilters({ statuses: ['started', 'working'], searchText: '' })).toBe(1)
    expect(countActiveFilters({ statuses: [], searchText: 'rear' })).toBe(1)
    expect(countActiveFilters({ statuses: ['complete'], searchText: 'rear' })).toBe(2)
  })

  it('toggles a status in and out, always in registry order', () => {
    expect(toggleStatus([], 'complete')).toEqual(['complete'])
    expect(toggleStatus(['complete'], 'started')).toEqual(['started', 'complete'])
    expect(toggleStatus(['started', 'complete'], 'started')).toEqual(['complete'])
    expect(MAP_FILTER_STATUSES).toEqual(['started', 'working', 'complete'])
  })
})

describe('mapFilters — predicates', () => {
  it('an empty status set filters nothing', () => {
    expect(matchesStatusFilter(loc('l1', 'started'), [])).toBe(true)
  })

  it('keeps only locations whose status is selected', () => {
    expect(matchesStatusFilter(loc('l1', 'started'), ['started'])).toBe(true)
    expect(matchesStatusFilter(loc('l1', 'working'), ['started'])).toBe(false)
  })

  it('never filters the incident on status — it has none', () => {
    expect(matchesStatusFilter(incident, ['complete'])).toBe(true)
  })

  it('matches search case-insensitively across name, address and business name', () => {
    const item = loc('l1', 'working', { locationName: 'Rear Door', address: '55 Queen St', businessName: "Kim's Convenience" })
    expect(matchesSearchFilter(item, 'rear')).toBe(true)
    expect(matchesSearchFilter(item, 'QUEEN')).toBe(true)
    expect(matchesSearchFilter(item, 'convenience')).toBe(true)
    expect(matchesSearchFilter(item, 'loading dock')).toBe(false)
    expect(matchesSearchFilter(item, '')).toBe(true)
  })

  it('never filters the incident on text', () => {
    expect(matchesSearchFilter(incident, 'nothing matches this')).toBe(true)
  })
})

describe('mapFilters — applyMapFilters', () => {
  it('returns the same object when nothing is active (no needless re-fit)', () => {
    const d = data([loc('l1', 'started')])
    expect(applyMapFilters(d, EMPTY_MAP_FILTERS)).toBe(d)
  })

  it('drops non-matching locations from items AND pins, and recounts statuses', () => {
    const d = data([incident, loc('l1', 'started'), loc('l2', 'complete'), loc('l3', 'complete')])
    const out = applyMapFilters(d, { statuses: ['complete'], searchText: '' })
    expect(out.items.filter((i) => i.kind === 'location').map((i) => i.id)).toEqual(['l2', 'l3'])
    expect(out.pins.map((p) => p.id)).toEqual(['l2', 'l3'])
    expect(out.statusCounts).toEqual({ started: 0, working: 0, complete: 2 })
  })

  it('keeps the incident row and pin through every filter', () => {
    const d = data([incident, loc('l1', 'started')])
    const out = applyMapFilters(d, { statuses: ['complete'], searchText: 'nothing' })
    expect(out.items).toEqual([incident])
    expect(out.incident).toEqual(d.incident)
  })

  it('chains status then text', () => {
    const d = data([
      loc('l1', 'complete', { locationName: 'Rear door' }),
      loc('l2', 'complete', { locationName: 'Front door' }),
      loc('l3', 'started', { locationName: 'Rear alley' }),
    ])
    const out = applyMapFilters(d, { statuses: ['complete'], searchText: 'rear' })
    expect(out.items.map((i) => i.id)).toEqual(['l1'])
  })

  it('never mutates the input projection', () => {
    const d = data([incident, loc('l1', 'started')])
    const before = JSON.stringify(d)
    applyMapFilters(d, { statuses: ['complete'], searchText: '' })
    expect(JSON.stringify(d)).toBe(before)
  })
})
