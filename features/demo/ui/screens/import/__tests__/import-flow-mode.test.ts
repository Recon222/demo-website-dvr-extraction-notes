import { describe, it, expect } from 'vitest'
import { computeImportStage } from '@/features/demo/ui/screens/import/import-flow-mode'

describe('computeImportStage (P1.5, matrix row 73 — the phone computeImportFlowMode port)', () => {
  it('picker/paste pass through untouched', () => {
    expect(computeImportStage({ stage: 'picker', result: null, acknowledged: false })).toBe('picker')
    expect(computeImportStage({ stage: 'paste', result: null, acknowledged: false })).toBe('paste')
  })

  it('a running import (no result yet) is progress', () => {
    expect(computeImportStage({ stage: 'progress', result: null, acknowledged: false })).toBe('progress')
  })

  it('THE DWELL: a non-null result does NOT show results until acknowledged', () => {
    expect(computeImportStage({ stage: 'progress', result: { ok: true }, acknowledged: false })).toBe('progress')
  })

  it('the dwell applies to failures too — the log is most valuable when something broke', () => {
    expect(computeImportStage({ stage: 'progress', result: { ok: false }, acknowledged: false })).toBe('progress')
  })

  it('acknowledging releases the dwell to the result view (success and failure alike)', () => {
    expect(computeImportStage({ stage: 'progress', result: { ok: true }, acknowledged: true })).toBe('result')
    expect(computeImportStage({ stage: 'progress', result: { ok: false }, acknowledged: true })).toBe('result')
  })

  it('a STORED result stage passes through — the pre-pipeline guard path has no run to dwell on', () => {
    expect(computeImportStage({ stage: 'result', result: { ok: false }, acknowledged: false })).toBe('result')
  })

  it('acknowledged without a result never skips ahead (a stale flag cannot fast-forward a live run)', () => {
    expect(computeImportStage({ stage: 'progress', result: null, acknowledged: true })).toBe('progress')
  })
})
