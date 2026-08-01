import { escapeHtml, formatDocDate, nowStamp } from '@/features/demo/engine/logic/pdf/shared'
import { assembleNotesString } from '@/features/demo/engine/logic/notes/notes-assembler'
import { hasCapturedCoordinates } from '@/features/demo/engine/logic/coordinates'
import type { GpsCoordinates, NoteSection } from '@/features/demo/engine/types'

/**
 * The Case Notes court document — a print-ready HTML report modelled on the app's
 * `case-notes-template`. Produces a complete standalone document (@page letter portrait)
 * so the demo's preview closely matches the real report.
 */

export interface CaseNotesScope {
  start: string
  end: string
  isActualTime: boolean
  cameras: string
}
export interface CaseNotesAdjusted {
  start: string
  end: string
}
export interface CaseNotesCamera {
  name: string
  resolution: string
  fps: string
  /** Per-camera fix (P3.7). Optional — a camera that was never GPS-captured prints no GPS row,
   *  which is also the phone's behaviour (`cameras-table.ts:50-70`). */
  gps?: GpsCoordinates
}
export interface CaseNotesOffset {
  isCorrect: boolean
  formattedDifference: string
  direction: string
}
export interface CaseNotesDvr {
  dvrLocation?: string
  dvrTypeBrand?: string
  serialModelNumber?: string
  dvrUsername?: string
  dvrPassword?: string
  numberOfChannels?: string
  activeCameras?: string
  recordingSchedule?: string
  resolution?: string
  recordingFps?: string
  totalDvrRetention?: string
}
export interface CaseNotesExport {
  exportMedia?: string
  fileType?: string
  sizeGb?: string
  mediaPlayerIncluded?: boolean
  mediaProvidedVia?: string
}
export interface CaseNotesArrival {
  arrival: string
  departure: string
}

export interface CaseNotesData {
  occNumber?: string
  address?: string
  requesterName?: string
  requesterBadgeNumber?: string
  requesterUnit?: string
  requesterPhone?: string
  requesterEmail?: string
  locationContact?: string
  locationPhone?: string
  scopes?: CaseNotesScope[]
  adjustedScopes?: CaseNotesAdjusted[]
  /** True if some requested scopes could not be converted — annotate, don't silently omit. */
  adjustedScopesPartial?: boolean
  timeOffset?: CaseNotesOffset | null
  dvrDateTime?: string
  actualDateTime?: string
  dvr?: CaseNotesDvr
  cameras?: CaseNotesCamera[]
  export?: CaseNotesExport
  /**
   * SECTIONED notes input (P2.1 — phone parity): the document consumes the
   * seven-section structure + free-text tail and assembles the flat body itself via
   * the canonical `assembleNotesString`, exactly like the phone's template path
   * (`deriveNotesFromStore` → the template's single `.notes` block). Callers pass the
   * READ-ONLY-reconciled sections (Flow F — `selectCaseNotesData`), never a
   * pre-flattened string, so the document's notes body can't fork from the assembler.
   */
  notesSections?: NoteSection[]
  notesFreeText?: string
  /**
   * True when `generateExtractedScopes` dropped ≥1 non-canonical requested scope, so
   * `extractedScopes` — the list the notes' recovered-footage line is built from — is
   * SHORT. The document must say so (P2 review R-3): unlike `adjustedScopesPartial`
   * (recomputed live), this flag describes the stored extracted list, which stays stale
   * until the visitor recalculates — the court PDF may otherwise under-report the
   * recovery with no warning anywhere.
   */
  extractedScopesPartial?: boolean
  arrivalDepartures?: CaseNotesArrival[]
  /**
   * The Completion screen's two fields, which the phone prints as its own
   * `COMPLETION INFORMATION` section (`case-notes-template.ts:331-348`) and the demo did not
   * carry until P7.2 — `completedBy` is where the analyst profile's name lands, so leaving it
   * out would have made the profile pane's "carries it into the Case Notes report" untrue.
   * The section is gated on either having a value, exactly like the phone's `hasCompletionInfo`.
   */
  dateTimeCompleted?: string
  completedBy?: string
  generatedAt?: string
}

const CASE_NOTES_STYLES = `
  @page { margin: 0.75in; size: letter portrait; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #000; background:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 25px; }
  .header h1 { font-size: 18pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
  .header h2 { font-size: 14pt; font-weight: normal; color: #333; margin-bottom: 10px; }
  .header .occ { font-size: 12pt; font-weight: bold; margin-top: 10px; }
  .section { margin-bottom: 25px; page-break-inside: avoid; }
  .section-title { font-size: 13pt; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-grid { display: table; width: 100%; margin-bottom: 12px; }
  .info-row { display: table-row; }
  .info-label { display: table-cell; font-weight: bold; color: #333; width: 200px; padding: 4px 8px 4px 0; vertical-align: top; }
  .info-value { display: table-cell; color: #000; padding: 4px 0; vertical-align: top; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
  thead { background-color: #e8e8e8; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  th { border: 1px solid #000; padding: 10px; text-align: left; font-weight: bold; font-size: 10pt; }
  td { border: 1px solid #333; padding: 8px; font-size: 10pt; }
  tr:nth-child(even) { background-color: #f9f9f9; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .notes { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 10pt; background-color: #f5f5f5; padding: 15px; border: 1px solid #ddd; border-radius: 4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .footer { margin-top: 40px; padding-top: 15px; border-top: 2px solid #000; font-size: 9pt; color: #666; text-align: center; }
  .time-offset { font-weight: bold; color: #d9534f; }
  .callout { background-color: #f0f8ff; padding: 10px; margin-bottom: 10px; border-left: 4px solid #0066cc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .callout p { margin: 0; font-weight: bold; color: #0066cc; }
`

function row(label: string, value: unknown): string {
  if (value == null || String(value).trim() === '') return ''
  return `<div class="info-row"><div class="info-label">${escapeHtml(label)}</div><div class="info-value">${escapeHtml(
    value,
  )}</div></div>`
}

/** Build the Case Notes court document HTML from assembled case data. */
export function generateCaseNotesDoc(d: CaseNotesData): string {
  const e = escapeHtml
  const scopesRows = (d.scopes || [])
    .filter((s) => s.start || s.end)
    .map(
      (s) =>
        `<tr><td>${e(formatDocDate(s.start))}</td><td>${e(formatDocDate(s.end))}</td><td>${e(
          s.isActualTime ? 'Real Time' : 'DVR Time',
        )}</td><td>${e(s.cameras || '—')}</td></tr>`,
    )
    .join('')
  const scopesTable = scopesRows
    ? `<table><thead><tr><th>Start Date/Time</th><th>End Date/Time</th><th>Time Type</th><th>Cameras</th></tr></thead><tbody>${scopesRows}</tbody></table>`
    : '<p style="font-size:10pt;color:#555;">No extraction scopes entered.</p>'

  const adjRows = (d.adjustedScopes || [])
    .filter((s) => s.start || s.end)
    .map((s) => `<tr><td>${e(formatDocDate(s.start))}</td><td>${e(formatDocDate(s.end))}</td></tr>`)
    .join('')
  const adjTable = adjRows
    ? `<table><thead><tr><th>Start Date/Time (Adjusted)</th><th>End Date/Time (Adjusted)</th></tr></thead><tbody>${adjRows}</tbody></table>`
    : ''
  const adjPartialNote = d.adjustedScopesPartial
    ? `<p style="font-size:10pt;color:#d9534f;font-weight:bold;">&#9888; One or more requested time ranges could not be converted to DVR time and are omitted here — confirm the requested times before relying on this section.</p>`
    : ''
  const adjustedSection =
    adjRows || d.adjustedScopesPartial
      ? `
  <div class="section">
    <div class="section-title">Adjusted Scope (Calculated Times)</div>
    <div class="callout"><p>These times have been converted using the calculated DVR time offset.</p></div>
    ${adjTable}
    ${adjPartialNote}
  </div>`
      : ''

  const off = d.timeOffset
  const offsetSection = off
    ? `
  <div class="section">
    <div class="section-title">DVR Time Offset</div>
    <div class="info-grid">
      ${row('DVR Time:', formatDocDate(d.dvrDateTime))}
      ${row('Actual Time:', formatDocDate(d.actualDateTime))}
      <div class="info-row"><div class="info-label">Time Difference:</div><div class="info-value time-offset">${
        off.isCorrect
          ? 'DVR time is CORRECT'
          : 'DVR is ' + e(off.formattedDifference) + ' ' + e(off.direction) + ' real time'
      }</div></div>
    </div>
  </div>`
    : ''

  const dvr = d.dvr || {}
  const dvrRows = [
    row('DVR Location:', dvr.dvrLocation),
    row('DVR Type/Brand:', dvr.dvrTypeBrand),
    row('Serial/Model Number:', dvr.serialModelNumber),
    row('DVR Username:', dvr.dvrUsername),
    row('DVR Password:', dvr.dvrPassword),
    row('Number of Channels:', dvr.numberOfChannels),
    row('Active Cameras:', dvr.activeCameras),
    row('Recording Schedule:', dvr.recordingSchedule),
    row('Resolution:', dvr.resolution),
    row('Recording FPS:', dvr.recordingFps),
    row('Total DVR Retention:', dvr.totalDvrRetention),
  ].join('')
  const dvrSection = dvrRows
    ? `
  <div class="section"><div class="section-title">DVR Information</div><div class="info-grid">${dvrRows}</div></div>`
    : ''

  // Per-camera GPS (P3.7): a full-width continuation row under the camera it belongs to,
  // matching the phone (`cameras-table.ts:63-70`, whose spare leading cell exists because its
  // table carries an extra index column). Gated by the SHARED `hasCapturedCoordinates` policy,
  // so a (0,0) "fix" from a failed capture can never print as an authoritative location in a
  // court document; the accuracy clause is dropped when nothing measured one (R-18).
  const camGpsRow = (gps: GpsCoordinates | undefined): string => {
    if (!gps || !hasCapturedCoordinates(gps)) return ''
    const accuracy =
      gps.accuracyM !== undefined && Number.isFinite(gps.accuracyM)
        ? ` <span style="color:#666">(±${Math.round(gps.accuracyM)}m)</span>`
        : ''
    return `<tr><td></td><td colspan="2"><span class="label">GPS Location</span> ${e(gps.lat.toFixed(6))}, ${e(gps.lng.toFixed(6))}${accuracy}</td></tr>`
  }
  const camRows = (d.cameras || [])
    .filter((c) => c.name || c.resolution || c.fps)
    .map(
      (c) =>
        `<tr><td>${e(c.name || '—')}</td><td>${e(c.resolution || '—')}</td><td>${e(c.fps || '—')}</td></tr>` +
        camGpsRow(c.gps),
    )
    .join('')
  const camerasSection = camRows
    ? `
  <div class="section"><div class="section-title">Individual Camera Details</div>
    <table><thead><tr><th>Camera</th><th>Resolution</th><th>FPS</th></tr></thead><tbody>${camRows}</tbody></table></div>`
    : ''

  const ex = d.export || {}
  const exRows = [
    row('Export Media:', ex.exportMedia),
    row('File Type:', ex.fileType),
    ex.sizeGb && Number(ex.sizeGb) > 0 ? row('Size (GB):', ex.sizeGb + ' GB') : '',
    ex.mediaPlayerIncluded ? row('Media Player Included:', 'Yes') : '',
    row('Media Provided Via:', ex.mediaProvidedVia),
  ].join('')
  const exportSection = exRows
    ? `
  <div class="section"><div class="section-title">Export Information</div><div class="info-grid">${exRows}</div></div>`
    : ''

  // The notes body is assembled from the SECTIONED input here — the canonical
  // assembler is the only flattening path (matches the phone's template semantics:
  // one pre-wrap `.notes` block containing the registry-ordered section blocks).
  const notesFlat = assembleNotesString(d.notesSections ?? [], d.notesFreeText ?? '')
  // R-3: a flagged-partial extracted list means the recovered-footage line above was
  // built from a SHORT list — annotate, don't silently under-report (the
  // adjustedScopesPartial idiom). Rendered even if the notes body is empty: the flag
  // describes the recovery record, not the prose.
  const notesPartialNote = d.extractedScopesPartial
    ? `<p style="font-size:10pt;color:#d9534f;font-weight:bold;">&#9888; One or more requested time ranges could not be converted to DVR time when the extracted scopes were last calculated — the recovered footage reported in these notes may be incomplete. Recalculate on the Time Offset screen after correcting the requested times.</p>`
    : ''
  const notesSection =
    notesFlat.trim() || notesPartialNote
      ? `
  <div class="section"><div class="section-title">Case Notes</div>${
    notesFlat.trim() ? `<div class="notes">${e(notesFlat)}</div>` : ''
  }${notesPartialNote}</div>`
      : ''

  const adRows = (d.arrivalDepartures || [])
    .filter((a) => a.arrival || a.departure)
    .map((a) => `<tr><td>${e(formatDocDate(a.arrival))}</td><td>${e(formatDocDate(a.departure))}</td></tr>`)
    .join('')
  const adSection = adRows
    ? `
  <div class="section"><div class="section-title">Arrival &amp; Departure Times</div>
    <table><thead><tr><th>Arrival</th><th>Departure</th></tr></thead><tbody>${adRows}</tbody></table></div>`
    : ''

  // Phone `COMPLETION INFORMATION` (case-notes-template.ts:331-348), same position (after
  // arrival/departure, before the footer) and the same `hasCompletionInfo` gate: the section
  // appears when EITHER field has a value, and each row is dropped individually when its own is
  // empty — which `row()` already does.
  // `formatDocDate` answers 'N/A' for an unset value, so the date is formatted only when there
  // is one — otherwise the row's own empty-value drop would never fire.
  const completionRows =
    row('Date & Time Completed:', d.dateTimeCompleted ? formatDocDate(d.dateTimeCompleted) : '') +
    row('Completed By:', d.completedBy)
  const completionSection = completionRows
    ? `
  <div class="section"><div class="section-title">Completion Information</div><div class="info-grid">${completionRows}</div></div>`
    : ''

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>FVU Case Notes - ${e(
    d.occNumber,
  )}</title><style>${CASE_NOTES_STYLES}</style></head><body>
  <div class="header"><h1>Forensic Video Unit</h1><h2>CCTV Recovery Case Notes</h2><div class="occ">Case #${e(
    d.occNumber || 'N/A',
  )}</div></div>
  <div class="section"><div class="section-title">Case Information</div><div class="info-grid">
    ${row('OCC Number:', d.occNumber || 'N/A')}
    ${row('Location:', d.address || 'N/A')}
    ${row('Requested By:', d.requesterName)}
    ${row('Badge Number:', d.requesterBadgeNumber)}
    ${row('Unit:', d.requesterUnit)}
    ${row('Requester Phone:', d.requesterPhone)}
    ${row('Requester Email:', d.requesterEmail)}
    ${row('Location Contact:', d.locationContact)}
    ${row('Contact Phone:', d.locationPhone)}
  </div></div>
  <div class="section"><div class="section-title">Extraction Scope (As Entered)</div>${scopesTable}</div>
  ${adjustedSection}
  ${offsetSection}
  ${dvrSection}
  ${camerasSection}
  ${exportSection}
  ${notesSection}
  ${adSection}
  ${completionSection}
  <div class="footer"><p>Report generated on ${e(d.generatedAt || nowStamp())}</p><p>Forensic Video Unit - Case Report System v1.0</p></div>
  </body></html>`
}
