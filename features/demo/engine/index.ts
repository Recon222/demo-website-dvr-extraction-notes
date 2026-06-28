/**
 * Public API of the interactive-demo engine.
 *
 * External code imports from '@/features/demo/engine'; internal modules use their aliased paths.
 * Milestone 1 shipped the pure logic core (types · content registries · time/OCR/import/PDF
 * logic); Milestone 2 adds the store, selectors, and director. The UI (M3+) consumes this.
 */

// ---- Domain types ----
export type * from '@/features/demo/engine/types'

// ---- Content registries ----
export {
  TOUR_CHAPTERS,
  WIZARD_SCREENS,
  LAUNCHABLE,
  DRAWER_DEFS,
  chapterNumber,
  wizardNumber,
  nextChapter,
  prevChapter,
} from '@/features/demo/engine/content/screens'
export { NARRATION, MODAL_NARRATION } from '@/features/demo/engine/content/narration'
export { SEED_CASE, SEED_LOCATION, SAMPLE_REQUEST_DOC } from '@/features/demo/engine/content/seed'
export { FORENSIC, getProfile } from '@/features/demo/engine/content/profiles'

// ---- Logic: time / OCR / import / PDF ----
export * from '@/features/demo/engine/logic/time'
export * from '@/features/demo/engine/logic/ocr'
export * from '@/features/demo/engine/logic/import'
export { generateCaseNotesDoc, type CaseNotesData } from '@/features/demo/engine/logic/pdf/case-notes'
export { generateTimeOffsetDoc, type TimeOffsetDocData } from '@/features/demo/engine/logic/pdf/time-offset'

// ---- Store (Milestone 2) ----
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

// ---- Director (Milestone 2) ----
export { runBeat, realClock, type Clock, type RunBeatOptions, type BeatHandle } from '@/features/demo/engine/director/runner'
export { BEATS } from '@/features/demo/engine/director/beats'
export type { Beat, BeatStep, PulseEvent } from '@/features/demo/engine/director/types'
