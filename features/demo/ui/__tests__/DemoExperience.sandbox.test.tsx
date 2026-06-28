import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

// Drive the *interactive sandbox* surface end-to-end (the bridge's most-grown, least-covered code):
// the marquee OCR→offset path, the import pipeline, and the PDF-preview mount.
const { searchParams } = vi.hoisted(() => ({
  searchParams: { get: vi.fn<(k: string) => string | null>(() => null) },
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }))

import { DemoExperience } from '@/features/demo/ui/DemoExperience'

type Store = ReturnType<typeof createDemoStore>

beforeEach(() => {
  searchParams.get.mockReset()
  searchParams.get.mockImplementation((k) => (k === 'mode' ? 'sandbox' : null))
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

  it('import: paste → Extract & import creates a location and reports the result', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-IMP', displayName: 'Import Case', unit: 'Robbery' })
      store.getState().openModal('import')
    })

    fireEvent.click(screen.getByText('Paste text'))
    fireEvent.click(screen.getByText('Extract & import'))

    expect(screen.getByText('Location created')).toBeInTheDocument()
    expect(store.getState().locations.length).toBeGreaterThan(0)
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
