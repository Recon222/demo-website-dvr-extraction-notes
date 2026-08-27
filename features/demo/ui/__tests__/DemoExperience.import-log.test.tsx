import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

// P1.3 integration: the REAL pipeline (run-import is NOT mocked) drives the import log bus
// end to end through the bridge. Only the IO edges are stubbed: pdf.js extraction, the
// /api/extract client (503 → the keyless sample-fallback path — the honesty machinery's
// main branch), and forwardGeocode.
vi.mock('@/features/demo/ui/import/pdf-extract', () => ({
  extractPdfText: vi.fn(),
  PdfExtractionError: class PdfExtractionError extends Error {},
}))
vi.mock('@/features/demo/ui/import/extract-client', () => ({ requestExtraction: vi.fn() }))
const { forwardGeocodeMock } = vi.hoisted(() => ({ forwardGeocodeMock: vi.fn() }))
vi.mock('@/features/demo/ui/import/geocode', async (orig) => ({
  ...(await orig<typeof import('@/features/demo/ui/import/geocode')>()),
  forwardGeocode: forwardGeocodeMock,
}))

import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { extractPdfText } from '@/features/demo/ui/import/pdf-extract'
import { requestExtraction } from '@/features/demo/ui/import/extract-client'
import { importLogBus } from '@/features/demo/engine/logic/import-log'

const pdfMock = vi.mocked(extractPdfText)
const reqMock = vi.mocked(requestExtraction)

const DOC_TEXT = 'a long recovery request document with plenty of text'

beforeEach(() => {
  pdfMock.mockReset()
  reqMock.mockReset()
  forwardGeocodeMock.mockReset()
  forwardGeocodeMock.mockResolvedValue(null)
  importLogBus.reset() // the bridge uses the singleton — isolate each test's run
})

type Store = ReturnType<typeof createDemoStore>

function openImport(store: Store, caseNumber: string) {
  act(() => {
    store.getState().createCase({ caseNumber, displayName: 'Log Case', unit: 'Robbery' })
    store.getState().openModal('import')
  })
}

function pickPdf(container: HTMLElement, names: string[]) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: names.map((n) => new File(['%PDF'], n, { type: 'application/pdf' })) } })
}

/**
 * P1.5 dwell (row 73): a finished run holds on the terminal's outcome CTA — release it
 * before asserting anything on the result view (the pre-P1.5 auto-flip is gone).
 */
async function releaseDwell() {
  fireEvent.click(await screen.findByTestId('terminal-review-cta'))
}

describe('DemoExperience — import log run lifecycle (P1.3)', { timeout: 20000 }, () => {
  it('a real sample-mode PDF run emits the pinned line sequence INIT→FILE→PDF→AI→…→DONE, fallback visible', async () => {
    pdfMock.mockResolvedValue(DOC_TEXT)
    reqMock.mockResolvedValue({ ok: false, notConfigured: true }) // keyless → SAMPLE fallback
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    openImport(store, 'PR25-LOG')
    pickPdf(container, ['request.pdf'])
    await releaseDwell()
    await screen.findByText('Import complete')

    const lines = importLogBus.getLines()
    expect(lines.map((l) => l.level)).toEqual([
      'INIT', // reading document…
      'FILE', // ▸ file 1/1 'request.pdf'
      'PDF', // extract text ✓ (pdf.js)
      'VERB', // extracted document text ▾
      'AI', // AI Request → /api/extract (the call WAS attempted)
      'VERB', // system prompt ▾
      'VERB', // user prompt ▾
      'NORM', // sample fallback: live model not configured — the honesty line
      'OK', // parse + map ✓ (sample yields no normalization warnings)
      'OK', // normalize ✓
      'CASE', // forward geocode → Mapbox (sample carries street+city)
      'CASE', // geocode — no match; no pin
      'CASE', // inject case data ← case record
      'OK', // import ✓ · location created
      'DONE', // import complete
    ])
    expect(lines[0]!.text).toBe('reading document…')
    expect(lines[1]!.text).toBe("▸ file 1/1 'request.pdf'")
    expect(lines.find((l) => l.level === 'NORM')?.text).toMatch(/sample fallback: live model not configured/)
    expect(lines.find((l) => /parse \+ map ✓/.test(l.text))?.detail).toBe('fields: 14 · timeFrames: 1')
    expect(lines.find((l) => /inject case data/.test(l.text))?.detail).toContain("occurrenceNumber: 'PR25-LOG'")
    const created = lines.find((l) => /location created/.test(l.text))
    expect(created?.detail).toBe(`locationId: ${store.getState().locations[0]!.id}`)
    expect(lines[lines.length - 1]!.text).toBe('import complete')
    // seq is 1-based and gapless — nothing was dropped or double-emitted
    expect(lines.map((l) => l.seq)).toEqual(lines.map((_, i) => i + 1))
  })

  it('a paste run opens with INIT reading pasted text… and no FILE/PDF lines', async () => {
    reqMock.mockResolvedValue({ ok: false, notConfigured: true })
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    openImport(store, 'PR25-PASTE')
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByLabelText('Pasted request text'), { target: { value: 'recover footage from Store X' } })
    fireEvent.click(screen.getByText('Import with AI'))
    await releaseDwell()
    await screen.findByText('Import complete')

    const levels = importLogBus.getLines().map((l) => l.level)
    expect(importLogBus.getLines()[0]!.text).toBe('reading pasted text…')
    expect(levels).not.toContain('FILE')
    expect(levels).not.toContain('PDF')
    expect(levels[levels.length - 1]).toBe('DONE')
  })

  it('a 2-file batch is ONE log run: batch INIT header, a FILE line per file, DONE batch complete', async () => {
    pdfMock.mockResolvedValue(DOC_TEXT)
    reqMock.mockResolvedValue({ ok: false, notConfigured: true })
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    openImport(store, 'PR25-BATCH')
    pickPdf(container, ['a.pdf', 'b.pdf'])
    await releaseDwell()
    await screen.findByText('Import complete')

    const lines = importLogBus.getLines()
    expect(lines[0]).toMatchObject({ level: 'INIT', text: 'batch import', detail: '2 files' })
    expect(lines.filter((l) => l.level === 'FILE').map((l) => l.text)).toEqual(["▸ file 1/2 'a.pdf'", "▸ file 2/2 'b.pdf'"])
    const done = lines[lines.length - 1]!
    expect(done.level).toBe('DONE')
    expect(done.text).toBe('batch complete')
    expect(done.detail).toMatch(/^success: 2 · failed: 0 · \d+ms$/)
  })

  it("a mixed batch's DONE line truthfully reports success: 1 · failed: 1 (R-6)", async () => {
    pdfMock.mockResolvedValueOnce(DOC_TEXT).mockRejectedValueOnce(new Error('boom'))
    reqMock.mockResolvedValue({ ok: false, notConfigured: true })
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    openImport(store, 'PR25-MIX')
    pickPdf(container, ['good.pdf', 'bad.pdf'])
    await releaseDwell() // the amber partial CTA
    await screen.findByText('Import complete')

    const done = importLogBus.getLines().at(-1)!
    expect(done.level).toBe('DONE')
    expect(done.text).toBe('batch complete')
    expect(done.detail).toMatch(/^success: 1 · failed: 1 · \d+ms$/)
  })

  it('an all-failed run ends on ERR — no DONE line pretends success', async () => {
    pdfMock.mockRejectedValue(new Error('boom'))
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    openImport(store, 'PR25-ERR')
    pickPdf(container, ['bad.pdf'])
    // Row 79: the card now shows the friendly PDF_READ_FAILED copy; the raw
    // 'Could not read this PDF.' lives on in the Technical Details block.
    await releaseDwell()
    await screen.findByText(/This PDF could not be read/)

    const lines = importLogBus.getLines()
    expect(lines[lines.length - 1]!.level).toBe('ERR')
    expect(lines.map((l) => l.level)).not.toContain('DONE')
  })

  it('cancel mid-run resets the bus and DROPS the cancelled run’s late lines (token isolation)', async () => {
    let resolveExtract: (t: string) => void = () => {}
    pdfMock.mockReturnValue(new Promise<string>((res) => { resolveExtract = res }))
    reqMock.mockResolvedValue({ ok: false, notConfigured: true })
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    openImport(store, 'PR25-CXL')
    pickPdf(container, ['a.pdf'])
    expect(importLogBus.getLines().length).toBeGreaterThan(0) // INIT + FILE landed
    const epochDuringRun = importLogBus.getEpoch()

    fireEvent.click(screen.getByRole('button', { name: 'Close import picker' })) // cancel while extraction is in flight
    expect(importLogBus.getEpoch()).toBe(epochDuringRun + 1) // reset broadcast for the UI
    await act(async () => {
      resolveExtract(DOC_TEXT) // the stale run keeps going…
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(importLogBus.getLines()).toEqual([]) // …but not one late line leaks
    expect(store.getState().locations.length).toBe(0)
  })

  it('a new run after a finished one starts a fresh log (epoch bumped, seq restarts at 1)', async () => {
    pdfMock.mockResolvedValue(DOC_TEXT)
    reqMock.mockResolvedValue({ ok: false, notConfigured: true })
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    openImport(store, 'PR25-TWICE')
    pickPdf(container, ['first.pdf'])
    await releaseDwell()
    await screen.findByText('Import complete')
    const firstEpoch = importLogBus.getEpoch()

    fireEvent.click(screen.getByText('Done')) // close → bus.reset (epoch +1)
    expect(importLogBus.getLines()).toEqual([]) // a closed modal leaves no stale log behind
    act(() => store.getState().openModal('import'))
    pickPdf(container, ['second.pdf']) // beginRun (epoch +2)
    await releaseDwell()
    await screen.findByText('Import complete')

    expect(importLogBus.getEpoch()).toBe(firstEpoch + 2)
    const lines = importLogBus.getLines()
    expect(lines[0]).toMatchObject({ seq: 1, level: 'INIT' })
    expect(lines[1]!.text).toBe("▸ file 1/1 'second.pdf'") // only the new run is retained
  })
})
