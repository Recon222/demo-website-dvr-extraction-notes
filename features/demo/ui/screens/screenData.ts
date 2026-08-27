import type { CaseStatus, DemoCase, DemoLocation } from '@/features/demo/engine/types'
import { formatAddress } from '@/features/demo/engine/logic/address-format'
import { caseStatusSheetLabel } from '@/features/demo/engine/logic/case-actions'
import { formatCoordinate, hasCapturedCoordinates } from '@/features/demo/engine/logic/coordinates'
import { selectLocationMapStatus, type LocationMapStatus } from '@/features/demo/engine/store/selectors'
import { STATUS_LABEL } from '@/features/demo/ui/screens/map/mapTokens'
import { STATUS_SEVERITY, neutralTone, severityTone, type SeverityTone } from '@/features/demo/ui/tokens/status'

/** UI-data mappers: shape the store's cases/locations into the display rows the dumb screens
 *  render. Lives in the UI layer (not the engine) so screens stay presentational. */

/**
 * A resolved status: the severity recipe's four parts plus the word that names it.
 *
 * `color` is the `*OnLight` FOREGROUND, not the accent — spending it as a bare dot is the
 * defect `tokens/status.ts` documents. A dot takes `.accent`.
 */
export interface StatusTheme extends SeverityTone {
  label: string
}

/**
 * Phone `CaseStatusBadge.getStatusConfig` (`:140-167`), the CaseStatus half.
 *
 * DRAFT displays as **"Active"** — the phone renames it in the badge and defers the enum rename
 * (`CaseStatusBadge.tsx:142-144`), and `case-modal.tsx:134` performs the same rename. ARCHIVED
 * is the neutral, which is the ABSENCE of a severity rather than a fifth one.
 */
export function caseStatusTheme(status: DemoCase['status']): StatusTheme {
  switch (status) {
    case 'complete':
      return { label: 'Complete', ...severityTone('success') }
    case 'archived':
      return { label: 'Archived', ...neutralTone() }
    default:
      return { label: 'Active', ...severityTone('warning') }
  }
}

/**
 * Truthful per-location status (G3): the same started/working/complete the map derives from
 * per-screen completion.
 *
 * **These are NO LONGER `MAP_PIN_COLORS`, and that is the whole point of A70.** `PIN_COLORS`
 * stays theme-invariant because it paints marks ONTO satellite tiles; a badge inside a
 * theme-aware surface is not on a tile, and routing one through the other is what the phone
 * measured at 1.26:1 (phone `status-severity.ts:37-52`). The pins now assert the split: the pin
 * colours are unchanged, and these route through `STATUS_SEVERITY`.
 *
 * The LABELS are still shared with the map legend — one vocabulary, two palettes.
 */
export function locationStatusTheme(status: LocationMapStatus): StatusTheme {
  return { label: STATUS_LABEL[status], ...severityTone(STATUS_SEVERITY[status]) }
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
