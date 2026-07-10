/**
 * Display-shaping for the rich import-completion screen (pure; same pattern as screenData.ts).
 * Turns a MappedImport patch + meta into grouped, empty-omitting sections + scope rows for
 * ImportResultBody / ImportResultAccordion to render. Scope dates are already canonical (Slice A).
 */

import type { MappedImport } from '@/features/demo/engine/logic/import'
import type { FallbackMode } from '@/features/demo/ui/import/run-import'

export interface DetailRow {
  label: string
  value: string
}
export interface DetailSection {
  heading: string
  rows: DetailRow[]
}
export interface ScopeRow {
  label: string
  range: string
  isActualTime: boolean
  cameras: string
}
export interface WarningView {
  field: string
  reason: string
}
export interface ImportedLocationView {
  locId: string | null
  title: string
  caseNumber: string
  fieldCount: number
  timeFrameCount: number
  sections: DetailSection[]
  scopes: ScopeRow[]
  warnings: WarningView[]
  /** True when this card's data came from the SAMPLE substitute (any non-'none'
   *  fallback) — badged in place so a batch's fabricated card is attributable
   *  next to real ones (review M1). */
  isSample: boolean
}

/** A section is included only if it has at least one non-empty row; empty rows are dropped. */
function section(heading: string, rows: Array<[string, string]>): DetailSection | null {
  const present = rows
    .map(([label, value]) => ({ label, value: (value || '').trim() }))
    .filter((r) => r.value.length > 0)
  return present.length ? { heading, rows: present } : null
}

export function buildImportedLocationView(input: {
  patch: MappedImport
  caseNumber: string
  warnings: WarningView[]
  locId: string | null
  fieldCount: number
  timeFrameCount: number
  filename?: string
  fallbackMode: FallbackMode
}): ImportedLocationView {
  const { patch, caseNumber, warnings, locId, fieldCount, timeFrameCount, filename, fallbackMode } = input
  const imp = patch._import

  const sections = [
    section('Requesting Officer', [
      ['Name', patch.requesterName],
      ['Badge', patch.requesterBadgeNumber],
      ['Phone', patch.requesterPhone],
      ['Email', patch.requesterEmail],
    ]),
    section('Recovery Location', [
      ['Offence', imp.offenceType],
      ['Business', patch.businessName],
      ['Street', patch.streetAddress],
      ['City', patch.city],
      ['On-site contact', patch.locationContact],
      ['Contact phone', patch.locationPhone],
    ]),
    section('DVR Information', [
      ['Make / Model', imp.dvrTypeBrand],
      ['Retention', imp.totalDvrRetention],
      ['Video monitor', imp.hasVideoMonitor],
      ['Username', imp.dvrUsername],
      ['Password', imp.dvrPassword],
    ]),
  ].filter((s): s is DetailSection => s !== null)

  const scopes: ScopeRow[] = imp.timeFrames.map((t, i) => {
    const start = (t.startDateTime || '').trim()
    const end = (t.endDateTime || '').trim()
    const range = start && end ? `${start} → ${end}` : start || end || '—'
    return { label: `Scope ${i + 1}`, range, isActualTime: t.isActualTime, cameras: (t.cameras || '').trim() }
  })

  return {
    locId,
    title: patch.businessName || filename || 'Imported location',
    caseNumber,
    fieldCount,
    timeFrameCount,
    sections,
    scopes,
    warnings,
    isSample: fallbackMode !== 'none',
  }
}
