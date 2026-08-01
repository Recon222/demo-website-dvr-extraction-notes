import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import { narrowProjection, type MapData, type SheetItem } from '@/features/demo/ui/screens/map/mapData'

/**
 * Map filter pipeline — the demo's port of the phone's `map-data-service` filter functions
 * (`src/features/location/map-view/services/map-data-service.ts:95-182`) plus the state shape
 * owned by `useMapFilter` (`hooks/useMapFilter.ts:29-72`).
 *
 * Pure (UI-layer mapper, like `mapData.ts`), so the whole filter contract is unit-tested without
 * the map. The phone filters a GeoJSON `FeatureCollection`; the demo's projection is `MapData`,
 * so the same two predicates run over `items` and the surviving ids drive `pins`.
 *
 * The load-bearing rule, lifted verbatim from the phone (map-data-service.ts:108-113, 137-141):
 * **only LOCATION rows are ever filtered out.** The incident scene has no status and no
 * searchable name, so it always passes — otherwise the case anchor would vanish the moment a
 * status pill or a search term went active.
 *
 * Filter state is deliberately NOT persisted: the phone holds it in `useState` inside
 * `useMapFilter` with no store slice and no AsyncStorage write, so it dies with the screen.
 */

/**
 * The filterable statuses, in the phone's pill order (`MapControls.tsx:66`).
 *
 * The order is DERIVED from an exhaustive `Record` (review R-17) rather than hand-listed. A
 * fourth `LocationMapStatus` would otherwise compile everywhere — `toggleStatus` re-derives
 * THROUGH this registry, so the new member would be silently dropped from every toggle and its
 * pill would be permanently un-toggleable. Both siblings in `mapTokens.ts` are already
 * exhaustive `Record`s; this brings the third into line.
 */
const STATUS_PILL_ORDER = {
  started: 0,
  working: 1,
  complete: 2,
} satisfies Record<LocationMapStatus, number>

export const MAP_FILTER_STATUSES: readonly LocationMapStatus[] = (
  Object.keys(STATUS_PILL_ORDER) as LocationMapStatus[]
).sort((a, b) => STATUS_PILL_ORDER[a] - STATUS_PILL_ORDER[b])

export interface MapFilterState {
  /** Active status pills. Empty = no status filter (phone: `statuses` undefined). */
  readonly statuses: readonly LocationMapStatus[]
  /** Search box text. Empty = no text filter (phone: `searchText` undefined). */
  readonly searchText: string
}

/**
 * The unfiltered starting state (phone: both filter slots `undefined`).
 *
 * Frozen rather than a factory (review R-13): its IDENTITY is load-bearing —
 * `setFilters(EMPTY_MAP_FILTERS)` on an already-empty state is an `Object.is` bail-out that
 * React uses to skip the re-render, which is what makes the case-switch reset free. A factory
 * would mint a new object and force a render on every no-op reset. Freezing keeps the identity
 * and removes the hazard: this literal is the LIVE filter state on every mount and every case
 * switch, so a single in-place `push` would have poisoned every later mount in the session.
 */
export const EMPTY_MAP_FILTERS: MapFilterState = Object.freeze({
  statuses: Object.freeze([]) as readonly LocationMapStatus[],
  searchText: '',
})

/**
 * Badge count for the Clear pill — one per NON-EMPTY filter, not one per selected status
 * (phone `useMapFilter.ts:51-63`: `statuses.length > 0` contributes exactly 1).
 */
export function countActiveFilters(filters: MapFilterState): number {
  let count = 0
  if (filters.statuses.length > 0) count += 1
  if (filters.searchText.length > 0) count += 1
  return count
}

/** Toggle one status in/out of the active set, preserving the registry order of the pills. */
export function toggleStatus(
  statuses: readonly LocationMapStatus[],
  status: LocationMapStatus,
): LocationMapStatus[] {
  const next = statuses.includes(status)
    ? statuses.filter((s) => s !== status)
    : [...statuses, status]
  return MAP_FILTER_STATUSES.filter((s) => next.includes(s))
}

/** Phone `filterByStatus`: non-location rows always pass; an empty set is no filter. */
export function matchesStatusFilter(item: SheetItem, statuses: readonly LocationMapStatus[]): boolean {
  if (statuses.length === 0) return true
  if (item.kind !== 'location') return true
  return statuses.includes(item.status)
}

/** Phone `filterBySearchText`: case-insensitive over locationName / address / businessName. */
export function matchesSearchFilter(item: SheetItem, searchText: string): boolean {
  if (!searchText) return true
  if (item.kind !== 'location') return true
  const needle = searchText.toLowerCase()
  return (
    item.locationName.toLowerCase().includes(needle) ||
    item.address.toLowerCase().includes(needle) ||
    item.businessName.toLowerCase().includes(needle)
  )
}

/**
 * Apply the whole pipeline (statuses → text) to a projection, returning a NEW `MapData` whose
 * `pins`, `items` and `statusCounts` all agree. The incident pin and item survive untouched.
 */
export function applyMapFilters(data: MapData, filters: MapFilterState): MapData {
  if (countActiveFilters(filters) === 0) return data

  const items = data.items.filter(
    (item) => matchesStatusFilter(item, filters.statuses) && matchesSearchFilter(item, filters.searchText),
  )
  // The incident always survives both predicates, so deriving it from the surviving rows gives
  // the same answer as carrying it through — and cannot drift from `items` the way a carried
  // copy could.
  return narrowProjection(data, items)
}
