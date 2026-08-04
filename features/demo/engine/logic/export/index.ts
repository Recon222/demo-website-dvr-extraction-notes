/**
 * Export module — the phone's export engine, ported for the demo (P5.1; matrix rows 7, 24, 25,
 * 28; phone-inventory T15/T17/T18). Pure logic in three layers:
 *
 * - `selection` — the `ExportSelection` state machine (arm / toggle / prune) and the one
 *   decision the CTA copy, the artifact descriptor and the dispatch all read.
 * - `validation` — `validateLocationForPdf` and its case / subset aggregates.
 * - `stage`      — the export modal's stage vocabulary, progress copy, mode precedence and
 *   validation-prompt wording.
 * - `flow`       — the stage/policy machine: entry guards, the alert taxonomy, and the
 *   arm/consume rules that keep a validated Continue on the route it was armed with.
 *
 * Internal barrel, mirroring `engine/logic/media/` and `engine/logic/notes/`: consumers import
 * from HERE (`@/features/demo/engine/logic/export`); the co-located unit tests import the
 * specific module they exercise.
 *
 * Deliberately NOT re-exported from `engine/index.ts`, following the `media` / `import-log`
 * precedent (review R-10): the consumers (P5.2's Export tab, P5.3's export modals) reach it by
 * module path, and advertising a second surface with no callers is the orphaned-barrel drift
 * that convention exists to prevent. Add it there alongside a consumer that needs it.
 *
 * NOTHING HERE IS PERSISTED. Export selection is ephemeral by design — see the note at the top
 * of `selection.ts`; the flow state is transient chrome. `engine/store/persistence.ts` and
 * `SNAPSHOT_VERSION` are untouched by this module.
 */

export {
  CASE_CHECKBOX_STATES,
  EXPORT_ARTIFACT_KINDS,
  caseCheckboxState,
  isFullCaseSelection,
  pruneSelection,
  resolveExportPlan,
  toggleCaseSelection,
  toggleLocationSelection,
  type CaseCheckboxState,
  type ExportArtifactKind,
  type ExportSelectableCase,
  type ExportSelection,
  type ExportSelectionPlan,
} from '@/features/demo/engine/logic/export/selection'

export {
  CaseValidationError,
  PDF_VALIDATION_FIELDS,
  validateLocationForPdf,
  validateLocationSubsetForPdf,
  validateLocationsForPdf,
  type CasePdfValidationResult,
  type LocationPdfValidation,
  type ValidatableCase,
  type ValidatableLocation,
} from '@/features/demo/engine/logic/export/validation'

export {
  DEMO_EXPORT_STAGES,
  EXPORT_MODAL_MODES,
  EXPORT_STAGES,
  STAGE_MESSAGES,
  describeExportProgress,
  describeValidationPrompt,
  missingFieldLine,
  resolveExportModalMode,
  type DemoExportStage,
  type ExportModalMode,
  type ExportModalModeInput,
  type ExportProgressView,
  type ExportStage,
  type ProgressInfo,
  type ValidationPromptView,
} from '@/features/demo/engine/logic/export/stage'

export {
  EXPORT_ALERTS,
  EXPORT_TYPES,
  IDLE_EXPORT_FLOW,
  advanceStage,
  applyValidation,
  cancelValidation,
  continueValidatedExport,
  failValidation,
  isExporting,
  reportProgress,
  requestExport,
  resetExportFlow,
  validationErrorAlert,
  type ContinueOutcome,
  type ExportAlert,
  type ExportFlowState,
  type ExportRequest,
  type ExportRun,
  type ExportType,
  type RequestOutcome,
  type ValidatedExportRun,
  type ValidatedExportType,
  type ValidationOutcome,
} from '@/features/demo/engine/logic/export/flow'
