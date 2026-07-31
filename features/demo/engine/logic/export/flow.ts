/**
 * The export flow's stage/policy machine (parity P5.1, phone-inventory T17, matrix row 28) —
 * the pure core of the phone's `src/hooks/useExportFlow.ts`.
 *
 * WHAT SURVIVED THE PORT, AND WHY THIS IS A MACHINE AND NOT A HOOK
 * The phone hook is ~970 lines of React state, biometrics, settings reads, SQLite services and
 * `Alert.alert`. Strip those and what is left is a small state machine that has been hardened
 * by four separate review rounds, and every one of those hardenings is a rule about ORDER and
 * ARMING rather than about React:
 *
 * - the entry guard that makes a second press inert while an export is in flight (`:651`);
 * - `pendingValidatedExport` as a NULLABLE with a null default, so an unarmed Continue is
 *   INERT rather than whole-case — "'case' as the resting value would make every forgotten arm
 *   a scope escalation" (PR-89 HIGH, `:98-105`);
 * - Continue CONSUMING the validation modal on every path, because a latched modal left a live
 *   Continue that silently no-oped on one route and silently double-exported on the other
 *   (PR-89 HIGH, `:730-743`);
 * - the modal-close and the stage flip landing in the SAME batch, so the modal never unmounts
 *   for a frame between validation and progress (PR-89 fix-delta MEDIUM);
 * - the subset payload travelling as an ARGUMENT on every dispatch path, never a same-tick
 *   state read (PR-87 HIGH-1, `:88-95`);
 * - the LOUD backstop when a subset dispatch arrives without its payload, because "on an
 *   evidence app a silent return reads as success" (PR-89 HIGH, `:321-335`).
 *
 * All six are preserved here. The argument-not-state rule becomes structural rather than
 * documentary: every transition that authorises a dispatch RETURNS the resolved `ExportRun`,
 * ids included, so a caller physically cannot re-read them from state.
 *
 * WHAT DID NOT COME ACROSS (decision D4 + no browser equivalent), each logged in deferred §70:
 * biometrics (`useProtectedExport`), the password round-trip and `resolvePasswordPolicy`
 * (PasswordModal is not built), and the post-export result-alert taxonomy — its branches are
 * composed from `shareWarning` / `pdfResults.failureCount` / `geojsonFailures` /
 * `caseMapFailed`, none of which a demo with no share sheet, no PDF pipeline failure mode and
 * no filesystem can ever produce. Fabricating those alerts would be inventing failures.
 *
 * Pure and React-free. The P5.3 hook shell holds `ExportFlowState` in `useState` and calls
 * these; the DemoExperience bridge owns the wiring.
 */

import { assertNever } from '@/features/demo/engine/logic/assert-never'
import type { ExportStage, ProgressInfo } from '@/features/demo/engine/logic/export/stage'
import type { CasePdfValidationResult } from '@/features/demo/engine/logic/export/validation'

// ---- Vocabulary ------------------------------------------------------------------------

/**
 * The export operations this flow can dispatch — the single source of truth for both the
 * request and the run (phone `ExportType`, `useExportFlow.ts:53`). Adding a member forces a new
 * branch via the `assertNever` guard in `requestExport`.
 */
export const EXPORT_TYPES = [
  'case',
  'location',
  'case-subset',
  'location-geojson',
  'case-map',
] as const
export type ExportType = (typeof EXPORT_TYPES)[number]

/**
 * The two pipelines the validation modal's Continue can resume. Written as an `Extract` of
 * `ExportType` rather than a hand-typed pair (phone `:103-105`) so a rename breaks the build
 * instead of silently orphaning a route.
 */
export type ValidatedExportType = Extract<ExportType, 'case' | 'case-subset'>

/**
 * What the surface asks for. Ids are NULLABLE here and non-null on `ExportRun` — the
 * precondition guards are the only thing that converts one into the other, so an unresolved id
 * cannot reach a dispatch.
 */
export type ExportRequest =
  | { type: 'case'; caseId: string | null }
  | { type: 'location'; locationId: string | null }
  | { type: 'case-subset'; caseId: string | null; locationIds: readonly string[] }
  | { type: 'location-geojson'; locationId: string | null }
  | { type: 'case-map'; caseId: string | null }

/**
 * An authorised dispatch, ids resolved. Returned BY the transitions, never read back out of
 * state — the structural form of the phone's PR-87 HIGH-1 rule.
 */
export type ExportRun =
  | { type: 'case'; caseId: string }
  | { type: 'location'; locationId: string }
  | { type: 'case-subset'; caseId: string; locationIds: readonly string[] }
  | { type: 'location-geojson'; locationId: string }
  | { type: 'case-map'; caseId: string }

/** The two runs that arrive via validation. */
export type ValidatedExportRun = Extract<ExportRun, { type: ValidatedExportType }>

/** A blocking dialog: the phone's `Alert.alert(title, message)` reduced to its content.
 *  The demo renders these through `ui/controls/AlertDialog`. */
export interface ExportAlert {
  title: string
  message: string
}

/**
 * The blocking-alert taxonomy (matrix row 28), lifted from the phone.
 *
 * `noCaseSelected` deliberately takes the SUBSET handler's generic wording
 * (`useExportFlow.ts:820-821`) rather than `handleExportZip`'s "Please create a case from the
 * Home screen before exporting." (`:655-656`): the latter instructs a screen the demo does not
 * have. `caseUnavailable` is the Export tab's own backstop (`export.tsx:148-149`) minus its
 * "Refresh the list and" — the demo's list is the live store and there is nothing to refresh.
 * Both adaptations are logged in deferred §70; every other string is verbatim.
 */
export const EXPORT_ALERTS = Object.freeze({
  /** No case is armed. Phone `useExportFlow.ts:819-822`. */
  noCaseSelected: Object.freeze({
    title: 'No Case Selected',
    message: 'Please select a case before exporting.',
  }),
  /** No case is armed for the map export. Phone `useExportFlow.ts:919-922`. */
  noCaseSelectedForMap: Object.freeze({
    title: 'No Case Selected',
    message: 'Please select a case before exporting its map.',
  }),
  /** No location is open. Phone `useExportFlow.ts:782-785`. */
  noLocationSelected: Object.freeze({
    title: 'No Location Selected',
    message: 'Please create a location first.',
  }),
  /** The CTA fired with nothing selected. Phone `export.tsx:135-137`. */
  noSelection: Object.freeze({
    title: 'Export Error',
    message: 'No locations are selected. Please select locations and try again.',
  }),
  /** The armed case is gone. Phone `export.tsx:147-149` (see the note above). */
  caseUnavailable: Object.freeze({
    title: 'Export Error',
    message: 'The selected case is no longer available. Re-select and try again.',
  }),
  /** A subset dispatch arrived without its payload — the LOUD backstop. Phone
   *  `useExportFlow.ts:328-332`. */
  missingSubsetPayload: Object.freeze({
    title: 'Export Error',
    message: 'No locations were selected for this export. Please re-select and try again.',
  }),
} as const)

/** Validation itself threw (a foreign id, an empty subset). Phone `useExportFlow.ts:702-707`,
 *  where the message comes from `getUserFriendlyMessage(error)`. */
export function validationErrorAlert(message: string): ExportAlert {
  return { title: 'Validation Error', message }
}

// ---- State -----------------------------------------------------------------------------

export interface ExportFlowState {
  stage: ExportStage
  /** Kept after a successful validation too (phone `:669`) — the modal reads it, and the next
   *  request clears it. */
  validationResult: CasePdfValidationResult | null
  showValidationModal: boolean
  progress: ProgressInfo
  currentLocationName: string | null
  /** Which pipeline Continue resumes. `null` is the genuinely neutral resting value, so an
   *  unarmed Continue is INERT rather than whole-case (PR-89 HIGH). */
  pendingValidatedExport: ValidatedExportType | null
  /** The subset payload, held ONLY across the validation round-trip. */
  pendingSubsetLocationIds: readonly string[] | null
}

export const IDLE_EXPORT_FLOW: ExportFlowState = Object.freeze({
  stage: 'idle',
  validationResult: null,
  showValidationModal: false,
  progress: Object.freeze({ current: 0, total: 0 }),
  currentLocationName: null,
  pendingValidatedExport: null,
  pendingSubsetLocationIds: null,
})

/**
 * Is an export in flight? The phone's `isExporting` also ORs in `isAuthenticating` — there is
 * no biometric gate here, so the stage is the whole answer.
 *
 * NOTE for consumers: like the phone, this is false while the validation modal is up (opening
 * it resets the stage). The modal is what blocks the CTA, not this flag.
 */
export function isExporting(state: ExportFlowState): boolean {
  return state.stage !== 'idle'
}

// ---- Transitions -----------------------------------------------------------------------

/** The CTA's four possible answers. `validate` means "run the validator and hand the result
 *  to `applyValidation`"; `run` means "dispatch now". */
export type RequestOutcome =
  | { kind: 'ignored' }
  | { kind: 'blocked'; alert: ExportAlert }
  | { kind: 'validate'; state: ExportFlowState; run: ValidatedExportRun }
  | { kind: 'run'; state: ExportFlowState; run: ExportRun }

/**
 * The export CTA (phone `handleExportZip` / `handleExportLocationZip` /
 * `handleExportSubsetZip` / `handleExportLocationGeoJSON` / `handleExportCaseMap`, whose
 * shared preamble is: entry guard → precondition alert → validate-or-dispatch).
 *
 * `case` and `case-subset` return `validate` with the stage already at `'validating'` and the
 * previous result cleared (phone `:663-664`); the other three return `run` with the state
 * untouched, because on the phone their stages come from the service's `onStageChange`. The
 * shell must therefore advance the stage in the same handler it starts such a run — see
 * `advanceStage`.
 *
 * A subset request with an EMPTY id list is blocked loudly here rather than validated: the
 * phone's validator throws for it (`pdf-export-service.ts:1414-1418`) and its `executeExport`
 * has the same backstop (`:321-335`); catching it at the boundary keeps the "no locations were
 * selected" wording instead of surfacing a validator message the visitor cannot act on.
 */
export function requestExport(state: ExportFlowState, request: ExportRequest): RequestOutcome {
  if (isExporting(state)) return { kind: 'ignored' }

  switch (request.type) {
    case 'case': {
      if (!request.caseId) return { kind: 'blocked', alert: EXPORT_ALERTS.noCaseSelected }
      return {
        kind: 'validate',
        state: { ...state, validationResult: null, stage: 'validating' },
        run: { type: 'case', caseId: request.caseId },
      }
    }
    case 'case-subset': {
      if (!request.caseId) return { kind: 'blocked', alert: EXPORT_ALERTS.noCaseSelected }
      if (request.locationIds.length === 0) {
        return { kind: 'blocked', alert: EXPORT_ALERTS.missingSubsetPayload }
      }
      return {
        kind: 'validate',
        state: { ...state, validationResult: null, stage: 'validating' },
        run: { type: 'case-subset', caseId: request.caseId, locationIds: request.locationIds },
      }
    }
    case 'location': {
      if (!request.locationId) return { kind: 'blocked', alert: EXPORT_ALERTS.noLocationSelected }
      return { kind: 'run', state, run: { type: 'location', locationId: request.locationId } }
    }
    case 'location-geojson': {
      if (!request.locationId) return { kind: 'blocked', alert: EXPORT_ALERTS.noLocationSelected }
      return {
        kind: 'run',
        state,
        run: { type: 'location-geojson', locationId: request.locationId },
      }
    }
    case 'case-map': {
      if (!request.caseId) return { kind: 'blocked', alert: EXPORT_ALERTS.noCaseSelectedForMap }
      return { kind: 'run', state, run: { type: 'case-map', caseId: request.caseId } }
    }
    default:
      return assertNever(request)
  }
}

export type ValidationOutcome =
  | { kind: 'prompt'; state: ExportFlowState }
  | { kind: 'run'; state: ExportFlowState; run: ValidatedExportRun }

/**
 * Hand the validator's verdict back to the machine (phone `:671-696` and `:836-862`).
 *
 * On a failure the modal opens ARMED with the route that produced it, and the stage drops back
 * to idle (the phone calls `resetExportState()` before opening — the prompt is a question, not
 * progress). Arming is what makes Continue resume the SAME pipeline: a `'case'` hardcode here
 * would silently export the whole case after a subset validation, which is scope escalation in
 * an evidence flow.
 *
 * A subset prompt stashes its ids; a case prompt explicitly CLEARS any stale ones
 * (phone `:678`), so Continue can never resume a previously-stashed subset.
 */
export function applyValidation(
  state: ExportFlowState,
  run: ValidatedExportRun,
  result: CasePdfValidationResult,
): ValidationOutcome {
  if (result.allValid) {
    return { kind: 'run', state: { ...state, validationResult: result }, run }
  }
  return {
    kind: 'prompt',
    state: {
      ...state,
      stage: 'idle',
      progress: { current: 0, total: 0 },
      currentLocationName: null,
      validationResult: result,
      showValidationModal: true,
      pendingValidatedExport: run.type,
      pendingSubsetLocationIds: run.type === 'case-subset' ? run.locationIds : null,
    },
  }
}

/**
 * The validator threw (phone `:697-708`): back to idle, and say so. The flow keeps no partial
 * verdict — a validation that did not complete has nothing truthful to show.
 */
export function failValidation(
  state: ExportFlowState,
  message: string,
): { state: ExportFlowState; alert: ExportAlert } {
  return {
    state: { ...resetExportFlow(state), validationResult: null },
    alert: validationErrorAlert(message),
  }
}

export type ContinueOutcome =
  | { kind: 'ignored' }
  | { kind: 'blocked'; state: ExportFlowState; alert: ExportAlert }
  | { kind: 'run'; state: ExportFlowState; run: ValidatedExportRun }

/**
 * The validation modal's "Continue" / "Export Anyway" (phone `proceedWithExport`, `:717-770`).
 *
 * Three invariants, all the phone's:
 * 1. An UNARMED Continue is inert — never a whole-case export from a forgotten arm.
 * 2. Continue CONSUMES the modal on every path, including the blocked one, so a re-tap can
 *    never no-op silently or double-export.
 * 3. The modal close and the `'validating'` stage flip happen in ONE state write, so the mode
 *    ternary goes validation → progress with no hidden frame in between.
 *
 * One deliberate strengthening (deferred §70): the phone returns SILENTLY when `caseId` is null
 * here (`:725-728`), leaving the modal latched. That arm is unreachable on the phone and
 * contradicts every other backstop in the file, so the demo consumes the modal and raises
 * `caseUnavailable` — the same treatment the phone's own Export tab gives the same condition
 * (`export.tsx:142-152`).
 */
export function continueValidatedExport(
  state: ExportFlowState,
  caseId: string | null,
): ContinueOutcome {
  if (!state.pendingValidatedExport) return { kind: 'ignored' }
  if (isExporting(state)) return { kind: 'ignored' }

  const type = state.pendingValidatedExport
  const subsetLocationIds = state.pendingSubsetLocationIds ?? []

  // The single consuming write (invariants 2 + 3).
  const consumed: ExportFlowState = {
    ...state,
    showValidationModal: false,
    validationResult: null,
    stage: 'validating',
    pendingValidatedExport: null,
    pendingSubsetLocationIds: null,
  }

  if (!caseId) {
    return {
      kind: 'blocked',
      state: resetExportFlow(consumed),
      alert: EXPORT_ALERTS.caseUnavailable,
    }
  }

  if (type === 'case-subset' && subsetLocationIds.length === 0) {
    // LOUD backstop: a subset dispatch without its payload is a caller bug, and on an evidence
    // app a silent return reads as success.
    return {
      kind: 'blocked',
      state: resetExportFlow(consumed),
      alert: EXPORT_ALERTS.missingSubsetPayload,
    }
  }

  const run: ValidatedExportRun =
    type === 'case-subset'
      ? { type: 'case-subset', caseId, locationIds: subsetLocationIds }
      : { type: 'case', caseId }

  return { kind: 'run', state: consumed, run }
}

/** The validation modal's "Cancel" (phone `:961-966`): drop the prompt AND both arms, so a
 *  cancelled export leaves nothing armed for a later Continue to resume. */
export function cancelValidation(state: ExportFlowState): ExportFlowState {
  if (
    !state.showValidationModal &&
    state.validationResult === null &&
    state.pendingValidatedExport === null &&
    state.pendingSubsetLocationIds === null
  ) {
    return state
  }
  return {
    ...state,
    showValidationModal: false,
    validationResult: null,
    pendingValidatedExport: null,
    pendingSubsetLocationIds: null,
  }
}

/** A stage tick from the running pipeline (phone's `onStageChange` callback). No-op when the
 *  stage is unchanged, so a repeated tick cannot wake a subscriber. */
export function advanceStage(state: ExportFlowState, stage: ExportStage): ExportFlowState {
  if (state.stage === stage) return state
  return { ...state, stage }
}

/** A progress tick from the PDF pass (phone's `onProgress` callback, which sets the counter and
 *  the location name together). */
export function reportProgress(
  state: ExportFlowState,
  current: number,
  total: number,
  locationName?: string | null,
): ExportFlowState {
  const name = locationName ?? null
  if (
    state.progress.current === current &&
    state.progress.total === total &&
    state.currentLocationName === name
  ) {
    return state
  }
  return { ...state, progress: { current, total }, currentLocationName: name }
}

/**
 * Back to rest (phone `resetExportState`, `:135-139`). Clears the stage, the counter and the
 * location name — and deliberately NOT `validationResult` or the modal, which the phone leaves
 * alone here too: the result is what the modal is still rendering, and the next request clears
 * it.
 */
export function resetExportFlow(state: ExportFlowState): ExportFlowState {
  if (
    state.stage === 'idle' &&
    state.progress.current === 0 &&
    state.progress.total === 0 &&
    state.currentLocationName === null
  ) {
    return state
  }
  return {
    ...state,
    stage: 'idle',
    progress: { current: 0, total: 0 },
    currentLocationName: null,
  }
}
