import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

// Drive the *interactive sandbox* surface end-to-end (the bridge's most-grown, least-covered code):
// the marquee OCR→offset path, the import pipeline, and the PDF-preview mount.
const { searchParams } = vi.hoisted(() => ({
  searchParams: { get: vi.fn<(k: string) => string | null>(() => null) },
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }))

// The import orchestrator (pdf.js + the model proxy) is mocked — no network, no real PDF.
vi.mock('@/features/demo/ui/import/run-import', () => ({ runImport: vi.fn(), runPdfImport: vi.fn() }))

import { DemoExperience } from '@/features/demo/ui/DemoExperience'
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
  searchParams.get.mockReset()
  searchParams.get.mockImplementation((k) => (k === 'mode' ? 'sandbox' : null))
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

    expect(await screen.findByText('Location created')).toBeInTheDocument()
    expect(store.getState().locations.length).toBeGreaterThan(0)
    expect(runText).toHaveBeenCalledWith(expect.objectContaining({ live: true, documentText: 'recover footage from Store X' }))
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

    expect(await screen.findByText('Location created')).toBeInTheDocument()
    expect(store.getState().locations.length).toBe(1)
    expect(runPdf).toHaveBeenCalledTimes(1)
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

  it('guided mode imports deterministically (live=false)', async () => {
    searchParams.get.mockImplementation(() => null) // guided (no ?mode)
    runText.mockResolvedValue(okRun({ fallbackMode: 'guided' }))
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-G', displayName: 'Guided', unit: 'Robbery' })
      store.getState().openModal('import')
    })
    fireEvent.click(screen.getByText('Paste text'))
    fireEvent.click(screen.getByText('Extract & import'))

    expect(await screen.findByText('Location created')).toBeInTheDocument()
    expect(runText).toHaveBeenCalledWith(expect.objectContaining({ live: false }))
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
