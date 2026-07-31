import type { CaseStatus, DemoCase, DemoLocation } from '@/features/demo/engine/types'
import { formatAddress } from '@/features/demo/engine/logic/address-format'
import { caseStatusSheetLabel } from '@/features/demo/engine/logic/case-actions'
import { formatCoordinate, hasCapturedCoordinates } from '@/features/demo/engine/logic/coordinates'
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
      // Street+city only (the business name is its own row); street types abbreviated by
      // formatAddress, exactly as the phone's composed `address` renders them.
      address: formatAddress('', l.streetAddress, l.city),
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

// ---- Case Actions Sheet (P3.2, matrix row 9) --------------------------------------------

/** One label/value line of the read-only case report. */
export interface CaseSheetRow {
  label: string
  value: string
  /** Monospace + tighter — the phone's coordinate-row treatment (CaseActionsSheet.tsx:434-437). */
  mono?: boolean
}

/** A titled block of the report. `body` is free text rendered as a paragraph (the Notes group,
 *  which the phone renders directly rather than through its `reportRow` helper — and therefore
 *  uncapped, where every row value is `numberOfLines={3}`). */
export interface CaseSheetGroup {
  id: string
  title: string
  rows: CaseSheetRow[]
  body?: string
}

export interface CaseSheetData {
  id: string
  caseNumber: string
  /** Only set when a display name exists AND differs from the case number (phone :137-138). */
  displayName: string
  /** Raw status — drives `actionsForStatus`. */
  status: CaseStatus
  /** `Status: {label}` copy — see `caseStatusSheetLabel`. */
  statusLabel: string
  groups: CaseSheetGroup[]
}

/** "Name · #Badge" / "Name" / "#Badge" / "" — port of the phone's `nameWithBadge` (:64-72). */
function nameWithBadge(name: string, badge: string): string {
  const n = name.trim()
  const b = badge.trim()
  if (n && b) return `${n} · #${b}`
  if (n) return n
  if (b) return `#${b}`
  return ''
}

/**
 * Shape a case into the sheet's read-only report — the phone's derivation block
 * (`CaseActionsSheet.tsx:136-233`) with the demo's field names.
 *
 * Group order and presence conditions are the phone's: Case Personnel → Incident Location →
 * Notes → Details, each omitted when it has nothing to say except Details, which is always
 * present. Empty rows are dropped rather than rendered as placeholders.
 *
 * TWO DEMO-SIDE DIFFERENCES, both because the field simply does not exist here:
 * - The phone's Address row falls back to a composed `incidentAddress` when there is no
 *   discrete street; `DemoCase` carries only `incidentStreetAddress`, so there is one arm.
 * - The phone's `Created` row parses an ISO timestamp (`formatCreated`); the demo stores a
 *   ready-made `createdLabel` (there is no clock at case-creation time — see the no-Date.now
 *   rule), so the label is passed through exactly as the dashboard card shows it.
 */
export function toCaseSheet(c: DemoCase, locations: DemoLocation[]): CaseSheetData {
  const groups: CaseSheetGroup[] = []

  const oicLabel = nameWithBadge(c.oicName, c.oicBadge)
  const vcLabel = nameWithBadge(c.vcName, c.vcBadge)
  const unit = c.unit.trim()
  if (oicLabel || vcLabel || unit) {
    const rows: CaseSheetRow[] = []
    if (oicLabel) rows.push({ label: 'Officer in Charge', value: oicLabel })
    if (vcLabel) rows.push({ label: 'Video Coordinator', value: vcLabel })
    if (unit) rows.push({ label: 'Unit', value: unit })
    groups.push({ id: 'personnel', title: 'Case Personnel', rows })
  }

  const business = c.incidentBusinessName.trim()
  const street = c.incidentStreetAddress.trim()
  const city = c.incidentCity.trim()
  // BUG-008 parity: gate on a CAPTURED position, not on object presence — a (0,0) pair must
  // never render as an authoritative coordinate in a court-facing panel.
  const coords = hasCapturedCoordinates(c.incidentCoordinates) ? c.incidentCoordinates : undefined
  if (business || street || city || coords) {
    const rows: CaseSheetRow[] = []
    if (business) rows.push({ label: 'Business', value: business })
    if (street) rows.push({ label: 'Address', value: street })
    if (city) rows.push({ label: 'City', value: city })
    if (coords) rows.push({ label: 'Coordinates', value: formatCoordinate(coords.lat, coords.lng), mono: true })
    groups.push({ id: 'incident', title: 'Incident Location', rows })
  }

  const notes = c.notes.trim()
  if (notes) groups.push({ id: 'notes', title: 'Notes', rows: [], body: notes })

  const locationCount = locations.filter((l) => l.caseId === c.id).length
  groups.push({
    id: 'meta',
    title: 'Details',
    rows: [
      { label: 'Locations', value: String(locationCount) },
      { label: 'Created', value: c.createdLabel },
    ],
  })

  const displayName = c.displayName.trim()
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    displayName: displayName && displayName !== c.caseNumber ? displayName : '',
    status: c.status,
    statusLabel: caseStatusSheetLabel(c.status),
    groups,
  }
}
