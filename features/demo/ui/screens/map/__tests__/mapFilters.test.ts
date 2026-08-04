import { describe, it, expect } from 'vitest'
import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import type { MapData, SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { mapDataFrom, sheetIncident, sheetLocation } from '@/features/demo/ui/screens/map/__tests__/test-utils'
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
): SheetItem => sheetLocation({ id, locationName: `Loc ${id}`, status, ...over })

const incident: SheetItem = sheetIncident({ streetAddress: '10 Main St', city: 'Brampton', address: '10 Main St, Brampton' })

const data = (items: SheetItem[]): MapData => mapDataFrom(items)

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

describe('mapFilters — the shared empty state is not a shared mutable', () => {
  it('is frozen: the literal handed out on every mount and case switch cannot be pushed into', () => {
    expect(Object.isFrozen(EMPTY_MAP_FILTERS)).toBe(true)
    expect(Object.isFrozen(EMPTY_MAP_FILTERS.statuses)).toBe(true)
  })

  it('keeps its identity — a no-op reset must stay an Object.is bail-out, not a re-render', () => {
    // `toggleStatus` and the reducers are spread-only, so resetting to this exact object is how
    // the case-switch reset stays free.
    expect(EMPTY_MAP_FILTERS).toBe(EMPTY_MAP_FILTERS)
    expect(toggleStatus(EMPTY_MAP_FILTERS.statuses, 'started')).not.toBe(EMPTY_MAP_FILTERS.statuses)
  })
})

describe('mapFilters — the pill registry is exhaustive by construction (review R-17)', () => {
  it('lists every LocationMapStatus, in the phone pill order', () => {
    // Derived from a `satisfies Record<LocationMapStatus, number>`, so a fourth status cannot be
    // added to the union without adding it here — `toggleStatus` re-derives THROUGH this list
    // and would otherwise drop the new member silently.
    expect([...MAP_FILTER_STATUSES]).toEqual(['started', 'working', 'complete'])
  })

  it('round-trips every registered status through toggleStatus', () => {
    for (const status of MAP_FILTER_STATUSES) {
      expect(toggleStatus([], status)).toEqual([status])
      expect(toggleStatus([status], status)).toEqual([])
    }
  })
})
