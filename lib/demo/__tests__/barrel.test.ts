import { describe, it, expect } from 'vitest'
import * as demo from '@/lib/demo'

// The barrel is the engine's public surface; this pins that the engine API is reachable
// from a single import (what the store, director, and UI consume).
describe('lib/demo barrel', () => {
  it('exposes the Milestone 2 store + director', () => {
    expect(typeof demo.createDemoStore).toBe('function')
    expect(typeof demo.runBeat).toBe('function')
    expect(typeof demo.selectCaseNotesData).toBe('function')
    expect(demo.BEATS).toBeTruthy()
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

  it('exposes the content registries', () => {
    expect(demo.TOUR_CHAPTERS.length).toBeGreaterThan(0)
    expect(demo.WIZARD_SCREENS.length).toBe(10)
    expect(demo.NARRATION.splash.title.length).toBeGreaterThan(0)
    expect(demo.SEED_CASE.isSeed).toBe(true)
    expect(demo.SAMPLE_REQUEST_DOC).toContain('PR25-0098213')
    expect(demo.FORENSIC.wizardScreens.length).toBe(10)
  })
})
