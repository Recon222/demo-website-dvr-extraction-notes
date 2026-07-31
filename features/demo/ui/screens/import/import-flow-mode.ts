/**
 * The import modal's tap-gate dwell (parity P1.5, matrix row 73) — the demo port of the
 * phone's `computeImportFlowMode` (src/features/import/utils/compute-import-flow-mode.ts),
 * extracted pure for the same reason the phone extracted it: the dwell must be
 * unit-testable without rendering the whole bridge.
 *
 * The one semantic that matters (phone :39-52, inventory §5.7.2): **a non-null result does
 * NOT mean results are showing.** After a run finishes, the terminal PERSISTS — the stage
 * stays 'progress' — until the visitor taps the outcome CTA ("Review import →" /
 * "See error details →", the phone's `pdfTerminalAcknowledged`). This applies to failures
 * too: the log is most valuable when something broke.
 *
 * Demo-shape notes: the demo's single stored `stage` union subsumes the phone's
 * picker/flow modal split, so 'picker'/'paste' pass through untouched. A STORED 'result'
 * also passes through — that is the pre-pipeline guard path ('Select a case first.' /
 * 'Paste the request text first.'), which never started a run, has no log, and therefore
 * has nothing to dwell on (the phone's equivalent guards live before its pipeline too).
 */

export type ImportUiStage = 'picker' | 'paste' | 'progress' | 'result'

export interface ImportFlowInputs {
  /** The stored stage: where the flow was last DRIVEN to (never derived). */
  stage: ImportUiStage
  /** Structural: non-null once the run finished (success or failure). */
  result: { ok: boolean } | null
  /** The visitor tapped the terminal's outcome CTA — releases the dwell. */
  acknowledged: boolean
}

export function computeImportStage(i: ImportFlowInputs): ImportUiStage {
  if (i.stage !== 'progress') return i.stage
  if (i.result === null) return 'progress' // still running
  return i.acknowledged ? 'result' : 'progress' // the dwell: finished ≠ acknowledged
}
