/**
 * Public API of the interactive-demo engine — the pure state/logic core: domain types,
 * content registries, the time/OCR/import/PDF logic, and the Zustand store + selectors.
 * Consumed by the demo UI in features/demo/ui. (The guided-tour director was removed —
 * the demo is sandbox-only; see docs/features/demo-explorer/.)
 *
 * External code imports from '@/features/demo/engine'; internal modules use their aliased paths.
 */

// ---- Domain types ----
export type * from '@/features/demo/engine/types'

// ---- Content registries ----
export {
  CHAPTERS,
  WIZARD_SCREENS,
  LAUNCHABLE,
  DRAWER_DEFS,
  chapterNumber,
  wizardNumber,
  nextChapter,
  prevChapter,
} from '@/features/demo/engine/content/screens'
export { NARRATION, MODAL_NARRATION } from '@/features/demo/engine/content/narration'
export { SAMPLE_REQUEST_DOC } from '@/features/demo/engine/content/seed'
export { FORENSIC, getProfile } from '@/features/demo/engine/content/profiles'
export {
  CUSTOM_VALUE,
  EXPORT_MEDIA_OPTIONS,
  FILE_TYPE_OPTIONS,
  MEDIA_PROVIDED_OPTIONS,
  RESOLUTION_OPTIONS,
  FPS_OPTIONS,
  RECORDING_SCHEDULE_OPTIONS,
  isCustomResolution,
  isCustomFps,
  parseRecordingSchedule,
  toggleRecordingSchedule,
  type PickerOption,
} from '@/features/demo/engine/content/form-options'

// ---- Logic: time / OCR / import / PDF ----
export * from '@/features/demo/engine/logic/time'
export * from '@/features/demo/engine/logic/dst-advisory'
export * from '@/features/demo/engine/logic/ocr'
export * from '@/features/demo/engine/logic/import'
// NOTE (review R-10): engine/logic/import-log is deliberately NOT re-exported here. Every
// consumer (pipeline, hook, bridge, terminal) uses the internal path, per this feature's
// convention — and the barrel should not advertise the mutable importLogBus singleton as
// public surface with zero consumers. Import from '@/features/demo/engine/logic/import-log'.
export {
  parseCoordinate,
  formatCoordinate,
  hasCapturedCoordinates,
  type CoordKind,
  type ParseCoordinateResult,
} from '@/features/demo/engine/logic/coordinates'
export { assertNever } from '@/features/demo/engine/logic/assert-never'
export {
  actionsForStatus,
  caseStatusSheetLabel,
  type StatusActions,
} from '@/features/demo/engine/logic/case-actions'
export {
  FINAL_SUBMISSION_MESSAGES,
  finalSubmissionSchema,
  toFinalSubmissionInput,
  validateFinalSubmission,
  type FinalSubmissionInput,
  type FinalSubmissionOutcome,
} from '@/features/demo/engine/logic/final-submission'
export { abbreviateStreetTypes, formatAddress } from '@/features/demo/engine/logic/address-format'
export {
  ACCURACY_MODE_TARGET_M,
  ACCURACY_RATINGS,
  GPS_ACCURACY_MODES,
  GPS_CONFIG_STATIC,
  GPS_ERROR_CODES,
  GPS_MESSAGES,
  PRECISE_GPS_CONFIG,
  buildGpsConfig,
  formatAccuracy,
  getAccuracyRating,
  gpsSourceLabel,
  gpsTimeoutMessage,
  meetsTargetAccuracy,
  selectBestSample,
  toGpsFix,
  validateCoordinates,
  type AccuracyRating,
  type AccuracyRatingLabel,
  type AccuracyTone,
  type GpsAccuracyMode,
  type GpsCaptureOutcome,
  type GpsConfig,
  type GpsErrorCode,
  type GpsFailure,
  type GpsFix,
  type GpsSample,
} from '@/features/demo/engine/logic/gps'
// Notes generation (P2.1 — the phone's seven-section registry port)
export {
  SECTION_DEFINITIONS,
  sectionLabel,
  freshSectionContent,
  isSectionStale,
  reconcileSections,
  assembleNotesString,
  extractNotesRelevantData,
  buildNotesSectionMeta,
  type NoteSectionMeta,
  type NotesRelevantFormData,
  type SectionDefinition,
} from '@/features/demo/engine/logic/notes'
export { generateCaseNotesDoc, type CaseNotesData } from '@/features/demo/engine/logic/pdf/case-notes'
export { generateTimeOffsetDoc, type TimeOffsetDocData } from '@/features/demo/engine/logic/pdf/time-offset'

// ---- Store ----
export {
  createDemoStore,
  type DemoStore,
  type DemoState,
  type DemoActions,
  type CaptureState,
  type NewCaseInput,
  type NewLocationInput,
  type PersistedState,
  type ScrapAllMode,
  type RestoreAllMode,
} from '@/features/demo/engine/store/create-store'
export {
  PERSISTENCE_ENABLED,
  SNAPSHOT_KEY,
  SNAPSHOT_VERSION,
  SAVE_DEBOUNCE_MS,
  loadSnapshot,
  persistDemoStore,
  snapshotOf,
  type PersistenceHandle,
  type StorageLike,
} from '@/features/demo/engine/store/persistence'
export {
  selectCurrentCase,
  selectCurrentLocation,
  selectLocationsForCase,
  selectVisibleWizardScreens,
  selectDrawerItems,
  selectCaseNotesData,
} from '@/features/demo/engine/store/selectors'
