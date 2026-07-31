/**
 * Notes module types — the formatter input shape and section definition.
 *
 * Ported from the phone's `src/features/documentation/notes/types.ts` (P2.1). The
 * stored `NoteSection` / `NoteSectionId` live in `engine/types` (they are part of the
 * persisted domain); THIS file owns only the generation-side shapes.
 *
 * `NotesRelevantFormData` is deliberately kept field-for-field identical to the
 * phone's, so the seven formatters port verbatim. The demo's store shape differs
 * (structured location fields, derived corrected times, `arrival`/`departure` keys) —
 * `notes-relevant-data.ts` is the ONE coercion site that adapts it.
 */

import type { NoteSectionId, OFFSET_DIRECTIONS } from '@/features/demo/engine/types'

/** A requested scope as the notes formatters see it (phone `scopes` entry shape).
 *  `corrected*` appear only once the offset calculation has produced both times. */
export interface NotesScope {
  startDateTime: string
  endDateTime: string
  isActualTime: boolean
  cameras: string
  correctedStartDateTime?: string
  correctedEndDateTime?: string
}

/** An extracted (auto-calculated, DVR-time) scope — phone `ExtractedScope` shape. */
export interface NotesExtractedScope {
  startDateTime: string
  endDateTime: string
  cameras: string
}

/** A camera entry as the (registry-disconnected) camera formatter sees it — the demo's
 *  `CameraEntry` GPS shape (`gps?: { lat, lng, accuracyM }`), not the phone's flat
 *  `latitude`/`longitude`/`coordinateAccuracy` triple. */
export interface NotesCamera {
  cameraName: string
  resolution: string
  recordingFps: string
  gps?: { lat: number; lng: number; accuracyM?: number }
}

/**
 * Form data relevant to notes generation — the input every section formatter reads.
 * Built ONLY by `extractNotesRelevantData` (architecture rule F5: output comparison is
 * stable only if every caller coerces identically).
 */
export interface NotesRelevantFormData {
  address: string
  // Structured address components. When present, formatAddressAndVisits assembles
  // the location string from these fields directly; `address` is the legacy/import
  // fallback (always '' in the demo — locations are created structured).
  businessName?: string
  streetAddress?: string
  city?: string
  arrivalDepartures: Array<{
    arrivalDateTime: string
    departureDateTime: string
  }>
  scopes: NotesScope[]
  extractedScopes?: NotesExtractedScope[]
  timeOffsetData?: {
    formattedDifference: string
    direction: (typeof OFFSET_DIRECTIONS)[number]
  }
  /** Camera inventory. Optional — the cameras section renders '' when absent. */
  cameras?: NotesCamera[]
  totalDvrRetention: string
  exportMedia: string
  sizeGb: string
  mediaProvidedVia: string
}

/**
 * Static definition mapping a section ID to its display label and formatter.
 * The registry (SECTION_DEFINITIONS) is the single source of truth for section
 * identity, display order, and — via `label` — UI/accessibility strings.
 */
export interface SectionDefinition {
  id: NoteSectionId
  /** UI display label (single source of truth for section identity/accessibility). */
  label: string
  formatter: (formData: NotesRelevantFormData) => string
}
