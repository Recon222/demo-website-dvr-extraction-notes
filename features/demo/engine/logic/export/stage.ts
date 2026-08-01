/**
 * The export modal's pure content (parity P5.1, matrix row 25) — the stage vocabulary, the
 * progress copy, the modal-mode precedence, and the validation prompt's wording.
 *
 * Ported from the phone's `src/components/export/ExportModal.tsx` (one component, three
 * callers: the Cases tab, the Export tab, and Completion) plus the mode ternary those three
 * callers each re-derive by hand — `app/(tabs)/export.tsx:169-176`,
 * `app/(tabs)/cases.tsx:595-602`, `app/(form)/completion.tsx:102-112`. Three hand-maintained
 * copies of one precedence is exactly the shape that drifts, so the demo has one.
 *
 * Pure and React-free: the modal renders what these return, it does not re-derive any of it.
 */

import type { CasePdfValidationResult, LocationPdfValidation } from '@/features/demo/engine/logic/export/validation'

/** The export pipeline's stages (phone `pdf-export.types.ts:108`). */
export const EXPORT_STAGES = ['idle', 'validating', 'generating', 'zipping', 'sharing'] as const
export type ExportStage = (typeof EXPORT_STAGES)[number]

/** Stage copy, verbatim (phone `ExportModal.tsx:62-68`). */
export const STAGE_MESSAGES: Readonly<Record<ExportStage, string>> = Object.freeze({
  idle: '',
  validating: 'Validating locations...',
  generating: 'Generating PDFs...',
  zipping: 'Creating ZIP archive...',
  sharing: 'Opening share dialog...',
})

/**
 * The stages the demo's simulated pipeline may actually enter — a guard rail, not a
 * re-typing of the union.
 *
 * `'sharing'` is excluded on purpose. Its copy is "Opening share dialog...", which on the
 * phone precedes a real iOS/Android share sheet; a browser tab has no such thing, and the
 * demo's ZIP terminates in an honest "not available here" notice (decision D4). Printing
 * "Opening share dialog…" over nothing would be the fake-success the honesty rule exists to
 * prevent. `'idle'` is the resting state, not a step — `resetExportFlow` owns the return to
 * rest, because it also clears the counter and the location name.
 *
 * This is the PARAMETER TYPE of `advanceStage` (review R-16), not a list to remember: the only
 * way into `'sharing'` was a typo the compiler used to accept.
 */
export const DEMO_EXPORT_STAGES = ['validating', 'generating', 'zipping'] as const
export type DemoExportStage = (typeof DEMO_EXPORT_STAGES)[number]

/** Current/total counts for the multi-location PDF pass (phone `ProgressInfo`). */
export interface ProgressInfo {
  current: number
  total: number
}

/** What the progress overlay renders (phone `ExportModal.tsx:80-125`). */
export interface ExportProgressView {
  /** The stage line. Empty string at `idle`, exactly like the phone's record. */
  stageMessage: string
  /** "Location k of n" — only while generating PDFs, and only with a real total. */
  progressLabel: string | null
  /** The quoted location name — only while generating, and only when one is known. */
  locationLabel: string | null
}

/**
 * The progress overlay's three lines (phone `ExportModal.tsx:87-121`).
 *
 * Both optional lines are gated on `stage === 'generating'`: the counter is meaningless during
 * zipping (there is one archive, not k of n) and a location name left over from the PDF pass
 * would keep naming a location the export has already moved past.
 */
export function describeExportProgress(
  stage: ExportStage,
  progress?: ProgressInfo,
  currentLocationName?: string | null,
): ExportProgressView {
  const generating = stage === 'generating'
  return {
    stageMessage: STAGE_MESSAGES[stage],
    progressLabel:
      generating && progress && progress.total > 0
        ? `Location ${progress.current} of ${progress.total}`
        : null,
    locationLabel: generating && currentLocationName ? `"${currentLocationName}"` : null,
  }
}

/** What the single export modal is showing (phone `ExportModalMode`, `ExportModal.tsx:39`). */
export const EXPORT_MODAL_MODES = ['hidden', 'progress', 'validation'] as const
export type ExportModalMode = (typeof EXPORT_MODAL_MODES)[number]

export interface ExportModalModeInput {
  showValidationModal: boolean
  validationResult: CasePdfValidationResult | null
  stage: ExportStage
}

/**
 * The mode precedence, in one place (the phone's three identical ternaries).
 *
 * Validation OUTRANKS progress, and only for a result that actually failed: a modal flagged
 * open with an `allValid` result would otherwise blank the screen with an empty warning. The
 * phone leans on this precedence hard enough that it flips `showValidationModal` and `stage`
 * in the same synchronous batch when Continue is pressed (see `continueValidatedExport` in
 * ./flow) — split across two commits, the modal would unmount for a frame.
 */
export function resolveExportModalMode(input: ExportModalModeInput): ExportModalMode {
  if (input.showValidationModal && input.validationResult && !input.validationResult.allValid) {
    return 'validation'
  }
  if (input.stage !== 'idle') return 'progress'
  return 'hidden'
}

/** One line of a location's missing-field list (phone `ExportModal.tsx:212-213`). */
export function missingFieldLine(field: string): string {
  return `- Missing: ${field}`
}

/** Everything the validation prompt renders (phone `ExportModal.tsx:138-249` + the screen-reader
 *  announcement at `:272-280`). */
export interface ValidationPromptView {
  /** No location can produce a PDF — a different, louder framing than "some". */
  allInvalid: boolean
  title: string
  description: string
  /** The rows to list, in the validator's order. */
  invalidLocations: LocationPdfValidation[]
  summary: string
  continueLabel: string
  cancelLabel: string
  /** Live-region text announced when the prompt appears. */
  announcement: string
}

/**
 * The validation prompt's wording, chosen by whether ANY location survived.
 *
 * Every string is the phone's, verbatim. Note that "The ZIP will be created without any PDF
 * notes." describes the artifact the flow is about — the demo's honest "no download here"
 * treatment belongs at the TERMINAL step (decision D4), not in this prompt, where softening it
 * would leave the visitor with no idea what they just agreed to.
 */
export function describeValidationPrompt(result: CasePdfValidationResult): ValidationPromptView {
  const allInvalid = result.validCount === 0 && result.totalLocations > 0
  return {
    allInvalid,
    title: allInvalid ? 'All Locations Missing PDF Data' : 'Some Locations Missing PDF Data',
    description: allInvalid
      ? 'None of the locations have the required fields for PDF generation:'
      : 'The following locations will NOT include PDF notes due to missing required fields:',
    invalidLocations: result.invalidLocations,
    summary: allInvalid
      ? 'The ZIP will be created without any PDF notes.'
      : `${result.validCount} of ${result.totalLocations} locations will include PDF notes.`,
    continueLabel: allInvalid ? 'Export Anyway' : 'Continue',
    cancelLabel: 'Cancel',
    announcement: `Warning: ${result.invalidCount} of ${result.totalLocations} locations are missing required data for PDF generation.`,
  }
}
