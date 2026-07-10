/**
 * Domain types for the interactive demo engine. These describe the in-memory state
 * the demo holds — there is no backend; everything is per-session. Simplified from the
 * real app's SQLite model, keeping only what the demo renders.
 *
 * See docs/features/interactive-demo/01-interactive-demo-architecture.md §4.
 */

// ---- Profiles ---------------------------------------------------------------
export type Profile = 'forensic' | 'canvas'

// ---- Screen identifiers -----------------------------------------------------
/** The 10 in-drawer wizard screens, in Next/Back order. */
export type WizardScreenId =
  | 'submission'
  | 'requestedScope'
  | 'arrivalDeparture'
  | 'timeOffset'
  | 'extractedScope'
  | 'dvrInfo'
  | 'cameras'
  | 'exportInfo'
  | 'notes'
  | 'completion'

/** App chapters shown before the wizard, plus the wizard screens themselves. */
export type ChapterId = 'splash' | 'dashboard' | 'cases' | WizardScreenId

/** Launch-only screens — opened by an action button, NEVER in Next/Back. */
export type LaunchableId = 'ocr' | 'mediaCapture' | 'audioRecording'

/** Overlay modals. */
export type ModalId = 'newCase' | 'newLocation' | 'import' | 'mediaLibrary'

// ---- Content / form value types --------------------------------------------
export interface ScopeEntry {
  id: string
  startDateTime: string
  endDateTime: string
  /** true = wall-clock/real time; false = DVR time. Drives the offset math. */
  isActualTime: boolean
  cameras: string
}

export interface ArrivalDeparture {
  id: string
  arrival: string
  departure: string
}

export interface SyncResult {
  method: 'NTP' | 'HTTP'
  server: string
  offsetMs: number
  uncertaintyMs: number
  rttMs?: number
  traceability?: string
  /** Unix ms when the sync completed — drives the card's "Calibrated at" row. */
  timestamp?: number
  /** Responding server stratum (1–15) — encoded in the traceability chain. */
  stratum?: number
}

export interface OcrProof {
  rawText: string
  cleanedText: string
  parsedDateTime: string
  confidence: number
  imageDataUrl?: string
}

export interface TimeOffsetData {
  dvrDateTime: string
  actualDateTime: string
  differenceMs: number
  formattedDifference: string
  direction: 'AHEAD OF' | 'BEHIND'
  isDvrAhead: boolean
  isCorrect: boolean
  dvrAppliesDST: boolean
  /** NTP calibration metadata (simulated in the demo); null = manual, unverified. */
  sync: SyncResult | null
  captureMethod: 'manual' | 'ocr'
  ocr?: OcrProof
}

/** A GPS fix: latitude/longitude with the achieved accuracy in metres. */
export interface GpsCoordinates {
  lat: number
  lng: number
  accuracyM: number
}

export interface CameraEntry {
  id: string
  cameraName: string
  resolution: string
  recordingFps: string
  gps?: GpsCoordinates
}

export interface DvrInformation {
  dvrLocation: string
  dvrTypeBrand: string
  serialModelNumber: string
  dvrUsername: string
  dvrPassword: string
  numberOfChannels: string
  activeCameras: string
  recordingSchedule: string
  resolution: string
  recordingFps: string
  /** Earliest date the DVR has on disk. Drives the derived retention (see logic/retention). */
  firstRecordedDate: string
  /** Derived: total retention window, written back as "N days" for the PDF/notes. */
  totalDvrRetention: string
}

export interface ExportInformation {
  exportMedia: string
  fileType: string
  sizeGb: string
  mediaPlayerIncluded: boolean
  mediaProvidedVia: string
}

export type MediaKind = 'photo' | 'video' | 'audio'

export interface MediaItem {
  id: string
  kind: MediaKind
  url: string
  poster?: string
  filename: string
  caption: string
  capturedAt: string
  durationSec?: number
  /** true when produced from a sample (no real camera/mic). */
  sample?: boolean
}

export interface LocationForm {
  scopes: ScopeEntry[]
  /** Auto-generated, always DVR-time, derived from the offset. */
  extractedScopes: ScopeEntry[]
  /** True if generateExtractedScopes skipped ≥1 non-canonical scope, so the Adjusted Scope
   *  output is incomplete and must be annotated rather than silently omitted. */
  extractedScopesPartial: boolean
  arrivalDepartures: ArrivalDeparture[]
  timeOffset: TimeOffsetData | null
  dvr: DvrInformation
  cameras: CameraEntry[]
  export: ExportInformation
  notesText: string
  notesEdited: boolean
  /** Completion screen entry fields. */
  dateTimeCompleted: string
  completedBy: string
  media: { photos: MediaItem[]; videos: MediaItem[]; audios: MediaItem[] }
}

// ---- Entities ---------------------------------------------------------------
export interface DemoCase {
  id: string
  caseNumber: string
  displayName: string
  unit: string
  oicName: string
  oicBadge: string
  vcName: string
  vcBadge: string
  /** Incident location (the occurrence scene — distinct from the recovery locations). */
  incidentBusinessName: string
  incidentStreetAddress: string
  incidentCity: string
  /** Incident scene coordinates — geocoded from the address pick or entered by hand. Unlike a
   *  recovery location (which always has a real street address), the incident can be anywhere
   *  (a scene in the woods), so coordinates may exist without/independent of the address. */
  incidentCoordinates?: { lat: number; lng: number; source: 'geocoded' | 'manual' }
  /** Free-text case notes. */
  notes: string
  status: 'draft' | 'complete' | 'archived'
  createdLabel: string
  locationIds: string[]
}

export interface DemoLocation {
  id: string
  caseId: string
  locationName: string
  businessName: string
  streetAddress: string
  city: string
  requesterName: string
  requesterBadge: string
  /** Requester's unit/section (defaults to the case unit if left blank). */
  requesterUnit: string
  requesterPhone: string
  requesterEmail: string
  locationContact: string
  locationPhone: string
  gps?: GpsCoordinates & { source: 'gps' | 'geocoded' | 'manual' }
  form: LocationForm
}

// ---- Content registries -----------------------------------------------------
export interface ChapterNarration {
  eyebrow: string
  title: string
  paras: string[]
  bullets: string[]
  tip?: string
}

export interface DrawerDef {
  id: WizardScreenId
  label: string
  icon: string
}

export interface ProfileConfig {
  id: Profile
  wizardScreens: WizardScreenId[]
  hiddenFields: string[]
}
