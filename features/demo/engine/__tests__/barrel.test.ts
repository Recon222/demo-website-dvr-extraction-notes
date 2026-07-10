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
    for (const gone of ['runBeat', 'BEATS', 'realClock']) {
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
  })

  it('exposes the content registries (no seed case — the demo boots empty)', () => {
    expect(demo.CHAPTERS.length).toBeGreaterThan(0)
    expect(demo.WIZARD_SCREENS.length).toBe(10)
    expect(demo.NARRATION.splash.title.length).toBeGreaterThan(0)
    const surface = demo as unknown as Record<string, unknown>
    expect('SEED_CASE' in surface).toBe(false)
    expect('SEED_LOCATION' in surface).toBe(false)
    expect(demo.SAMPLE_REQUEST_DOC).toContain('PR25-0098213') // survives: the live-import fallback
    expect(demo.FORENSIC.wizardScreens.length).toBe(10)
  })
})
