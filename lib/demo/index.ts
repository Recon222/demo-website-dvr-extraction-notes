/**
 * Public API of the interactive-demo engine.
 *
 * External code imports from '@/lib/demo'; internal modules use their aliased paths.
 * Milestone 1 ships the pure logic core (types · content registries · time/OCR/import/PDF
 * logic). Milestone 2 will add the store + director to this barrel.
 */

// ---- Domain types ----
export type * from '@/lib/demo/types'

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
} from '@/lib/demo/content/screens'
export { NARRATION, MODAL_NARRATION } from '@/lib/demo/content/narration'
export { SEED_CASE, SEED_LOCATION, SAMPLE_REQUEST_DOC } from '@/lib/demo/content/seed'
export { FORENSIC, getProfile } from '@/lib/demo/content/profiles'

// ---- Logic: time / OCR / import / PDF ----
export * from '@/lib/demo/logic/time'
export * from '@/lib/demo/logic/ocr'
export * from '@/lib/demo/logic/import'
export { generateCaseNotesDoc, type CaseNotesData } from '@/lib/demo/logic/pdf/case-notes'
export { generateTimeOffsetDoc, type TimeOffsetDocData } from '@/lib/demo/logic/pdf/time-offset'

// ---- Store (Milestone 2) ----
export {
  createDemoStore,
  type DemoStore,
  type DemoState,
  type DemoActions,
  type CaptureState,
  type NewCaseInput,
  type NewLocationInput,
} from '@/lib/demo/store/create-store'
export {
  selectCurrentCase,
  selectCurrentLocation,
  selectLocationsForCase,
  selectVisibleWizardScreens,
  selectDrawerItems,
  selectCaseNotesData,
} from '@/lib/demo/store/selectors'

// ---- Director (Milestone 2) ----
export { runBeat, realClock, type Clock, type RunBeatOptions, type BeatHandle } from '@/lib/demo/director/runner'
export { BEATS } from '@/lib/demo/director/beats'
export type { Beat, BeatStep, PulseEvent } from '@/lib/demo/director/types'
