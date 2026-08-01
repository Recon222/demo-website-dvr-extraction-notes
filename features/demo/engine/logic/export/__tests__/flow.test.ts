import { describe, it, expect } from 'vitest'

import {
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
  type ExportFlowState,
  type ExportRequest,
  type ValidatedExportRun,
} from '@/features/demo/engine/logic/export/flow'
import {
  DEMO_EXPORT_STAGES,
  resolveExportModalMode,
} from '@/features/demo/engine/logic/export/stage'
import {
  validateLocationsForPdf,
  type CasePdfValidationResult,
} from '@/features/demo/engine/logic/export/validation'

const CASE = { id: 'case-a', caseNumber: 'PR26-0001' }

const location = (id: string, complete: boolean) => ({
  id,
  locationName: `Location ${id}`,
  form: {
    scopes: complete
      ? [{ startDateTime: '2026-03-01 08:00:00', endDateTime: '2026-03-01 09:00:00' }]
      : [],
    dateTimeCompleted: complete ? '2026-03-01 12:00:00' : '',
    completedBy: complete ? 'PC 1234 Reid' : '',
  },
})

const verdict = (flags: boolean[]): CasePdfValidationResult =>
  validateLocationsForPdf(CASE, flags.map((complete, i) => location(`l${i + 1}`, complete)))

const PASS = verdict([true, true])
const FAIL = verdict([true, false])

const state = (o: Partial<ExportFlowState> = {}): ExportFlowState => ({ ...IDLE_EXPORT_FLOW, ...o })

/** Drive the CTA all the way to a prompt, the way the shell will. */
function promptedWith(request: ExportRequest, result = FAIL): ExportFlowState {
  const requested = requestExport(state(), request)
  if (requested.kind !== 'validate') throw new Error(`expected validate, got ${requested.kind}`)
  const validated = applyValidation(requested.state, requested.run, result)
  if (validated.kind !== 'prompt') throw new Error(`expected prompt, got ${validated.kind}`)
  return validated.state
}

describe('EXPORT_ALERTS — matrix row 28 contract strings', () => {
  it('carries the phone\'s copy verbatim, with the two adaptations §70g declares', () => {
    // One literal block, the STAGE_MESSAGES shape: every other assertion in this file reads
    // these constants back through the machine, which pins the ROUTING but would stay green
    // under any copy mutation. Verified against phone source (`src/hooks/useExportFlow.ts`
    // :328-332, :782-785, :819-822, :919-922; `app/(tabs)/export.tsx`:135-137, :147-149).
    expect(EXPORT_ALERTS).toEqual({
      noCaseSelected: {
        title: 'No Case Selected',
        // ADAPTED (§70g): the subset handler's generic wording (:820-821), not
        // handleExportZip's "…create a case from the Home screen…" (:655-656) — the demo has
        // no Home screen to send anyone to.
        message: 'Please select a case before exporting.',
      },
      noCaseSelectedForMap: {
        title: 'No Case Selected',
        message: 'Please select a case before exporting its map.',
      },
      noLocationSelected: {
        title: 'No Location Selected',
        message: 'Please create a location first.',
      },
      noSelection: {
        title: 'Export Error',
        message: 'No locations are selected. Please select locations and try again.',
      },
      caseUnavailable: {
        title: 'Export Error',
        // ADAPTED (§70g): the phone says "Refresh the list and re-select." (export.tsx:148) —
        // the demo's list IS the live store, so there is nothing to refresh.
        message: 'The selected case is no longer available. Re-select and try again.',
      },
      missingSubsetPayload: {
        title: 'Export Error',
        message: 'No locations were selected for this export. Please re-select and try again.',
      },
    })
  })

  it('gives every alert a non-empty title and message', () => {
    for (const [name, alert] of Object.entries(EXPORT_ALERTS)) {
      expect(alert.title.trim(), name).not.toBe('')
      expect(alert.message.trim(), name).not.toBe('')
    }
  })

  it('is frozen, so no consumer can rewrite a contract string in place', () => {
    expect(Object.isFrozen(EXPORT_ALERTS)).toBe(true)
    expect(Object.isFrozen(EXPORT_ALERTS.noSelection)).toBe(true)
  })
})

describe('requestExport — entry guard and preconditions', () => {
  it('ignores a second press while an export is in flight', () => {
    const busy = state({ stage: 'zipping' })
    expect(requestExport(busy, { type: 'case', caseId: 'case-a' })).toEqual({ kind: 'ignored' })
  })

  it('blocks a case export with no case armed', () => {
    expect(requestExport(state(), { type: 'case', caseId: null })).toEqual({
      kind: 'blocked',
      alert: EXPORT_ALERTS.noCaseSelected,
    })
  })

  it('blocks a location export with no location open', () => {
    expect(requestExport(state(), { type: 'location', locationId: null })).toEqual({
      kind: 'blocked',
      alert: EXPORT_ALERTS.noLocationSelected,
    })
    expect(requestExport(state(), { type: 'location-geojson', locationId: null })).toEqual({
      kind: 'blocked',
      alert: EXPORT_ALERTS.noLocationSelected,
    })
  })

  it('blocks a case-map export with its own wording', () => {
    expect(requestExport(state(), { type: 'case-map', caseId: null })).toEqual({
      kind: 'blocked',
      alert: EXPORT_ALERTS.noCaseSelectedForMap,
    })
  })

  it('blocks an EMPTY subset loudly, before the validator ever sees it', () => {
    // A silent return here would read as success on an evidence app; the validator's own
    // message ("No locations selected for subset export") is not something a visitor can act on.
    expect(requestExport(state(), { type: 'case-subset', caseId: 'case-a', locationIds: [] })).toEqual({
      kind: 'blocked',
      alert: EXPORT_ALERTS.missingSubsetPayload,
    })
  })
})

describe('requestExport — which pipelines pre-flight', () => {
  it('validates the case pipeline and enters the validating stage', () => {
    const outcome = requestExport(state(), { type: 'case', caseId: 'case-a' })
    expect(outcome.kind).toBe('validate')
    if (outcome.kind !== 'validate') return
    expect(outcome.state.stage).toBe('validating')
    expect(outcome.run).toEqual({ type: 'case', caseId: 'case-a' })
  })

  it('validates the subset pipeline, carrying the ids on the RUN', () => {
    const outcome = requestExport(state(), {
      type: 'case-subset',
      caseId: 'case-a',
      locationIds: ['l1', 'l3'],
    })
    expect(outcome.kind).toBe('validate')
    if (outcome.kind !== 'validate') return
    expect(outcome.run).toEqual({ type: 'case-subset', caseId: 'case-a', locationIds: ['l1', 'l3'] })
  })

  it('clears a stale verdict when a new request starts validating', () => {
    const stale = state({ validationResult: PASS })
    const outcome = requestExport(stale, { type: 'case', caseId: 'case-a' })
    if (outcome.kind !== 'validate') throw new Error('expected validate')
    expect(outcome.state.validationResult).toBeNull()
  })

  it('dispatches the three single-artifact pipelines straight through, untouched', () => {
    const before = state()
    for (const request of [
      { type: 'location', locationId: 'l1' },
      { type: 'location-geojson', locationId: 'l1' },
      { type: 'case-map', caseId: 'case-a' },
    ] satisfies ExportRequest[]) {
      const outcome = requestExport(before, request)
      expect(outcome.kind).toBe('run')
      if (outcome.kind !== 'run') continue
      // No pre-flight, and no stage of its own — the phone's stages come from the service.
      expect(outcome.state).toBe(before)
    }
  })

  it('covers every declared export type', () => {
    expect(EXPORT_TYPES).toEqual(['case', 'location', 'case-subset', 'location-geojson', 'case-map'])
  })
})

describe('applyValidation', () => {
  it('runs straight through when every location is valid, keeping the verdict', () => {
    const run: ValidatedExportRun = { type: 'case', caseId: 'case-a' }
    const outcome = applyValidation(state({ stage: 'validating' }), run, PASS)
    expect(outcome.kind).toBe('run')
    if (outcome.kind !== 'run') return
    expect(outcome.state.validationResult).toBe(PASS)
    expect(outcome.run).toBe(run)
  })

  it('opens the prompt ARMED with the route that produced it', () => {
    const armed = promptedWith({ type: 'case-subset', caseId: 'case-a', locationIds: ['l1'] })
    expect(armed.pendingValidatedExport).toBe('case-subset')
    expect(armed.pendingSubsetLocationIds).toEqual(['l1'])
  })

  it('drops the stage back to idle — the prompt is a question, not progress', () => {
    const armed = promptedWith({ type: 'case', caseId: 'case-a' })
    expect(armed.stage).toBe('idle')
    expect(armed.showValidationModal).toBe(true)
    expect(armed.validationResult).toBe(FAIL)
  })

  it('CLEARS a stale subset payload when a case validation prompts', () => {
    // Otherwise Continue on a case prompt could resume a previously-stashed subset.
    const stale = state({ stage: 'validating', pendingSubsetLocationIds: ['l9'] })
    const outcome = applyValidation(stale, { type: 'case', caseId: 'case-a' }, FAIL)
    if (outcome.kind !== 'prompt') throw new Error('expected prompt')
    expect(outcome.state.pendingSubsetLocationIds).toBeNull()
    expect(outcome.state.pendingValidatedExport).toBe('case')
  })

  it('clears any in-flight progress when it prompts', () => {
    const mid = state({ stage: 'generating', progress: { current: 2, total: 3 }, currentLocationName: 'Rear Door' })
    const outcome = applyValidation(mid, { type: 'case', caseId: 'case-a' }, FAIL)
    if (outcome.kind !== 'prompt') throw new Error('expected prompt')
    expect(outcome.state.progress).toEqual({ current: 0, total: 0 })
    expect(outcome.state.currentLocationName).toBeNull()
  })
})

describe('failValidation', () => {
  it('returns to rest and reports the reason', () => {
    const busy = state({ stage: 'validating', validationResult: PASS })
    const { state: next, alert } = failValidation(busy, 'Selected locations not found in case: ghost')
    expect(next.stage).toBe('idle')
    expect(next.validationResult).toBeNull()
    expect(alert).toEqual({
      title: 'Validation Error',
      message: 'Selected locations not found in case: ghost',
    })
  })

  it('shares its shape with validationErrorAlert', () => {
    expect(validationErrorAlert('boom')).toEqual({ title: 'Validation Error', message: 'boom' })
  })
})

describe('continueValidatedExport — the modal\'s Continue', () => {
  it('is INERT when nothing is armed — never a whole-case export from a forgotten arm', () => {
    expect(continueValidatedExport(state({ showValidationModal: true }), 'case-a')).toEqual({
      kind: 'ignored',
    })
  })

  it('is inert while an export is already running', () => {
    const armed = state({ stage: 'zipping', pendingValidatedExport: 'case' })
    expect(continueValidatedExport(armed, 'case-a')).toEqual({ kind: 'ignored' })
  })

  it('resumes the CASE route it was armed with', () => {
    const armed = promptedWith({ type: 'case', caseId: 'case-a' })
    const outcome = continueValidatedExport(armed, 'case-a')
    expect(outcome.kind).toBe('run')
    if (outcome.kind !== 'run') return
    expect(outcome.run).toEqual({ type: 'case', caseId: 'case-a' })
  })

  it('resumes the SUBSET route with its stashed ids — never escalating to the whole case', () => {
    const armed = promptedWith({ type: 'case-subset', caseId: 'case-a', locationIds: ['l1', 'l2'] })
    const outcome = continueValidatedExport(armed, 'case-a')
    if (outcome.kind !== 'run') throw new Error('expected run')
    expect(outcome.run).toEqual({ type: 'case-subset', caseId: 'case-a', locationIds: ['l1', 'l2'] })
  })

  it('CONSUMES the modal and both arms on the run path', () => {
    const armed = promptedWith({ type: 'case-subset', caseId: 'case-a', locationIds: ['l1'] })
    const outcome = continueValidatedExport(armed, 'case-a')
    if (outcome.kind !== 'run') throw new Error('expected run')
    expect(outcome.state.showValidationModal).toBe(false)
    expect(outcome.state.validationResult).toBeNull()
    expect(outcome.state.pendingValidatedExport).toBeNull()
    expect(outcome.state.pendingSubsetLocationIds).toBeNull()
  })

  it('makes a re-tap inert instead of double-exporting', () => {
    const armed = promptedWith({ type: 'case', caseId: 'case-a' })
    const first = continueValidatedExport(armed, 'case-a')
    if (first.kind !== 'run') throw new Error('expected run')
    expect(continueValidatedExport(first.state, 'case-a')).toEqual({ kind: 'ignored' })
  })

  it('closes the modal and flips to validating in ONE write — no hidden frame', () => {
    // Split across two writes, the mode ternary would compute 'hidden' in between and the
    // modal would unmount for a frame between validation and progress.
    const armed = promptedWith({ type: 'case', caseId: 'case-a' })
    expect(resolveExportModalMode(armed)).toBe('validation')
    const outcome = continueValidatedExport(armed, 'case-a')
    if (outcome.kind !== 'run') throw new Error('expected run')
    expect(outcome.state.stage).toBe('validating')
    expect(resolveExportModalMode(outcome.state)).toBe('progress')
  })

  it('blocks loudly — and still consumes the modal — when the armed case vanished', () => {
    const armed = promptedWith({ type: 'case', caseId: 'case-a' })
    const outcome = continueValidatedExport(armed, null)
    expect(outcome.kind).toBe('blocked')
    if (outcome.kind !== 'blocked') return
    expect(outcome.alert).toEqual(EXPORT_ALERTS.caseUnavailable)
    expect(outcome.state.showValidationModal).toBe(false)
    expect(outcome.state.pendingValidatedExport).toBeNull()
    expect(outcome.state.stage).toBe('idle')
  })

  it('blocks loudly when a subset was armed with no payload', () => {
    const orphaned = state({
      showValidationModal: true,
      validationResult: FAIL,
      pendingValidatedExport: 'case-subset',
      pendingSubsetLocationIds: null,
    })
    const outcome = continueValidatedExport(orphaned, 'case-a')
    expect(outcome.kind).toBe('blocked')
    if (outcome.kind !== 'blocked') return
    expect(outcome.alert).toEqual(EXPORT_ALERTS.missingSubsetPayload)
    expect(outcome.state.showValidationModal).toBe(false)
    expect(outcome.state.stage).toBe('idle')
  })

  it('carries the ids as the RUN\'s payload, so no caller can re-read them from state', () => {
    const armed = promptedWith({ type: 'case-subset', caseId: 'case-a', locationIds: ['l1', 'l2'] })
    const outcome = continueValidatedExport(armed, 'case-a')
    if (outcome.kind !== 'run' || outcome.run.type !== 'case-subset') throw new Error('expected subset run')
    expect(outcome.run.locationIds).toEqual(['l1', 'l2'])
    expect(outcome.state.pendingSubsetLocationIds).toBeNull()
  })
})

describe('cancelValidation', () => {
  it('drops the prompt AND both arms', () => {
    const armed = promptedWith({ type: 'case-subset', caseId: 'case-a', locationIds: ['l1'] })
    const next = cancelValidation(armed)
    expect(next.showValidationModal).toBe(false)
    expect(next.validationResult).toBeNull()
    expect(next.pendingValidatedExport).toBeNull()
    expect(next.pendingSubsetLocationIds).toBeNull()
  })

  it('leaves a later Continue inert', () => {
    const armed = promptedWith({ type: 'case', caseId: 'case-a' })
    expect(continueValidatedExport(cancelValidation(armed), 'case-a')).toEqual({ kind: 'ignored' })
  })

  it('is a true no-op when nothing is armed', () => {
    const rest = state()
    expect(cancelValidation(rest)).toBe(rest)
  })
})

describe('stage and progress ticks', () => {
  it('advances the stage', () => {
    expect(advanceStage(state(), 'generating').stage).toBe('generating')
  })

  it('refuses the stages the demo cannot honestly enter (R-16)', () => {
    // "Opening share dialog..." precedes a real OS share sheet; a browser tab has none, so the
    // only route into it was a typo the compiler accepted. `'idle'` belongs to resetExportFlow,
    // which also clears the counter and the location name.
    // @ts-expect-error 'sharing' is not a DemoExportStage
    expect(() => advanceStage(state(), 'sharing')).not.toThrow()
    // @ts-expect-error 'idle' is not a DemoExportStage — resetExportFlow owns the return to rest
    expect(() => advanceStage(state({ stage: 'zipping' }), 'idle')).not.toThrow()
    for (const stage of DEMO_EXPORT_STAGES) {
      expect(advanceStage(state(), stage).stage).toBe(stage)
    }
  })

  it('is a no-op — by reference — for a repeated stage tick', () => {
    const running = state({ stage: 'generating' })
    expect(advanceStage(running, 'generating')).toBe(running)
  })

  it('records the counter and the current location together', () => {
    const next = reportProgress(state({ stage: 'generating' }), 2, 3, 'Rear Door')
    expect(next.progress).toEqual({ current: 2, total: 3 })
    expect(next.currentLocationName).toBe('Rear Door')
  })

  it('is a no-op — by reference — for a repeated progress tick', () => {
    const ticked = reportProgress(state({ stage: 'generating' }), 2, 3, 'Rear Door')
    expect(reportProgress(ticked, 2, 3, 'Rear Door')).toBe(ticked)
  })

  it('normalises an absent location name to null', () => {
    expect(reportProgress(state(), 1, 2).currentLocationName).toBeNull()
    expect(reportProgress(state(), 1, 2, undefined).currentLocationName).toBeNull()
  })

  it('reports isExporting off the stage alone', () => {
    expect(isExporting(state())).toBe(false)
    expect(isExporting(state({ stage: 'validating' }))).toBe(true)
    // The prompt is NOT "exporting" — the phone resets the stage before opening it, and the
    // modal is what blocks the CTA.
    expect(isExporting(promptedWith({ type: 'case', caseId: 'case-a' }))).toBe(false)
  })
})

describe('resetExportFlow', () => {
  it('clears the stage, the counter and the location name', () => {
    const mid = state({ stage: 'zipping', progress: { current: 3, total: 3 }, currentLocationName: 'Rear Door' })
    expect(resetExportFlow(mid)).toMatchObject({
      stage: 'idle',
      progress: { current: 0, total: 0 },
      currentLocationName: null,
    })
  })

  it('leaves the verdict and the modal alone, exactly like the phone', () => {
    const mid = state({ stage: 'zipping', validationResult: PASS, showValidationModal: true })
    const next = resetExportFlow(mid)
    expect(next.validationResult).toBe(PASS)
    expect(next.showValidationModal).toBe(true)
  })

  it('is a true no-op at rest', () => {
    const rest = state({ validationResult: PASS })
    expect(resetExportFlow(rest)).toBe(rest)
  })
})

describe('the whole flow, end to end', () => {
  it('runs a clean subset export: request → validate → run → progress → rest', () => {
    const requested = requestExport(state(), {
      type: 'case-subset',
      caseId: 'case-a',
      locationIds: ['l1', 'l2'],
    })
    if (requested.kind !== 'validate') throw new Error('expected validate')
    expect(resolveExportModalMode(requested.state)).toBe('progress')

    const validated = applyValidation(requested.state, requested.run, PASS)
    if (validated.kind !== 'run') throw new Error('expected run')

    let s = advanceStage(validated.state, 'generating')
    s = reportProgress(s, 1, 2, 'Location l1')
    expect(resolveExportModalMode(s)).toBe('progress')
    s = advanceStage(reportProgress(s, 2, 2, 'Location l2'), 'zipping')
    s = resetExportFlow(s)
    expect(resolveExportModalMode(s)).toBe('hidden')
    expect(s.pendingValidatedExport).toBeNull()
  })

  it('runs the continue-anyway path without ever escalating scope', () => {
    const armed = promptedWith({ type: 'case-subset', caseId: 'case-a', locationIds: ['l2'] })
    expect(resolveExportModalMode(armed)).toBe('validation')

    const outcome = continueValidatedExport(armed, 'case-a')
    if (outcome.kind !== 'run') throw new Error('expected run')
    expect(outcome.run.type).toBe('case-subset')

    const rested = resetExportFlow(outcome.state)
    expect(resolveExportModalMode(rested)).toBe('hidden')
  })

  it('leaves nothing armed after a cancelled prompt, so the next request starts clean', () => {
    const armed = promptedWith({ type: 'case', caseId: 'case-a' })
    const cancelled = cancelValidation(armed)
    const next = requestExport(cancelled, { type: 'location', locationId: 'l1' })
    expect(next.kind).toBe('run')
    expect(cancelled.pendingValidatedExport).toBeNull()
  })
})
