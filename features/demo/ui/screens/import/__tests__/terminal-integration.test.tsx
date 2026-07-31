import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ImportModal } from '@/features/demo/ui/screens/ImportModal'
import { TRUST_LINE } from '@/features/demo/ui/screens/import/ImportTerminalProgress'
import { createImportLogBus } from '@/features/demo/engine/logic/import-log'
import { runImport, type ImportStageId as RunStageId } from '@/features/demo/ui/import/run-import'

/**
 * P1.4 integration: the ImportModal 'progress' stage renders the live terminal fed by a
 * REAL sample-mode run — runImport is not mocked; live:false takes the deterministic
 * SAMPLE path (no network), emitting into a real bus exactly as DemoExperience does.
 * Real timers: the useImportLog flush rides jsdom's rAF; findBy* waits it out.
 */
describe('ImportModal progress stage × real sample-mode run (P1.4)', () => {
  it('tails the run: fallback honesty line, normalize lines, truthful trust line, live cursor', async () => {
    const bus = createImportLogBus()
    const emitter = bus.beginRun(() => 0)
    emitter.log('INIT', 'reading pasted text…') // as runTextImportFlow does
    let lastStage: RunStageId | null = null
    const result = await runImport({
      documentText: 'recover the rear-lane footage please',
      live: false, // the deterministic sample seam — the real pipeline, no network
      onStage: (s) => {
        lastStage = s
      },
      emitter,
    })
    expect(result.ok).toBe(true)
    expect(lastStage).toBe('done')

    render(
      <ImportModal
        stage="progress"
        text=""
        activeStage={lastStage}
        result={null} // pre-P1.5: stage 'progress' means no result committed yet
        batch={null}
        logBus={bus}
        onPdfFilesSelected={vi.fn()}
        onClipboardText={vi.fn()}
        onChoosePaste={vi.fn()}
        onTextChange={vi.fn()}
        onRun={vi.fn()}
        onBack={vi.fn()}
        onRetry={vi.fn()}
        onOpenLocation={vi.fn()}
        onCancel={vi.fn()}
        onReviewImport={vi.fn()}
      />,
    )

    // The retained run replays into the terminal (INIT emitted before mount included).
    const log = await screen.findByTestId('terminal-log')
    await within(log).findByText('reading pasted text…')
    // The sample substitution is visible in the log AND in the trust line — never 'on-device'.
    within(log).getByText('sample fallback: live import disabled — importing the sample request')
    expect(screen.getByTestId('terminal-trust-line')).toHaveTextContent(TRUST_LINE.sample)
    // The real pipeline's stage completions landed.
    within(log).getByText('parse + map ✓')
    within(log).getByText('normalize ✓')
    // Still running as far as the modal is concerned: cursor up, processing badge shown.
    expect(screen.getByTestId('terminal-cursor')).toBeInTheDocument()
    expect(screen.getByTestId('terminal-processing-badge')).toBeInTheDocument()
    expect(screen.queryByTestId('terminal-review-cta')).not.toBeInTheDocument()
    // activeStage 'done' maps to the saving band.
    expect(screen.getByTestId('terminal-status')).toHaveTextContent('Saving to case...')
  })
})
