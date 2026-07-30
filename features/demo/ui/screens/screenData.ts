import type { DemoCase, DemoLocation } from '@/features/demo/engine/types'
import { selectLocationMapStatus, type LocationMapStatus } from '@/features/demo/engine/store/selectors'

/** UI-data mappers: shape the store's cases/locations into the display rows the dumb screens
 *  render. Lives in the UI layer (not the engine) so screens stay presentational. */

export interface StatusTheme {
  label: string
  color: string
  bg: string
  border: string
}

export function caseStatusTheme(status: DemoCase['status']): StatusTheme {
  switch (status) {
    case 'complete':
      return { label: 'Complete', color: '#10d177', bg: 'rgba(16,209,119,0.12)', border: 'rgba(16,209,119,0.3)' }
    case 'archived':
      return { label: 'Archived', color: '#7a9fc4', bg: 'rgba(122,159,196,0.12)', border: 'rgba(122,159,196,0.3)' }
    default:
      return { label: 'Draft', color: '#ffd93d', bg: 'rgba(255,217,61,0.12)', border: 'rgba(255,217,61,0.3)' }
  }
}

/**
 * Truthful per-location status (G3): the same started/working/complete the map derives from
 * per-screen completion. Colors match `MAP_PIN_COLORS` (ui/screens/map/mapTokens.ts) — the
 * phone's map-view status palette — so a location reads identically on the Cases list and the
 * map legend. Parity is pinned by test against mapTokens; don't retheme one without the other.
 */
export function locationStatusTheme(status: LocationMapStatus): StatusTheme {
  switch (status) {
    case 'complete':
      return { label: 'Complete', color: '#34C759', bg: 'rgba(52,199,89,0.12)', border: 'rgba(52,199,89,0.3)' }
    case 'working':
      return { label: 'Working', color: '#00BFFF', bg: 'rgba(0,191,255,0.12)', border: 'rgba(0,191,255,0.3)' }
    case 'started':
      return { label: 'Started', color: '#FF9500', bg: 'rgba(255,149,0,0.12)', border: 'rgba(255,149,0,0.3)' }
  }
}

export interface Personnel {
  role: string
  name: string
  badge?: string
}

export interface CaseLocationRow {
  id: string
  locationName: string
  address: string
  status: StatusTheme
}

export interface CaseCard {
  id: string
  caseNumber: string
  displayName: string
  status: StatusTheme
  personnel: Personnel[]
  createdLabel: string
  locations: CaseLocationRow[]
  locationCountLabel: string
}

function personnelOf(c: DemoCase): Personnel[] {
  const out: Personnel[] = []
  if (c.oicName) out.push({ role: 'OIC', name: c.oicName, badge: c.oicBadge || undefined })
  if (c.vcName) out.push({ role: 'VC', name: c.vcName, badge: c.vcBadge || undefined })
  return out
}

function locationsOf(c: DemoCase, locations: DemoLocation[]): CaseLocationRow[] {
  return locations
    .filter((l) => l.caseId === c.id)
    .map((l) => ({
      id: l.id,
      locationName: l.locationName,
      address: [l.streetAddress, l.city].filter(Boolean).join(', '),
      status: locationStatusTheme(selectLocationMapStatus(l)),
    }))
}

export function toCaseCards(cases: DemoCase[], locations: DemoLocation[]): CaseCard[] {
  return cases.map((c) => {
    const locs = locationsOf(c, locations)
    return {
      id: c.id,
      caseNumber: c.caseNumber,
      displayName: c.displayName,
      status: caseStatusTheme(c.status),
      personnel: personnelOf(c),
      createdLabel: c.createdLabel,
      locations: locs,
      locationCountLabel: `${locs.length} location${locs.length === 1 ? '' : 's'}`,
    }
  })
}
