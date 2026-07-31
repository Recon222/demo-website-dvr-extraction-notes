import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

// Drive the interactive surface end-to-end (the bridge's most-grown, least-covered code):
// the marquee OCR→offset path, the import pipeline, and the PDF-preview mount.
// The import orchestrator (pdf.js + the model proxy) is mocked — no network, no real PDF.
vi.mock('@/features/demo/ui/import/run-import', () => ({ runImport: vi.fn(), runPdfImport: vi.fn() }))

// Mock only the IO forwardGeocode (keep the pure buildGeocodeQuery real) so import geocoding is
// deterministic — returns undefined by default (no gps), set per-test when a coordinate is wanted.
const { forwardGeocodeMock } = vi.hoisted(() => ({ forwardGeocodeMock: vi.fn() }))
vi.mock('@/features/demo/ui/import/geocode', async (orig) => ({
  ...(await orig<typeof import('@/features/demo/ui/import/geocode')>()),
  forwardGeocode: forwardGeocodeMock,
}))

import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { EXPLORE_ITEMS } from '@/features/demo/engine/content/explore'
import { runImport as runTextImport, runPdfImport, type ImportRunResult } from '@/features/demo/ui/import/run-import'
import { importLogBus, type ImportLogLevel } from '@/features/demo/engine/logic/import-log'

const runText = vi.mocked(runTextImport)
const runPdf = vi.mocked(runPdfImport)

const okRun = (over: Partial<Extract<ImportRunResult, { ok: true }>> = {}): ImportRunResult => ({
  ok: true,
  patch: { requesterName: '', requesterBadgeNumber: '', requesterPhone: '', requesterEmail: '', businessName: "Kim's Convenience", streetAddress: '', city: '', locationContact: '', locationPhone: '', _import: { offenceType: '', dvrTypeBrand: 'Hikvision', totalDvrRetention: '', hasVideoMonitor: '', dvrUsername: '', dvrPassword: '', timeFrames: [] } },
  warnings: [],
  fieldCount: 2,
  timeFrameCount: 0,
  fallbackMode: 'none',
  filename: 'request.pdf',
  ...over,
})

type Store = ReturnType<typeof createDemoStore>

beforeEach(() => {
  runText.mockReset()
  runPdf.mockReset()
})

function setupLocation(store: Store) {
  act(() => {
    const caseId = store.getState().createCase({ caseNumber: 'PR25-TEST', displayName: 'Test Case', unit: 'Robbery' })
    const locId = store.getState().addLocation(caseId, { locationName: 'Test Location' })
    store.getState().switchLocation(locId)
  })
}

function currentLoc(store: Store) {
  const s = store.getState()
  return s.locations.find((l) => l.id === s.currentLocationId)
}

/**
 * P1.5 dwell (row 73): a finished run holds on the terminal's outcome CTA — the result
 * view renders only after tapping it. Every result-view assertion below now goes through
 * this release first (the pre-P1.5 auto-flip is deliberately gone).
 */
async function releaseDwell() {
  fireEvent.click(await screen.findByTestId('terminal-review-cta'))
}

// Generous suite timeout (R-6): full-experience renders are heavy under jsdom and this file
// runs alongside sibling suites under CPU contention (observed 5.8s on a loaded runner) —
// not a loop; isolation runs finish well inside the default.
describe('DemoExperience — sandbox bridge paths', { timeout: 20000 }, () => {
  it('marquee: Capture from DVR → Use sample → confirm yields the real 00:05:30 offset', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().setView('timeOffset'))

    fireEvent.click(screen.getByText('Capture from DVR'))
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    fireEvent.click(screen.getByText('Use this & calculate'))

    expect(currentLoc(store)?.form.timeOffset?.formattedDifference).toBe('00:05:30')
    expect(screen.getByText('00:05:30')).toBeInTheDocument()
  })

  it('completion: editing Completed By persists to form (correct updateField path)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().setView('completion'))
    fireEvent.change(screen.getByLabelText('Completed By'), { target: { value: 'Det. McHugh' } })
    expect(currentLoc(store)?.form.completedBy).toBe('Det. McHugh')
  })

  it('completion: Complete & Save marks the case complete in the STORE (G4) and the arc pays off green', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().setView('completion'))

    fireEvent.click(screen.getByText('Complete & Save'))

    // The status write is real (store, not a local boolean) …
    expect(store.getState().cases[0]?.status).toBe('complete')
    // … the confirmation view keys off the LOCATION's completed flag (R-1) …
    expect(screen.getByText('Location Complete')).toBeInTheDocument()
    // … and the Cases card badge now reads Complete (green), not Draft — exactly one badge
    // while collapsed (R-22: strict, so a row regression can't hide behind the badge) …
    fireEvent.click(screen.getByText('Return to Cases'))
    expect(store.getState().view).toBe('cases')
    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
    // … and expanding the card shows BOTH halves of the payoff: the case badge AND the
    // completed location's truthful row status (the G3/G4 pair this arc test is named for).
    fireEvent.click(screen.getByText('Test Case'))
    expect(screen.getAllByText('Complete')).toHaveLength(2)
  })

  it('R-1: completing location 1 leaves a sibling location on the REVIEW form, not a false confirmation', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    let loc2 = ''
    act(() => {
      loc2 = store.getState().addLocation(store.getState().currentCaseId!, { locationName: 'Second Site' })
      const first = store.getState().locations[0].id
      store.getState().switchLocation(first)
      store.getState().setView('completion')
    })
    fireEvent.click(screen.getByText('Complete & Save'))
    expect(screen.getByText('Location Complete')).toBeInTheDocument()

    // Open the untouched sibling: its Completion must show the review form + PDF button,
    // never "locked and archived" (nothing about it was saved).
    act(() => store.getState().switchLocation(loc2))
    act(() => store.getState().setView('completion'))
    expect(screen.queryByText('Location Complete')).not.toBeInTheDocument()
    expect(screen.getByText('Complete & Save')).toBeInTheDocument()
    expect(screen.getByText('Preview / Export PDF')).toBeInTheDocument()
    expect(store.getState().locations.find((l) => l.id === loc2)?.form.completed).toBe(false)
  })

  it('R-1: the court PDF is never a one-shot — Review / Export again reopens the preview on a completed location', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().setView('completion'))
    fireEvent.click(screen.getByText('Complete & Save'))
    expect(screen.getByText('Location Complete')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Review / Export again'))
    fireEvent.click(screen.getByText('Preview / Export PDF'))
    expect(screen.getByTitle('Case Notes — PDF')).toBeInTheDocument() // the PdfPreview iframe

    // Re-completing returns to the confirmation; the flag never flipped off in between.
    fireEvent.click(screen.getByLabelText('Close preview'))
    fireEvent.click(screen.getByText('Complete & Save'))
    expect(screen.getByText('Location Complete')).toBeInTheDocument()
  })

  it('R-21: Review / Export again is scoped to ITS location — a direct switch cannot suppress a sibling confirmation', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    let l1 = ''
    let l2 = ''
    act(() => {
      const caseId = store.getState().createCase({ caseNumber: 'PR25-TWO', displayName: 'Two Sites', unit: 'Robbery' })
      l1 = store.getState().addLocation(caseId, { locationName: 'Site One' })
      l2 = store.getState().addLocation(caseId, { locationName: 'Site Two' })
      store.getState().switchLocation(l1)
      store.getState().setView('completion')
    })
    fireEvent.click(screen.getByText('Complete & Save')) // L1 completed
    act(() => {
      store.getState().switchLocation(l2)
      store.getState().setView('completion')
    })
    fireEvent.click(screen.getByText('Complete & Save')) // L2 completed
    fireEvent.click(screen.getByText('Review / Export again')) // L2 into review mode
    expect(screen.getByText('Complete & Save')).toBeInTheDocument()
    // Switch to L1 BYPASSING openLocation's reset (raw store action): the review-again flag
    // is keyed to L2, so L1's truthful confirmation must still show.
    act(() => store.getState().switchLocation(l1))
    expect(screen.getByText('Location Complete')).toBeInTheDocument()
  })

  it('R-21: re-opening a completed location through the Cases row restores its confirmation (reset pinned)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().setView('completion'))
    fireEvent.click(screen.getByText('Complete & Save'))
    fireEvent.click(screen.getByText('Review / Export again'))
    expect(screen.getByText('Complete & Save')).toBeInTheDocument() // review mode on
    act(() => store.getState().setView('cases'))
    fireEvent.click(screen.getByText('Test Case')) // expand the card
    // Role-scoped: the exiting completion screen still shows "Test Location" in its summary
    // during the slide transition — the Cases ROW is the only button carrying the name.
    fireEvent.click(screen.getByRole('button', { name: /Test Location/ })) // openLocation — the UI path with the reset
    act(() => store.getState().setView('completion'))
    expect(screen.getByText('Location Complete')).toBeInTheDocument()
  })

  it('R-35: a wizard screen with no open location shows the honest notice — never a dead form', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-NOLOC', displayName: 'No Loc', unit: 'Robbery' })
      store.getState().setView('submission') // rail-jump after New Case: location half is cleared
    })
    // No interactive form whose keystrokes would be silently discarded — the notice instead.
    expect(screen.getByText(/No location open/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Requester Name')).toBeNull()
    fireEvent.click(screen.getByText('Open one from Cases'))
    expect(store.getState().view).toBe('cases')
  })

  it('R-35: Completion is exempt — it keeps its reviewed no-location treatment (disabled CTA + hint)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-NOLOC2', displayName: 'No Loc 2', unit: 'Robbery' })
      store.getState().setView('completion')
    })
    expect(screen.queryByText(/No location open/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Complete & Save' })).toBeDisabled()
  })

  it('R-19 (mandated regression): create A + L1, create B, rail-jump to Completion — the tap can never green the unrelated case', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    let caseA = ''
    let caseB = ''
    act(() => {
      caseA = store.getState().createCase({ caseNumber: 'CASE-A', displayName: 'A', unit: 'Robbery' })
      store.getState().addLocation(caseA, { locationName: 'L1' })
      caseB = store.getState().createCase({ caseNumber: 'CASE-B', displayName: 'B', unit: 'Robbery' })
      store.getState().setView('completion') // rail-jump: no switchLocation on the way
    })
    // createCase(B) cleared the location half of the pair, so Complete & Save is DISABLED —
    // it neither greens B (the old wrong-case bug) nor dead-taps.
    const btn = screen.getByRole('button', { name: 'Complete & Save' })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(store.getState().cases.find((c) => c.id === caseB)?.status).toBe('draft')
    expect(store.getState().cases.find((c) => c.id === caseA)?.status).toBe('draft')
    expect(store.getState().locations[0].form.completed).toBe(false)
  })

  it('R-19: onComplete derives the case from the OPEN LOCATION even if the pair is incoherent', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    let caseA = ''
    let caseB = ''
    let loc1 = ''
    act(() => {
      caseA = store.getState().createCase({ caseNumber: 'CASE-A', displayName: 'A', unit: 'Robbery' })
      loc1 = store.getState().addLocation(caseA, { locationName: 'L1' })
      caseB = store.getState().createCase({ caseNumber: 'CASE-B', displayName: 'B', unit: 'Robbery' })
      // Force the incoherent pair the store actions no longer produce (defense in depth for
      // the bridge derivation): location L1 (case A) open while currentCaseId says B.
      store.setState({ currentLocationId: loc1, currentCaseId: caseB })
      store.getState().setView('completion')
    })
    fireEvent.click(screen.getByText('Complete & Save'))
    // The location's OWN case greens and the location stamps; B is untouched; the
    // confirmation appears (no dead tap, no fake success on an unrelated case).
    expect(store.getState().cases.find((c) => c.id === caseA)?.status).toBe('complete')
    expect(store.getState().cases.find((c) => c.id === caseB)?.status).toBe('draft')
    expect(store.getState().locations.find((l) => l.id === loc1)?.form.completed).toBe(true)
    expect(screen.getByText('Location Complete')).toBeInTheDocument()
  })

  it('import (paste): runs the orchestrator live, applies the patch, reports success', async () => {
    runText.mockResolvedValue(okRun({ filename: undefined }))
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-IMP', displayName: 'Import Case', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByLabelText('Pasted request text'), { target: { value: 'recover footage from Store X' } })
    fireEvent.click(screen.getByText('Import with AI'))

    await releaseDwell()
    expect(await screen.findByText('Import complete')).toBeInTheDocument()
    expect(store.getState().locations.length).toBeGreaterThan(0)
    expect(runText).toHaveBeenCalledWith(expect.objectContaining({ live: true, documentText: 'recover footage from Store X' }))
  })

  it('import: a resolvable address is geocoded so the imported location lands on the map', async () => {
    forwardGeocodeMock.mockResolvedValue({ lng: -79.65, lat: 43.61 })
    const basePatch = (okRun() as Extract<ImportRunResult, { ok: true }>).patch
    runText.mockResolvedValue(
      okRun({ patch: { ...basePatch, businessName: "Kim's Convenience", streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' } }),
    )
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-GEO', displayName: 'Geo', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByLabelText('Pasted request text'), { target: { value: 'recover footage' } })
    fireEvent.click(screen.getByText('Import with AI'))

    await releaseDwell()
    await screen.findByText('Import complete')
    expect(forwardGeocodeMock).toHaveBeenCalledWith('1450 Eglinton Ave W, Mississauga')
    expect(store.getState().locations[0]?.gps).toEqual({ lat: 43.61, lng: -79.65, accuracyM: 0, source: 'geocoded' })
  })

  it('import: an unresolvable address still creates the location (non-blocking, no pin)', async () => {
    forwardGeocodeMock.mockResolvedValue(null) // no match / geocoder error → null
    const basePatch = (okRun() as Extract<ImportRunResult, { ok: true }>).patch
    runText.mockResolvedValue(okRun({ patch: { ...basePatch, streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' } }))
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-NOGEO', displayName: 'NoGeo', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByLabelText('Pasted request text'), { target: { value: 'recover footage' } })
    fireEvent.click(screen.getByText('Import with AI'))

    await releaseDwell()
    await screen.findByText('Import complete')
    expect(store.getState().locations.length).toBe(1)
    expect(store.getState().locations[0]?.gps).toBeUndefined()
  })

  it('import (PDF): a file selection runs the pipeline and creates a location', async () => {
    runPdf.mockResolvedValue(okRun())
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-PDF', displayName: 'PDF Case', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'request.pdf', { type: 'application/pdf' })] } })

    await releaseDwell()
    expect(await screen.findByText('Import complete')).toBeInTheDocument()
    expect(store.getState().locations.length).toBe(1)
    expect(runPdf).toHaveBeenCalledTimes(1)
  })

  it('import (PDF): Open location switches to the imported location and closes the modal (M6)', async () => {
    runPdf.mockResolvedValue(okRun())
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-OPEN', displayName: 'Open Case', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'request.pdf', { type: 'application/pdf' })] } })
    await releaseDwell()
    fireEvent.click(await screen.findByText('Open location'))
    const id = store.getState().locations[0].id
    expect(store.getState().currentLocationId).toBe(id)
    expect(store.getState().view).toBe('submission')
    expect(store.getState().modal).toBeNull()
  })

  it('import (PDF batch): two files create two locations + a batch summary', async () => {
    runPdf.mockResolvedValue(okRun())
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-BAT', displayName: 'Batch Case', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' }), new File(['b'], 'b.pdf', { type: 'application/pdf' })]
    fireEvent.change(input, { target: { files } })

    await releaseDwell()
    expect(await screen.findByText('Import complete')).toBeInTheDocument()
    expect(store.getState().locations.length).toBe(2)
    expect(runPdf).toHaveBeenCalledTimes(2)
  })

  it('import (PDF) failure: no location created, error shown', async () => {
    runPdf.mockResolvedValue({ ok: false, warnings: [], fallbackMode: 'none', error: 'This PDF looks scanned.', filename: 'scan.pdf', code: 'PDF_SCANNED', details: { stage: 'extracting_text', detail: 'This PDF looks scanned.' } })
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-FAIL', displayName: 'Fail Case', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'scan.pdf', { type: 'application/pdf' })] } })

    await releaseDwell()
    expect(await screen.findByText(/This PDF looks scanned/)).toBeInTheDocument()
    expect(store.getState().locations.length).toBe(0)
  })

  it('imports always run live — the model does the import step (sandbox-only demo)', async () => {
    runText.mockResolvedValue(okRun())
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-L', displayName: 'Live', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'video request text' } })
    fireEvent.click(screen.getByText('Import with AI'))

    await releaseDwell()
    expect(await screen.findByText('Import complete')).toBeInTheDocument()
    expect(runText).toHaveBeenCalledWith(expect.objectContaining({ live: true }))
  })

  it('cancelling mid-import does not create a location (H2)', async () => {
    let resolveRun: (r: ImportRunResult) => void = () => {}
    runPdf.mockReturnValue(new Promise<ImportRunResult>((res) => { resolveRun = res }))
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-CXL', displayName: 'Cancel', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Close' })) // cancel while the import is in flight
    await act(async () => {
      resolveRun(okRun())
      await Promise.resolve()
    })
    expect(store.getState().locations.length).toBe(0)
  })

  it('Back to site with unseen items opens the before-you-go dialog instead of navigating', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByRole('link', { name: /back to site/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/before you go/i)).toBeInTheDocument()
    // “Keep exploring” closes it and the demo is untouched
    fireEvent.click(screen.getByRole('button', { name: 'Keep exploring' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(store.getState().view).toBe('cases')
  })

  it('Back to site with everything visited navigates directly (no dialog)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      // Visit every covered id in the registry (only 'import' is a modal in v1).
      for (const item of EXPLORE_ITEMS) {
        for (const id of item.covers) {
          if (id === 'import') store.getState().openModal(id)
          else store.getState().setView(id as Exclude<typeof id, 'import' | 'newCase' | 'newLocation' | 'mediaLibrary'>)
        }
      }
      store.getState().closeModal()
    })
    // Swallow jsdom's unimplemented navigation for the real link click.
    document.addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true })
    fireEvent.click(screen.getByRole('link', { name: /back to site/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('the exploration manifest lights rows as screens are visited and jumps on click', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    // Boot: the Cases row is lit (you start there), Dashboard is not.
    expect(screen.getByRole('button', { name: 'Cases, visited' })).toBeInTheDocument()
    // Clicking an unlit row navigates the phone and lights it.
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard, not visited yet' }))
    expect(store.getState().view).toBe('dashboard')
    expect(screen.getByRole('button', { name: 'Dashboard, visited' })).toBeInTheDocument()
  })

  it('reverts the active manifest row when a modal closes (anchor↔narration parity, H1)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => { store.getState().openModal('import') })
    // While the import modal is open, the Import Location row owns the active marker.
    expect(screen.getByRole('button', { name: /Import Location/ })).toHaveAttribute('data-explore-active')
    act(() => { store.getState().closeModal() })
    // On close it must revert to the underlying Cases row — not stay stale on Import Location
    // (the memo that feeds the manifest must recompute when `modal` changes).
    expect(screen.getByRole('button', { name: /Import Location/ })).not.toHaveAttribute('data-explore-active')
    expect(screen.getByRole('button', { name: 'Cases, visited' })).toHaveAttribute('data-explore-active')
  })

  it('a sample-substituted run always renders a notice (review M2: exhaustive fallback copy)', async () => {
    runText.mockResolvedValue(okRun({ fallbackMode: 'sample' }))
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-S', displayName: 'Sample', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'request text' } })
    fireEvent.click(screen.getByText('Import with AI'))
    await releaseDwell()
    expect(await screen.findByText('Import complete')).toBeInTheDocument()
    expect(screen.getByText(/imported the sample request/i)).toBeInTheDocument()
  })

  it('in a batch, only the fallback-derived card carries the Sample data badge (review M1)', async () => {
    runPdf
      .mockResolvedValueOnce(okRun({ filename: 'real.pdf' }))
      .mockResolvedValueOnce(okRun({ fallbackMode: 'error', filename: 'fell-back.pdf' }))
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-B', displayName: 'Batch', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['a'], 'real.pdf', { type: 'application/pdf' }), new File(['b'], 'fell-back.pdf', { type: 'application/pdf' })] },
    })
    await releaseDwell()
    expect(await screen.findByText('Import complete')).toBeInTheDocument()
    expect(screen.getByText(/couldn.t reach the live model/i)).toBeInTheDocument() // aggregate notice
    expect(screen.getAllByText('Sample data')).toHaveLength(1) // …and the specific card is badged
  })

  it('a cancelled import cannot resurface after a newer run starts (H1: per-run token)', async () => {
    let resolveA: (r: ImportRunResult) => void = () => {}
    let resolveB: (r: ImportRunResult) => void = () => {}
    runPdf
      .mockReturnValueOnce(new Promise<ImportRunResult>((res) => { resolveA = res }))
      .mockReturnValueOnce(new Promise<ImportRunResult>((res) => { resolveB = res }))
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-RACE', displayName: 'Race', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = () => container.querySelector('input[type="file"]') as HTMLInputElement
    // Run A starts and is cancelled while its request is still in flight…
    fireEvent.change(input(), { target: { files: [new File(['x'], 'stale.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    // …then run B starts. Starting B must NOT revive cancelled run A (a shared
    // cancel boolean would be cleared here — the exact H1 race).
    act(() => {
      store.getState().openModal('import')
    })
    fireEvent.change(input(), { target: { files: [new File(['y'], 'live.pdf', { type: 'application/pdf' })] } })

    // Stale run A resolves AFTER B began: it must be discarded, not written to the store.
    await act(async () => {
      resolveA(okRun({ filename: 'stale.pdf' }))
    })
    expect(store.getState().locations.length).toBe(0) // no phantom location from A

    // Run B completes normally and is the only import that lands.
    await act(async () => {
      resolveB(okRun({ filename: 'live.pdf' }))
    })
    expect(store.getState().locations.length).toBe(1)
    await releaseDwell()
    expect(await screen.findByText('Import complete')).toBeInTheDocument()
  })

  it('a cancel landing during the geocode round-trip still discards the run (review H2)', async () => {
    // The patch must carry an address: buildGeocodeQuery is then non-null and applySuccess
    // genuinely awaits forwardGeocode — the window the H1 loop checkpoints cannot see.
    const ok = okRun({ filename: 'addr.pdf' }) as Extract<ImportRunResult, { ok: true }>
    runPdf.mockResolvedValue({ ...ok, patch: { ...ok.patch, streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' } })
    let resolveGeo: (v: { lng: number; lat: number } | null) => void = () => {}
    forwardGeocodeMock.mockReturnValue(new Promise((res) => { resolveGeo = res }))

    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-GEO', displayName: 'Geo', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'addr.pdf', { type: 'application/pdf' })] } })
    await act(async () => {}) // flush to inside the geocode await
    fireEvent.click(screen.getByRole('button', { name: 'Close' })) // cancel mid-geocode

    await act(async () => {
      resolveGeo({ lng: -79.6505, lat: 43.6087 })
    })
    expect(store.getState().locations.length).toBe(0) // the cancelled run must not write
  })

  it('empty paste: submit is disabled (phone parity) — no model call, no location (M2)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-E', displayName: 'Empty', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste Text')) // → blank textarea
    // P1.2: the phone disables "Import with AI" until non-whitespace text exists
    // (ImportPickerModal.tsx:740); the store-level guard remains as a backstop.
    const submit = screen.getByText('Import with AI').closest('button')!
    expect(submit).toBeDisabled()
    fireEvent.click(submit) // a click on the disabled control must be inert
    expect(store.getState().locations.length).toBe(0)
    expect(runText).not.toHaveBeenCalled()
  })

  it('a live failure still imports the sample but shows the distinct "couldn’t reach" notice (M1)', async () => {
    runPdf.mockResolvedValue(okRun({ fallbackMode: 'error' }))
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-ERR', displayName: 'Err', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } })
    await releaseDwell()
    expect(await screen.findByText(/couldn.t reach the live model/i)).toBeInTheDocument()
    expect(store.getState().locations.length).toBe(1)
  })

  it('a keyless fallback shows the distinct "not configured" notice (M1)', async () => {
    runPdf.mockResolvedValue(okRun({ fallbackMode: 'unavailable' }))
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-UNC', displayName: 'Unc', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } })
    await releaseDwell()
    expect(await screen.findByText(/not configured/i)).toBeInTheDocument()
  })

  it('import with no case shows "Select a case first." (I4)', async () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => store.getState().openModal('import')) // no case
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByLabelText('Pasted request text'), { target: { value: 'something' } })
    fireEvent.click(screen.getByText('Import with AI'))
    // Pre-pipeline guard: no run, no log, nothing to dwell on — the error shows directly
    // (the stored-'result' passthrough in computeImportStage).
    expect(await screen.findByText('Select a case first.')).toBeInTheDocument()
    expect(runText).not.toHaveBeenCalled()
  })

  // ---- p1-review R-11 / R-24: stage forwarding under batching + cancellation ----

  it('a normalize failure freezes the bar at 55% even though the batched "normalizing" commit never rendered (R-11)', async () => {
    // All three onStage calls land in ONE promise continuation — React batches them with
    // the failure result, so 'normalizing' never renders; only the bridge-tracked
    // lastRealStage (written in the functional updater) can see it.
    runText.mockImplementation(async (input) => {
      input.onStage?.('reading_model')
      input.onStage?.('normalizing')
      input.onStage?.('error')
      return { ok: false, error: 'No JSON object found in AI response', code: 'MODEL_OUTPUT_UNPARSEABLE', details: { stage: 'normalizing', detail: 'No JSON object found in AI response' }, warnings: [], fallbackMode: 'none' }
    })
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-FRZ', displayName: 'Freeze', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByLabelText('Pasted request text'), { target: { value: 'garbage' } })
    fireEvent.click(screen.getByText('Import with AI'))
    await screen.findByTestId('terminal-review-cta') // failure dwell
    expect(screen.getByTestId('terminal-progress-fill').style.width).toBe('55%') // frozen at normalizing, not 15%
  })

  it("a cancelled run's late onStage cannot drive a newer run's terminal (R-24: the one un-tokened callback)", async () => {
    type OnStage = (s: 'extracting_text' | 'reading_model' | 'normalizing' | 'done' | 'error') => void
    let stageA: OnStage | undefined
    let resolveA: (r: ImportRunResult) => void = () => {}
    runPdf
      .mockImplementationOnce((_file, input) => {
        stageA = input.onStage
        return new Promise<ImportRunResult>((res) => { resolveA = res })
      })
      .mockImplementationOnce(() => new Promise<ImportRunResult>(() => {})) // run B stays in flight
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-STG', displayName: 'Stage', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = () => container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input(), { target: { files: [new File(['x'], 'stale.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Close' })) // cancel run A mid-flight
    act(() => { store.getState().openModal('import') })
    fireEvent.change(input(), { target: { files: [new File(['y'], 'live.pdf', { type: 'application/pdf' })] } })
    expect(screen.getByTestId('terminal-status')).toHaveTextContent('Extracting text from PDF...')
    // Run A's late stage callbacks fire AFTER B started — they must not move B's terminal.
    await act(async () => {
      stageA?.('normalizing')
      stageA?.('done')
      resolveA(okRun({ filename: 'stale.pdf' }))
    })
    expect(screen.getByTestId('terminal-status')).toHaveTextContent('Extracting text from PDF...')
    expect(screen.getByTestId('terminal-progress-fill').style.width).toBe('0%')
  })

  it('E2E partial batch: the amber "Batch partially failed" path through the real bridge (R-6)', async () => {
    // One ok + one failed file, driven through processPdfFiles/finishImport/
    // deriveTerminalOutcome for real — the only seam where a tally bug could turn a
    // dropped-evidence run into a clean-success lie with every unit test green.
    runPdf
      .mockResolvedValueOnce(okRun({ filename: 'good.pdf' }))
      .mockResolvedValueOnce({ ok: false, warnings: [], fallbackMode: 'none', error: 'This PDF looks scanned.', filename: 'scan.pdf', code: 'PDF_SCANNED', details: { stage: 'extracting_text', detail: 'no selectable text' } })
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-PART', displayName: 'Partial', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['a'], 'good.pdf', { type: 'application/pdf' }), new File(['b'], 'scan.pdf', { type: 'application/pdf' })] } })

    // The dwell CTA is the amber partial — counts in the VISIBLE accname (R-3), never green.
    const cta = await screen.findByRole('button', { name: /Batch partially failed — 1 of 2, 1 needs attention/ })
    expect(cta).toHaveTextContent('Review import →')
    expect(cta.style.border).toContain('rgba(255, 217, 61, 0.36)') // amber, not success green
    expect(cta.style.border).not.toContain('rgba(16, 209, 119')

    fireEvent.click(cta)
    expect(await screen.findByText(/Imported 1 of 2 requests/)).toBeInTheDocument()
    expect(screen.getByText(/scan\.pdf/)).toBeInTheDocument() // the failed file is named
    expect(store.getState().locations.length).toBe(1)
  })

  it('a mid-batch THROW cannot deny the files that already landed (R-38): partial report, not a total-failure lie', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      runPdf
        .mockResolvedValueOnce(okRun({ filename: 'good.pdf' }))
        .mockRejectedValueOnce(new Error('boom mid-batch')) // file 2 THROWS (not a failure result)
      const store = createDemoStore()
      const { container } = render(<DemoExperience store={store} />)
      act(() => {
        store.getState().createCase({ caseNumber: 'PR25-PBT', displayName: 'PartialThrow', unit: 'Robbery' })
        store.getState().openModal('import')
      })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [new File(['a'], 'good.pdf', { type: 'application/pdf' }), new File(['b'], 'bad.pdf', { type: 'application/pdf' })] } })

      // The catch reports through the tally: amber partial, never 'The import failed unexpectedly' alone.
      const cta = await screen.findByRole('button', { name: /Batch partially failed — 1 of 2, 1 needs attention/ })
      fireEvent.click(cta)
      expect(await screen.findByText(/Imported 1 of 2 requests/)).toBeInTheDocument() // landed file reported
      expect(screen.getByText(/The import failed unexpectedly/)).toBeInTheDocument() // synthetic failure row
      expect(store.getState().locations.length).toBe(1) // exactly the landed file — visible, not denied
      expect(errSpy).toHaveBeenCalledWith('[demo/import] import run threw unexpectedly', expect.any(Error))
    } finally {
      errSpy.mockRestore()
    }
  })

  it('an unexpected pipeline THROW cannot hang the dwell: failure result + breadcrumb (R-23b)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      // Advance a real stage before throwing (R-49): the backstop's reported stage must be
      // the one the run actually reached, which is carried ONLY by the lastRealStageRef
      // forwarder write in importStageFor. Deleting that write leaves tsc and the rest of
      // the suite green while Technical Details silently reverts to the coarse entry seed —
      // exactly the wrong-but-plausible diagnostic R-40 exists to prevent.
      runPdf.mockImplementation(async (_file, input) => {
        input.onStage?.('normalizing')
        throw new Error('boom from the pipeline') // a throw, not a failure result
      })
      const store = createDemoStore()
      const { container } = render(<DemoExperience store={store} />)
      act(() => {
        store.getState().createCase({ caseNumber: 'PR25-THROW', displayName: 'Throw', unit: 'Robbery' })
        store.getState().openModal('import')
      })
      const input = container.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } })
      // Pre-fix this spun forever (finishImport was the only result writer). Now: failure dwell…
      const cta = await screen.findByRole('button', { name: /See error details/ })
      fireEvent.click(cta)
      // …and the released card carries the friendly copy + the raw throw in Technical Details.
      expect(await screen.findByText('The import failed unexpectedly. Please try again.')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Technical Details' }))
      const details = screen.getByTestId('import-technical-details')
      expect(details).toHaveTextContent('boom from the pipeline')
      expect(details).toHaveTextContent('"stage": "normalizing"') // the stage reached, not the entry seed
      expect(details).not.toHaveTextContent('"stage": "extracting_text"')
      expect(errSpy).toHaveBeenCalledWith('[demo/import] import run threw unexpectedly', expect.any(Error))
      expect(store.getState().locations.length).toBe(0)
    } finally {
      errSpy.mockRestore()
    }
  })

  it('the throw backstop guards the TEXT path too (R-43): a rejecting runImport cannot hang the paste dwell', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      runText.mockRejectedValue(new Error('boom from the text pipeline')) // a throw, not a failure result
      const store = createDemoStore()
      render(<DemoExperience store={store} />)
      act(() => {
        store.getState().createCase({ caseNumber: 'PR25-TXT', displayName: 'TextThrow', unit: 'Robbery' })
        store.getState().openModal('import')
      })
      fireEvent.click(screen.getByText('Paste Text'))
      fireEvent.change(screen.getByLabelText('Pasted request text'), { target: { value: 'recover footage' } })
      fireEvent.click(screen.getByText('Import with AI'))
      // Unwrapping runTextImportFlow re-opens the forever-spinning dwell — this pins the wrap.
      const cta = await screen.findByRole('button', { name: /See error details/ })
      fireEvent.click(cta)
      expect(await screen.findByText('The import failed unexpectedly. Please try again.')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Technical Details' }))
      const details = screen.getByTestId('import-technical-details')
      expect(details).toHaveTextContent('boom from the text pipeline')
      // The paste flow seeds the mirror to 'reading_model' BEFORE calling runImport, so this
      // path pins the seed write, not the `?? 'extracting_text'` default (which the pre-seed
      // R-45 test above owns) — the p1-r2 doc's R-49 note has these two the other way round.
      expect(details).toHaveTextContent('"stage": "reading_model"')
      expect(errSpy).toHaveBeenCalledWith('[demo/import] import run threw unexpectedly', expect.any(Error))
      expect(store.getState().locations.length).toBe(0)
    } finally {
      errSpy.mockRestore()
    }
  })

  it('a pre-seed throw reports the honest default stage, never the PREVIOUS run’s (R-45: the mirror is cleared at the token bump)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const realBeginRun = importLogBus.beginRun
    const beginRun = vi.spyOn(importLogBus, 'beginRun')
    try {
      // Run 1 reaches 'normalizing' and fails there — the bridge's stage mirror now holds it.
      runPdf.mockImplementationOnce(async (_file, input) => {
        input.onStage?.('normalizing')
        return { ok: false, warnings: [], fallbackMode: 'none', error: 'This PDF looks scanned.', filename: 'first.pdf', code: 'PDF_SCANNED', details: { stage: 'normalizing', detail: 'no selectable text' } }
      })
      const store = createDemoStore()
      const { container } = render(<DemoExperience store={store} />)
      act(() => {
        store.getState().createCase({ caseNumber: 'PR25-STALE', displayName: 'StaleStage', unit: 'Robbery' })
        store.getState().openModal('import')
      })
      const input = () => container.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(input(), { target: { files: [new File(['a'], 'first.pdf', { type: 'application/pdf' })] } })
      fireEvent.click(await screen.findByRole('button', { name: /See error details/ }))
      // Back to the picker through Retry, NOT Close: onRetry takes no token and clears no
      // ref, so only run 2's own token bump can drop run 1's stage. (Close would satisfy this
      // test through the belt-and-braces clear and hide a missing token-bump clear.)
      fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))

      // Run 2 throws on the guarded closure's FIRST statement — the pre-seed window R-45
      // names, and the only throwable in it. The emitter is the run's collaborator; the
      // backstop's whole premise is "if a callee ever does throw".
      beginRun.mockImplementationOnce((now: () => number) => {
        const emitter = realBeginRun(now)
        return {
          ...emitter,
          log: (level: ImportLogLevel, text: string, detail?: string) => {
            if (level === 'INIT') throw new Error('pre-seed boom')
            emitter.log(level, text, detail)
          },
        }
      })
      fireEvent.change(input(), { target: { files: [new File(['b'], 'second.pdf', { type: 'application/pdf' })] } })
      fireEvent.click(await screen.findByRole('button', { name: /See error details/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Technical Details' }))

      const block = screen.getByTestId('import-technical-details')
      expect(block).toHaveTextContent('"stage": "extracting_text"') // the honest default
      expect(block).not.toHaveTextContent('"stage": "normalizing"') // run 1's stage — a lie about run 2
      expect(errSpy).toHaveBeenCalledWith('[demo/import] import run threw unexpectedly', expect.any(Error))
    } finally {
      beginRun.mockRestore()
      errSpy.mockRestore()
    }
  })

  // ---- P1.5 the dwell (row 73) ----

  it('DWELL: a successful run holds on the terminal — results render ONLY after "Review import →"', async () => {
    runText.mockResolvedValue(okRun({ filename: undefined }))
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-DW', displayName: 'Dwell', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByLabelText('Pasted request text'), { target: { value: 'recover footage' } })
    fireEvent.click(screen.getByText('Import with AI'))

    // The run finished (the CTA proves the outcome landed) yet the result view is HELD back.
    const cta = await screen.findByTestId('terminal-review-cta')
    expect(cta).toHaveTextContent('Import ready for review')
    expect(cta).toHaveTextContent('Review import →') // phone :247
    expect(screen.queryByText('Import complete')).not.toBeInTheDocument()
    expect(screen.getByTestId('import-terminal')).toBeInTheDocument()
    // The location itself already exists — the dwell gates the VIEW, not the write.
    expect(store.getState().locations.length).toBe(1)

    fireEvent.click(cta)
    expect(await screen.findByText('Import complete')).toBeInTheDocument()
    expect(screen.queryByTestId('import-terminal')).not.toBeInTheDocument()
  })

  it('DWELL: a failed run dwells on the log too — CTA reads "See error details →" (phone :273)', async () => {
    runText.mockResolvedValue({ ok: false, warnings: [], fallbackMode: 'none', error: 'No JSON object found in AI response', code: 'MODEL_OUTPUT_UNPARSEABLE', details: { stage: 'normalizing', detail: 'No JSON object found in AI response' } })
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-DWF', displayName: 'DwellFail', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByLabelText('Pasted request text'), { target: { value: 'garbage in' } })
    fireEvent.click(screen.getByText('Import with AI'))

    // "The log is most valuable when something broke" — terminal held, red CTA.
    const cta = await screen.findByRole('button', { name: /See error details/ }) // visible text IS the name (R-3)
    expect(cta).toHaveTextContent('Import failed')
    expect(cta).toHaveTextContent('See error details →')
    expect(screen.queryByText('Try again')).not.toBeInTheDocument() // failure card not shown yet

    fireEvent.click(cta)
    // Released: the enriched failure card (friendly copy + Technical Details).
    expect(await screen.findByText("The model's reply couldn't be read as form data. Please try the import again.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Technical Details' }))
    expect(screen.getByTestId('import-technical-details')).toHaveTextContent('No JSON object found in AI response')
  })

  it('DWELL: cancel during the dwell resets cleanly — bus reset, fresh picker on reopen, data kept', async () => {
    runText.mockResolvedValue(okRun({ filename: undefined }))
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-DWC', displayName: 'DwellCancel', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste Text'))
    fireEvent.change(screen.getByLabelText('Pasted request text'), { target: { value: 'recover footage' } })
    fireEvent.click(screen.getByText('Import with AI'))
    await screen.findByTestId('terminal-review-cta') // dwelling

    const epochDuringDwell = importLogBus.getEpoch()
    fireEvent.click(screen.getByRole('button', { name: 'Close' })) // close mid-dwell
    expect(store.getState().modal).toBeNull()
    expect(importLogBus.getEpoch()).toBe(epochDuringDwell + 1) // bus reset — no stale log
    expect(importLogBus.getLines()).toEqual([])
    expect(store.getState().locations.length).toBe(1) // the applied import survives the close

    act(() => store.getState().openModal('import'))
    // blankImport: back at the picker, no leftover result/acknowledged state.
    expect(screen.getByText('Pick File')).toBeInTheDocument()
    expect(screen.queryByTestId('terminal-review-cta')).not.toBeInTheDocument()
    expect(screen.queryByText('Import complete')).not.toBeInTheDocument()
  })

  it('completion: Preview / Export PDF mounts the real generated court document', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().setView('completion'))

    fireEvent.click(screen.getByText('Preview / Export PDF'))

    expect(screen.getByTitle('Case Notes — PDF')).toBeInTheDocument()
  })

  it('completion: Escape dismisses the PDF preview and focus returns to the opener button (deferred §21)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().setView('completion'))

    const opener = screen.getByText('Preview / Export PDF')
    opener.focus() // jsdom does not focus on click — make the opener the focused element, as a real tap/tab would
    fireEvent.click(opener)
    expect(screen.getByTitle('Case Notes — PDF')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTitle('Case Notes — PDF')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(opener)
  })

  it('completion: Save as PDF prints the framed court document (real print path, store-driven)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().setView('completion'))

    fireEvent.click(screen.getByText('Preview / Export PDF'))
    const frame = screen.getByTitle('Case Notes — PDF') as HTMLIFrameElement
    const print = vi.fn()
    ;(frame.contentWindow as Window & { print: () => void }).print = print

    fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
    expect(print).toHaveBeenCalledTimes(1)
    // The preview stays up — printing is not a dismissal.
    expect(screen.getByTitle('Case Notes — PDF')).toBeInTheDocument()
  })

  it('completion: Preview Time-Offset Calibration mounts the distinct time-offset document', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => {
      const st = store.getState()
      st.updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
      st.updateField('capture.actualDateTime', '2025-03-08 12:00:00')
      st.calculateOffset()
      st.setView('completion')
    })

    fireEvent.click(screen.getByText('Preview Time-Offset Calibration'))

    expect(screen.getByTitle('Time-Offset Calibration')).toBeInTheDocument()
  })

  it('New Case modal: fill + Create Case adds the case and closes the modal', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => store.getState().openModal('newCase'))

    fireEvent.change(screen.getByLabelText('Case Number'), { target: { value: 'PR25-NEW' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'Robbery' } })
    fireEvent.click(screen.getByText('Create Case'))

    expect(store.getState().cases.some((c) => c.caseNumber === 'PR25-NEW')).toBe(true)
    expect(store.getState().modal).toBeNull()
  })

  it('New Case modal: hand-typed coordinates persist as incidentCoordinates with source manual', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => store.getState().openModal('newCase'))

    fireEvent.change(screen.getByLabelText('Case Number'), { target: { value: 'PR25-COORD' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'Robbery' } })
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '43.6087' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-79.6505' } })
    fireEvent.click(screen.getByText('Create Case'))

    const c = store.getState().cases.find((x) => x.caseNumber === 'PR25-COORD')
    expect(c?.incidentCoordinates).toEqual({ lat: 43.6087, lng: -79.6505, source: 'manual' })
  })

  it('New Case modal: an invalid latitude yields no incidentCoordinates (case still created)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => store.getState().openModal('newCase'))

    fireEvent.change(screen.getByLabelText('Case Number'), { target: { value: 'PR25-BADCOORD' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'Robbery' } })
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '999' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-79.6505' } })
    fireEvent.click(screen.getByText('Create Case'))

    const c = store.getState().cases.find((x) => x.caseNumber === 'PR25-BADCOORD')
    expect(c).toBeDefined()
    expect(c?.incidentCoordinates).toBeUndefined()
  })

  it('New Location modal: fill + Create Location adds the location and closes the modal', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-LOC', displayName: 'X', unit: 'Robbery' })
      store.getState().openModal('newLocation')
    })

    fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: 'Rear Door' } })
    fireEvent.click(screen.getByText('Create Location'))

    expect(store.getState().locations.some((l) => l.locationName === 'Rear Door')).toBe(true)
    expect(store.getState().modal).toBeNull()
  })

  it('retention bridge: setting firstRecordedDate writes a derived totalDvrRetention for the PDF', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().updateField('form.dvr.firstRecordedDate', '2025-03-01 00:00:00'))
    expect(currentLoc(store)?.form.dvr.totalDvrRetention).toMatch(/^\d+ days$/)
  })

  it('retention bridge: clearing firstRecordedDate clears the derived totalDvrRetention', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().updateField('form.dvr.firstRecordedDate', '2025-03-01 00:00:00'))
    expect(currentLoc(store)?.form.dvr.totalDvrRetention).toMatch(/^\d+ days$/)
    act(() => store.getState().updateField('form.dvr.firstRecordedDate', ''))
    expect(currentLoc(store)?.form.dvr.totalDvrRetention).toBe('')
  })

  it('retention bridge: keeps an import-provided totalDvrRetention when firstRecordedDate is empty', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().updateField('form.dvr.totalDvrRetention', '30 days'))
    expect(currentLoc(store)?.form.dvr.totalDvrRetention).toBe('30 days')
  })
})

describe('DemoExperience — Use Current Time (device sync)', { timeout: 20000 }, () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('stamps only the real time + records the sync, leaving the DVR time untouched', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => {
      store.getState().setView('timeOffset')
      store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:06:00')
    })

    fireEvent.click(screen.getByText('Use Current Time'))
    act(() => {
      vi.advanceTimersByTime(1200)
    })

    const cap = store.getState().capture
    expect(cap.dvrDateTime).toBe('2025-03-08 12:06:00') // untouched — the dual-write bug fix
    expect(cap.actualDateTime).not.toBe('')
    expect(cap.actualDateTime).not.toBe('2025-03-08 12:06:00') // not copied from the DVR field
    expect(cap.sync?.method).toBe('NTP')
    expect(cap.sync?.server).toBe('time.nrc.ca')
  })
})
