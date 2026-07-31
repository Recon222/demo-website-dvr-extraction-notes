import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'

// Controlled seam for motion/react's useReducedMotion (R-18): the real hook latches a
// module-global on first use, so a per-test matchMedia override cannot flip it. The mock
// also pins WHICH hook the component consumes — reverting to the marketing hook would
// bypass this mock and fail the reduced-motion test below.
const motionState = vi.hoisted(() => ({ reduce: false as boolean | null }))
vi.mock('motion/react', async (orig) => ({
  ...(await orig<typeof import('motion/react')>()),
  useReducedMotion: () => motionState.reduce,
}))
import {
  ImportTerminalProgress,
  isNearBottom,
  deriveTrust,
  TRUST_LINE,
  TERMINAL_TITLE,
  NEAR_BOTTOM_THRESHOLD,
  BADGE_SLOT_HEIGHT,
  type ImportTerminalProgressProps,
  type TerminalOutcome,
} from '@/features/demo/ui/screens/import/ImportTerminalProgress'
import { createImportLogBus, type ImportLogBus, type ImportLogEmitter } from '@/features/demo/engine/logic/import-log'
import { SAMPLE_FALLBACK_PREFIX } from '@/features/demo/ui/import/run-import'

// Fake timers drive the useImportLog coalescing frame (same rig as useImportLog.test.ts).
beforeEach(() => {
  vi.useFakeTimers()
  motionState.reduce = false
})
afterEach(() => vi.useRealTimers())

const nextFrame = () => act(() => void vi.advanceTimersToNextFrame())

function setup(over: Partial<ImportTerminalProgressProps> = {}, preEmit?: (e: ImportLogEmitter) => void) {
  const bus = createImportLogBus()
  const emitter = bus.beginRun(() => 0)
  if (preEmit) preEmit(emitter)
  const onReview = vi.fn()
  const props: ImportTerminalProgressProps = { stage: 'reading_model', outcome: null, batch: null, onReview, bus, ...over }
  const utils = render(<ImportTerminalProgress {...props} />)
  const rerenderWith = (next: Partial<ImportTerminalProgressProps>) =>
    utils.rerender(<ImportTerminalProgress {...props} {...next} />)
  return { ...utils, bus, emitter, onReview, rerenderWith }
}

/** Give the jsdom log element real-ish scroll metrics (jsdom does no layout). */
function mockLogMetrics(scrollHeight = 1000, clientHeight = 200) {
  const el = screen.getByTestId('terminal-log')
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
  return el
}

const SUCCESS: TerminalOutcome = { status: 'success', successCount: 1, totalFiles: 1 }

describe('ImportTerminalProgress (P1.4, matrix row 74)', () => {
  // ---- replay + lines ----

  it('renders the retained run on mount (synchronous replay through useImportLog)', () => {
    setup({}, (e) => {
      e.log('INIT', 'reading document…')
      e.log('PDF', 'extract text ✓', 'pdf.js (in-browser) · 3184 chars · 12ms')
      e.log('OK', 'parse + map ✓')
    })
    nextFrame()
    const log = screen.getByTestId('terminal-log')
    const rows = within(log).getAllByTestId(/^terminal-line-/)
    expect(rows.map((r) => r.textContent)).toEqual([
      'T+0.00INITreading document…',
      'T+0.00PDFextract text ✓▸',
      'T+0.00OKparse + map ✓',
    ])
  })

  it('expands and collapses a detail line per click (collapsed by default)', () => {
    const { emitter } = setup()
    act(() => emitter.log('AI', 'AI Response', 'length: 812 · preview: {"businessName":…'))
    nextFrame()
    expect(screen.queryByTestId('terminal-detail-1')).not.toBeInTheDocument()
    const row = within(screen.getByTestId('terminal-line-1')).getByRole('button')
    fireEvent.click(row)
    expect(screen.getByTestId('terminal-detail-1')).toHaveTextContent('length: 812')
    fireEvent.click(row)
    expect(screen.queryByTestId('terminal-detail-1')).not.toBeInTheDocument()
  })

  // ---- headline + progress track ----

  it('maps each pipeline stage to the phone headline + percent band (orchestrator.ts:288/428/459 · PROGRESS_STAGES)', () => {
    const { rerenderWith } = setup({ stage: null })
    const status = () => screen.getByTestId('terminal-status').textContent
    const width = () => screen.getByTestId('terminal-progress-fill').style.width
    expect(status()).toBe('Preparing…')
    expect(width()).toBe('0%')
    rerenderWith({ stage: 'extracting_text' })
    expect(status()).toBe('Extracting text from PDF...')
    expect(width()).toBe('0%')
    rerenderWith({ stage: 'reading_model' })
    expect(status()).toBe('Extracting fields from document...')
    expect(width()).toBe('15%')
    rerenderWith({ stage: 'normalizing' })
    expect(status()).toBe('Normalizing extracted data...')
    expect(width()).toBe('55%')
    rerenderWith({ stage: 'done' })
    // Adapted from the phone's 'Saving to database...' (:806) — the demo saves to the case store.
    expect(status()).toBe('Saving to case...')
    expect(width()).toBe('80%')
  })

  it("stage 'error' freezes the last real stage's headline and percent", () => {
    const { rerenderWith } = setup({ stage: 'normalizing' })
    rerenderWith({ stage: 'error' })
    expect(screen.getByTestId('terminal-status')).toHaveTextContent('Normalizing extracted data...')
    expect(screen.getByTestId('terminal-progress-fill').style.width).toBe('55%')
  })

  it('exposes a labelled progressbar and a polite live status (phone a11y parity)', () => {
    setup({ stage: 'normalizing' })
    const bar = screen.getByRole('progressbar', { name: 'Import progress: 55 percent' })
    expect(bar).toHaveAttribute('aria-valuenow', '55')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(screen.getByTestId('terminal-status')).toHaveAttribute('aria-live', 'polite')
  })

  // ---- truthful title bar ----

  it('title bar reads "pdf-import · in-browser" with the cloud trust line by default — never the phone\'s on-device claim', () => {
    const { container } = setup()
    expect(TERMINAL_TITLE).toBe('pdf-import · in-browser')
    expect(screen.getByText(TERMINAL_TITLE)).toBeInTheDocument()
    expect(screen.getByTestId('terminal-trust-line')).toHaveTextContent(TRUST_LINE.cloud)
    expect(TRUST_LINE.cloud).toBe('cloud model via server proxy')
    // The phone's strings would be lies here — pin their absence everywhere.
    expect(container.textContent).not.toContain('on-device')
    expect(container.textContent).not.toContain('nothing leaves this phone')
  })

  it('the trust line follows the run\'s actual FallbackMode: a sample-fallback line flips it to the in-browser wording', () => {
    const { emitter } = setup()
    act(() => emitter.log('NORM', 'sample fallback: live model not configured — importing the sample request', '/api/extract → 503 NOT_CONFIGURED'))
    nextFrame()
    expect(screen.getByTestId('terminal-trust-line')).toHaveTextContent(TRUST_LINE.sample)
    expect(TRUST_LINE.sample).toBe('sample import · in-browser')
    // The processing badge repeats the same truth (phone: badge sub repeats the title-bar claim).
    expect(screen.getByTestId('terminal-processing-badge')).toHaveTextContent(TRUST_LINE.sample)
  })

  it('deriveTrust: cloud until a sample-fallback NORM line appears (any of the three emitFallback wordings)', () => {
    expect(deriveTrust([])).toBe('cloud')
    expect(deriveTrust([{ seq: 1, elapsedMs: 0, level: 'AI', text: 'AI Request → /api/extract' }])).toBe('cloud')
    for (const text of [
      `${SAMPLE_FALLBACK_PREFIX} live import disabled — importing the sample request`,
      `${SAMPLE_FALLBACK_PREFIX} live model not configured — importing the sample request`,
      `${SAMPLE_FALLBACK_PREFIX} couldn't reach the live model — importing the sample request`,
    ]) {
      expect(deriveTrust([{ seq: 1, elapsedMs: 0, level: 'NORM', text }])).toBe('sample')
    }
    // A NORM normalization-warning line is NOT a fallback signal.
    expect(deriveTrust([{ seq: 1, elapsedMs: 0, level: 'NORM', text: 'Assumed MM/DD format for ambiguous date' }])).toBe('cloud')
    // The contract is the shared typed prefix, not re-declared prose (R-32).
    expect(SAMPLE_FALLBACK_PREFIX).toBe('sample fallback:')
  })

  it('deriveTrust is SEGMENT-scoped in a batch (R-1): a FILE marker resets to cloud — no sticky sample latch', () => {
    const l = (seq: number, level: 'FILE' | 'NORM' | 'AI', text: string) => ({ seq, elapsedMs: 0, level, text }) as const
    // File 1 falls back to the sample; file 2 goes to the cloud model. The label must
    // follow the CURRENT file — claiming "in-browser" for file 2 would underclaim exposure.
    expect(
      deriveTrust([
        l(1, 'FILE', "▸ file 1/3 'a.pdf'"),
        l(2, 'NORM', `${SAMPLE_FALLBACK_PREFIX} couldn't reach the live model — importing the sample request`),
        l(3, 'FILE', "▸ file 2/3 'b.pdf'"),
        l(4, 'AI', 'AI Request → /api/extract'),
      ]),
    ).toBe('cloud')
    // …and the reverse still flips: the current file's own fallback reads sample.
    expect(
      deriveTrust([
        l(1, 'FILE', "▸ file 1/2 'a.pdf'"),
        l(2, 'AI', 'AI Request → /api/extract'),
        l(3, 'FILE', "▸ file 2/2 'b.pdf'"),
        l(4, 'NORM', `${SAMPLE_FALLBACK_PREFIX} live model not configured — importing the sample request`),
      ]),
    ).toBe('sample')
  })

  it('mid-batch, the badge and title bar re-label the CURRENT file after an earlier fallback (R-1)', () => {
    const { emitter } = setup({ batch: { current: 2, total: 3 } })
    act(() => {
      emitter.log('FILE', "▸ file 1/3 'a.pdf'")
      emitter.log('NORM', `${SAMPLE_FALLBACK_PREFIX} couldn't reach the live model — importing the sample request`)
      emitter.log('FILE', "▸ file 2/3 'b.pdf'")
      emitter.log('AI', 'AI Request → /api/extract')
    })
    nextFrame()
    expect(screen.getByTestId('terminal-trust-line')).toHaveTextContent(TRUST_LINE.cloud)
    expect(screen.getByTestId('terminal-processing-badge')).toHaveTextContent(`File 2 of 3 · ${TRUST_LINE.cloud}`)
  })

  // ---- cursor ----

  it('shows the blinking ▌ cursor while running and removes it once an outcome lands', () => {
    const { rerenderWith } = setup()
    const cursor = screen.getByTestId('terminal-cursor')
    expect(cursor).toHaveTextContent('▌')
    expect(cursor.style.animation).toContain('termCursorBlink')
    rerenderWith({ outcome: SUCCESS })
    expect(screen.queryByTestId('terminal-cursor')).not.toBeInTheDocument()
  })

  it('reduced motion (motion/react hook, R-18): cursor stays visible but static, CTA morph does not animate', () => {
    motionState.reduce = true
    const { rerenderWith } = setup()
    expect(screen.getByTestId('terminal-cursor').style.animation).toBe('')
    rerenderWith({ outcome: SUCCESS })
    expect(screen.getByTestId('terminal-review-cta').style.animation).toBe('')
  })

  // ---- auto-follow / pin ----

  it('the mount replay paints at the top; later appends tail-scroll to the measured bottom while pinned', () => {
    const { emitter } = setup()
    const el = mockLogMetrics(1000, 200)
    nextFrame() // settle the empty replay commit
    act(() => {
      emitter.log('INIT', 'reading document…')
      emitter.log('PDF', 'extract text ✓')
    })
    nextFrame()
    expect(el.scrollTop).toBe(0) // first non-empty commit = replay burst → stays at top
    act(() => emitter.log('OK', 'parse + map ✓'))
    nextFrame()
    expect(el.scrollTop).toBe(800) // scrollHeight - clientHeight: the exact measured bottom
  })

  it('a user scroll away from the bottom unpins (pill appears) and appends stop following', () => {
    const { emitter } = setup()
    const el = mockLogMetrics(1000, 200)
    nextFrame()
    act(() => {
      emitter.log('INIT', 'a')
      emitter.log('OK', 'b')
    })
    nextFrame()
    expect(screen.queryByTestId('jump-to-latest-pill')).not.toBeInTheDocument()
    // User gesture: wheel marks intent, the resulting scroll settles the pin.
    fireEvent.wheel(el, { deltaY: -120 })
    el.scrollTop = 100 // 100 + 200 < 1000 - 80 → far from bottom
    fireEvent.scroll(el)
    expect(screen.getByTestId('jump-to-latest-pill')).toBeInTheDocument()
    act(() => emitter.log('OK', 'c'))
    nextFrame()
    expect(el.scrollTop).toBe(100) // un-pinned: the tail must not fight the operator
  })

  it('keyboard scrolling unpins too (R-2, WCAG 2.1.1): the log is focusable and scroll keys arm the pin', () => {
    const { emitter } = setup()
    const el = mockLogMetrics(1000, 200)
    nextFrame()
    act(() => {
      emitter.log('INIT', 'a')
      emitter.log('OK', 'b')
    })
    nextFrame()
    // A first-class keyboard target: reachable by Tab, named for AT, not a second live region.
    expect(el).toHaveAttribute('tabindex', '0')
    expect(el).toHaveAttribute('role', 'log')
    expect(el).toHaveAttribute('aria-live', 'off')
    expect(el).toHaveAttribute('aria-label', 'Import log')
    // ArrowUp + the resulting scroll away from the bottom → unpin, pill appears.
    fireEvent.keyDown(el, { key: 'ArrowUp' })
    el.scrollTop = 100
    fireEvent.scroll(el)
    expect(screen.getByTestId('jump-to-latest-pill')).toBeInTheDocument()
    act(() => emitter.log('OK', 'c'))
    nextFrame()
    expect(el.scrollTop).toBe(100) // un-pinned: the tail must not fight the keyboard user
    // PageDown back near the bottom re-pins (same 80px threshold as every gesture).
    fireEvent.keyDown(el, { key: 'PageDown' })
    el.scrollTop = 750
    fireEvent.scroll(el)
    expect(screen.queryByTestId('jump-to-latest-pill')).not.toBeInTheDocument()
    // A non-scroll key is NOT user scroll intent — it must not arm the pin gate.
    fireEvent.keyDown(el, { key: 'a' })
    el.scrollTop = 100
    fireEvent.scroll(el)
    expect(screen.queryByTestId('jump-to-latest-pill')).not.toBeInTheDocument()
  })

  it('programmatic scrolls never flip the pin (no wheel/touch preceding the scroll event)', () => {
    const { emitter } = setup()
    const el = mockLogMetrics(1000, 200)
    nextFrame()
    act(() => emitter.log('INIT', 'a'))
    nextFrame()
    el.scrollTop = 40
    fireEvent.scroll(el) // e.g. the tail's own scroll — no user gesture marked
    expect(screen.queryByTestId('jump-to-latest-pill')).not.toBeInTheDocument()
  })

  it('a user release near the bottom (≤80px) re-pins without the pill', () => {
    expect(NEAR_BOTTOM_THRESHOLD).toBe(80) // phone :76
    const { emitter } = setup()
    const el = mockLogMetrics(1000, 200)
    nextFrame()
    act(() => emitter.log('INIT', 'a'))
    nextFrame()
    fireEvent.wheel(el, { deltaY: -120 })
    el.scrollTop = 100
    fireEvent.scroll(el)
    expect(screen.getByTestId('jump-to-latest-pill')).toBeInTheDocument()
    fireEvent.wheel(el, { deltaY: 120 })
    el.scrollTop = 750 // 750 + 200 ≥ 1000 - 80 → near bottom
    fireEvent.scroll(el)
    expect(screen.queryByTestId('jump-to-latest-pill')).not.toBeInTheDocument()
  })

  it('tapping the pill re-pins and jumps to the exact measured bottom', () => {
    const { emitter } = setup()
    const el = mockLogMetrics(1000, 200)
    nextFrame()
    act(() => emitter.log('INIT', 'a'))
    nextFrame()
    fireEvent.wheel(el, { deltaY: -120 })
    el.scrollTop = 100
    fireEvent.scroll(el)
    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest log line' }))
    expect(screen.queryByTestId('jump-to-latest-pill')).not.toBeInTheDocument()
    expect(el.scrollTop).toBe(800)
  })

  it('isNearBottom is a pure 80px threshold decision (phone parity, :79-85)', () => {
    expect(isNearBottom({ scrollTop: 720, clientHeight: 200, scrollHeight: 1000 })).toBe(true) // exactly at threshold
    expect(isNearBottom({ scrollTop: 719, clientHeight: 200, scrollHeight: 1000 })).toBe(false)
    expect(isNearBottom({ scrollTop: 0, clientHeight: 200, scrollHeight: 100 })).toBe(true) // short content
  })

  // ---- epoch reset (new run) ----

  it('a new run (epoch bump) clears lines, re-pins, collapses expansions, and restarts at the top', () => {
    const { bus, emitter } = setup()
    const el = mockLogMetrics(1000, 200)
    nextFrame()
    act(() => emitter.log('AI', 'AI Response', 'length: 812'))
    nextFrame()
    // Expand the detail, then unpin — both must reset with the next run.
    fireEvent.click(within(screen.getByTestId('terminal-line-1')).getByRole('button'))
    expect(screen.getByTestId('terminal-detail-1')).toBeInTheDocument()
    fireEvent.wheel(el, { deltaY: -120 })
    el.scrollTop = 100
    fireEvent.scroll(el)
    expect(screen.getByTestId('jump-to-latest-pill')).toBeInTheDocument()

    let nextEmitter: ImportLogEmitter
    act(() => {
      nextEmitter = bus.beginRun(() => 0)
      nextEmitter.log('AI', 'AI Response', 'length: 90') // same seq 1, detail again
    })
    nextFrame()
    expect(screen.queryByText('length: 812')).not.toBeInTheDocument()
    expect(screen.queryByTestId('jump-to-latest-pill')).not.toBeInTheDocument() // re-pinned
    expect(el.scrollTop).toBe(0) // restarted at the top
    // Seq 1 exists again in the new run but starts collapsed: expansion state was cleared.
    expect(screen.queryByTestId('terminal-detail-1')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('terminal-line-1')).getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  // ---- badge slot + outcomes ----

  it('the badge slot is a fixed 60px in BOTH states — the morph causes zero reflow', () => {
    const { rerenderWith } = setup()
    expect(BADGE_SLOT_HEIGHT).toBe(60)
    expect(screen.getByTestId('terminal-processing-badge').style.height).toBe('60px')
    rerenderWith({ outcome: SUCCESS })
    const cta = screen.getByTestId('terminal-review-cta')
    expect(cta.style.height).toBe('60px')
    expect(cta.style.animation).toContain('termFadeIn 350ms')
    expect(screen.queryByTestId('terminal-processing-badge')).not.toBeInTheDocument()
  })

  it('processing badge: single run copy (phone :399-402) with the truthful sub line', () => {
    setup({ batch: { current: 1, total: 1 } })
    const badge = screen.getByTestId('terminal-processing-badge')
    expect(badge).toHaveTextContent('Processing recovery request')
    expect(badge).not.toHaveTextContent('Processing recovery requests')
    expect(badge).not.toHaveTextContent('File 1 of 1') // single import shows no file counter (phone parity)
    expect(badge).toHaveTextContent(TRUST_LINE.cloud)
  })

  it('processing badge: batch copy with the "File N of M · " prefix', () => {
    setup({ batch: { current: 2, total: 3 } })
    const badge = screen.getByTestId('terminal-processing-badge')
    expect(badge).toHaveTextContent('Processing recovery requests')
    expect(badge).toHaveTextContent(`File 2 of 3 · ${TRUST_LINE.cloud}`)
  })

  it('success (single): green CTA with the phone copy, firing onReview on tap', () => {
    const { rerenderWith, onReview } = setup()
    rerenderWith({ outcome: SUCCESS })
    expect(screen.getByTestId('terminal-status')).toHaveTextContent('Import ready for review')
    // R-3: the accessible NAME is the visible text (Label in Name); a11y framing is the description.
    const cta = screen.getByRole('button', { name: /Import ready for review/ })
    expect(cta).toHaveAccessibleDescription('Review the import before it saves')
    expect(cta).toHaveTextContent('Import ready for review')
    expect(cta).toHaveTextContent('Review import →')
    expect(cta.style.border).toContain('rgba(16, 209, 119, 0.32)')
    expect(screen.getByText('Import ready for review', { selector: 'span' }).style.color).toBe('rgb(127, 230, 182)') // #7fe6b6
    expect(screen.getByTestId('terminal-progress-fill').style.width).toBe('100%')
    fireEvent.click(cta)
    expect(onReview).toHaveBeenCalledTimes(1)
  })

  it('success (batch): headline "Batch complete" and the counted title', () => {
    const { rerenderWith } = setup({ batch: { current: 3, total: 3 } })
    rerenderWith({ outcome: { status: 'success', successCount: 3, totalFiles: 3 } })
    expect(screen.getByTestId('terminal-status')).toHaveTextContent('Batch complete')
    expect(screen.getByTestId('terminal-review-cta')).toHaveTextContent('Batch complete — 3 of 3 locations')
  })

  it('partial: the amber treatment — a partial batch must never read as clean success', () => {
    const { rerenderWith } = setup({ batch: { current: 3, total: 3 } })
    rerenderWith({ outcome: { status: 'partial', successCount: 2, totalFiles: 3 } })
    expect(screen.getByTestId('terminal-status')).toHaveTextContent('Batch partially failed')
    // R-3's load-bearing fact: the COUNTS are in the accessible name, not suppressed by a label.
    const cta = screen.getByRole('button', { name: /Batch partially failed — 2 of 3, 1 needs attention/ })
    expect(cta).toHaveAccessibleDescription('Review the import — some files failed')
    expect(cta).toHaveTextContent('Batch partially failed — 2 of 3, 1 needs attention')
    expect(cta).toHaveTextContent('Review import →')
    expect(cta.style.border).toContain('rgba(255, 217, 61, 0.36)') // amber, not green
    expect(cta.style.background).toContain('rgba(255, 217, 61, 0.1)')
  })

  it('partial: pluralizes the needs-attention count (phone template parity)', () => {
    const { rerenderWith } = setup({ batch: { current: 4, total: 4 } })
    rerenderWith({ outcome: { status: 'partial', successCount: 1, totalFiles: 4 } })
    expect(screen.getByTestId('terminal-review-cta')).toHaveTextContent('Batch partially failed — 1 of 4, 3 need attention')
  })

  it('failure: red treatment, "See error details →", the log stays visible, and the bar does not claim 100%', () => {
    const { emitter, rerenderWith } = setup({ stage: 'normalizing' })
    act(() => emitter.log('ERR', '✗ failed at normalizing'))
    nextFrame()
    rerenderWith({ stage: 'error', outcome: { status: 'failure' } })
    expect(screen.getByTestId('terminal-status')).toHaveTextContent('Import failed')
    const cta = screen.getByRole('button', { name: /See error details/ }) // visible text IS the name (R-3)
    expect(cta).toHaveTextContent('Import failed')
    expect(cta).toHaveTextContent('See error details →')
    expect(cta.style.border).toContain('rgba(255, 71, 87, 0.32)')
    // "The log is most valuable when something broke" — the failed run's lines stay up.
    expect(screen.getByText('✗ failed at normalizing')).toBeInTheDocument()
    expect(screen.getByTestId('terminal-progress-fill').style.width).toBe('55%')
  })

  it('failure in a batch run reads "Batch failed" (no counts — phone parity, outcome carries none)', () => {
    const { rerenderWith } = setup({ batch: { current: 3, total: 3 } })
    rerenderWith({ stage: 'error', outcome: { status: 'failure' } })
    expect(screen.getByTestId('terminal-review-cta')).toHaveTextContent('Batch failed')
    expect(screen.getByTestId('terminal-status')).toHaveTextContent('Batch failed')
  })
})
