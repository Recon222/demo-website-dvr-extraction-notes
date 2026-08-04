import { describe, it, expect } from 'vitest'
import * as demo from '@/features/demo/engine'

// The barrel is the engine's public surface; this pins that the engine API is reachable
// from a single import (what the store and UI consume) — and that the deleted guided-tour
// director is really gone from it.
describe('features/demo/engine barrel', () => {
  it('exposes the store + selectors; the director is gone', () => {
    expect(typeof demo.createDemoStore).toBe('function')
    expect(typeof demo.selectCaseNotesData).toBe('function')
    const surface = demo as unknown as Record<string, unknown>
    // FORM_OPTIONS + optionValues: deleted dead registry/helper (reviews R-11/R-17, R-20) —
    // the canonical option lists in engine/content/form-options are the only surface.
    // importLogBus/createImportLogBus: the import-log module is internal-path-only (P1
    // review R-10) — the barrel must not advertise the mutable bus singleton.
    for (const gone of ['runBeat', 'BEATS', 'realClock', 'FORM_OPTIONS', 'optionValues', 'importLogBus', 'createImportLogBus']) {
      expect(gone in surface, `"${gone}" should no longer be exported`).toBe(false)
    }
  })

  it('exposes the logic functions', () => {
    expect(typeof demo.calculateTimeDifference).toBe('function')
    expect(typeof demo.calculateCorrectedTimeRange).toBe('function')
    expect(typeof demo.roundTo5Min).toBe('function')
    expect(typeof demo.cleanOcrText).toBe('function')
    expect(typeof demo.parseTimestampFromText).toBe('function')
    expect(typeof demo.getConfidenceLevel).toBe('function')
    expect(typeof demo.parseAiJson).toBe('function')
    expect(typeof demo.mapAiToForm).toBe('function')
    expect(typeof demo.generateCaseNotesDoc).toBe('function')
    expect(typeof demo.generateTimeOffsetDoc).toBe('function')
    // P2.4 (G9): the Completion gate — the demo's only runtime validation, like the phone's.
    expect(typeof demo.validateFinalSubmission).toBe('function')
    expect(typeof demo.toFinalSubmissionInput).toBe('function')
    expect(demo.FINAL_SUBMISSION_MESSAGES.occNumber).toBe('OCC number is required')
  })

  it('exposes the content registries (no seed case — the demo boots empty)', () => {
    expect(demo.CHAPTERS.length).toBeGreaterThan(0)
    expect(demo.WIZARD_SCREENS.length).toBe(10)
    expect(demo.NARRATION.splash.title.length).toBeGreaterThan(0)
    const surface = demo as unknown as Record<string, unknown>
    expect('SEED_CASE' in surface).toBe(false)
    expect('SEED_LOCATION' in surface).toBe(false)
    expect(demo.SAMPLE_REQUEST_DOC).toContain('PR25-0098213') // survives: the live-import fallback
    // P7.3 replaced the single hardcoded `FORENSIC` config with the real three-profile
    // defaults; the legacy shape is gone from the barrel on purpose.
    expect('FORENSIC' in surface).toBe(false)
    expect('getProfile' in surface).toBe(false)
    expect(demo.FORM_STEPS.length).toBe(12)
    expect(demo.FORM_FIELDS.length).toBe(58)
    expect(Object.values(demo.PROFILE_DEFAULTS.forensic.steps).every(Boolean)).toBe(true)
  })
})
