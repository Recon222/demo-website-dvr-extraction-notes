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

describe('DemoExperience — sandbox bridge paths', () => {
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

  it('import (paste): runs the orchestrator live, applies the patch, reports success', async () => {
    runText.mockResolvedValue(okRun({ filename: undefined }))
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-IMP', displayName: 'Import Case', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste text'))
    fireEvent.change(screen.getByLabelText('Request text'), { target: { value: 'recover footage from Store X' } })
    fireEvent.click(screen.getByText('Extract & import'))

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
    fireEvent.click(screen.getByText('Paste text'))
    fireEvent.change(screen.getByLabelText('Request text'), { target: { value: 'recover footage' } })
    fireEvent.click(screen.getByText('Extract & import'))

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
    fireEvent.click(screen.getByText('Paste text'))
    fireEvent.change(screen.getByLabelText('Request text'), { target: { value: 'recover footage' } })
    fireEvent.click(screen.getByText('Extract & import'))

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

    expect(await screen.findByText('Import complete')).toBeInTheDocument()
    expect(store.getState().locations.length).toBe(2)
    expect(runPdf).toHaveBeenCalledTimes(2)
  })

  it('import (PDF) failure: no location created, error shown', async () => {
    runPdf.mockResolvedValue({ ok: false, warnings: [], fallbackMode: 'none', error: 'This PDF looks scanned.', filename: 'scan.pdf' })
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-FAIL', displayName: 'Fail Case', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'scan.pdf', { type: 'application/pdf' })] } })

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
    fireEvent.click(screen.getByText('Paste text'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'video request text' } })
    fireEvent.click(screen.getByText('Extract & import'))

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
    fireEvent.click(screen.getByText('Paste text'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'request text' } })
    fireEvent.click(screen.getByText('Extract & import'))
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

  it('empty paste (sandbox) shows a guard message — no model call, no location (M2)', async () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-E', displayName: 'Empty', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste text')) // sandbox → blank textarea
    fireEvent.click(screen.getByText('Extract & import'))
    expect(await screen.findByText('Paste the request text first.')).toBeInTheDocument()
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
    expect(await screen.findByText(/not configured/i)).toBeInTheDocument()
  })

  it('import with no case shows "Select a case first." (I4)', async () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => store.getState().openModal('import')) // no case
    fireEvent.click(screen.getByText('Paste text'))
    fireEvent.change(screen.getByLabelText('Request text'), { target: { value: 'something' } })
    fireEvent.click(screen.getByText('Extract & import'))
    expect(await screen.findByText('Select a case first.')).toBeInTheDocument()
    expect(runText).not.toHaveBeenCalled()
  })

  it('completion: Preview / Export PDF mounts the real generated court document', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupLocation(store)
    act(() => store.getState().setView('completion'))

    fireEvent.click(screen.getByText('Preview / Export PDF'))

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

describe('DemoExperience — Use Current Time (device sync)', () => {
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
