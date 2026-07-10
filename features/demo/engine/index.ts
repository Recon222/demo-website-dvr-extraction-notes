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

// ---- Logic: time / OCR / import / PDF ----
export * from '@/features/demo/engine/logic/time'
export * from '@/features/demo/engine/logic/ocr'
export * from '@/features/demo/engine/logic/import'
export { parseCoordinate, formatCoordinate, type CoordKind, type ParseCoordinateResult } from '@/features/demo/engine/logic/coordinates'
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
} from '@/features/demo/engine/store/create-store'
export {
  selectCurrentCase,
  selectCurrentLocation,
  selectLocationsForCase,
  selectVisibleWizardScreens,
  selectDrawerItems,
  selectCaseNotesData,
} from '@/features/demo/engine/store/selectors'
