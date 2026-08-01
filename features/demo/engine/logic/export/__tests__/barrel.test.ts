import { describe, it, expect } from 'vitest'

import * as exportEngine from '@/features/demo/engine/logic/export'
import * as engine from '@/features/demo/engine'

// The module barrel is what P5.2 (Export tab) and P5.3 (export modals) import. This pins the
// surface they were briefed against, and the two structural rules the module lives under.
describe('features/demo/engine/logic/export barrel', () => {
  it('exposes the selection state machine and its one decision', () => {
    for (const name of [
      'toggleLocationSelection',
      'toggleCaseSelection',
      'pruneSelection',
      'isFullCaseSelection',
      'resolveExportPlan',
      'caseCheckboxState',
    ]) {
      expect(typeof (exportEngine as unknown as Record<string, unknown>)[name], name).toBe('function')
    }
  })

  it('exposes the validation port', () => {
    expect(typeof exportEngine.validateLocationForPdf).toBe('function')
    expect(typeof exportEngine.validateLocationsForPdf).toBe('function')
    expect(typeof exportEngine.validateLocationSubsetForPdf).toBe('function')
    expect(typeof exportEngine.CaseValidationError).toBe('function')
    expect(exportEngine.PDF_VALIDATION_FIELDS.caseNumber).toBe('Case number')
  })

  it('exposes the modal content layer', () => {
    expect(exportEngine.STAGE_MESSAGES.zipping).toBe('Creating ZIP archive...')
    expect(typeof exportEngine.resolveExportModalMode).toBe('function')
    expect(typeof exportEngine.describeValidationPrompt).toBe('function')
    expect(typeof exportEngine.describeExportProgress).toBe('function')
  })

  it('exposes the flow machine and its alert taxonomy', () => {
    for (const name of [
      'requestExport',
      'applyValidation',
      'failValidation',
      'continueValidatedExport',
      'cancelValidation',
      'advanceStage',
      'reportProgress',
      'resetExportFlow',
      'isExporting',
    ]) {
      expect(typeof (exportEngine as unknown as Record<string, unknown>)[name], name).toBe('function')
    }
    expect(exportEngine.EXPORT_ALERTS.noCaseSelected.title).toBe('No Case Selected')
    expect(exportEngine.IDLE_EXPORT_FLOW.stage).toBe('idle')
  })

  it('stays OFF the engine barrel until a consumer needs it there (the media/import-log rule)', () => {
    const surface = engine as unknown as Record<string, unknown>
    for (const name of ['requestExport', 'resolveExportPlan', 'validateLocationForPdf', 'EXPORT_ALERTS']) {
      expect(name in surface, `"${name}" should not be on the engine barrel yet`).toBe(false)
    }
  })

  it('adds nothing to the persisted snapshot — export state is ephemeral by design', () => {
    // The phone calls its export selection "tab-local (never persisted)"; the demo's analog is
    // DemoExperience-local useState. Nothing in this module may reach sessionStorage.
    expect('exportSelection' in engine.createDemoStore().getState()).toBe(false)
    expect('exportFlow' in engine.createDemoStore().getState()).toBe(false)
    // 7 since P7.2 added the analyst profile — this assertion is about the EXPORT module adding
    // nothing, so it tracks the live version rather than pinning a number this module never moves.
    expect(engine.SNAPSHOT_VERSION).toBe(7)
  })
})
