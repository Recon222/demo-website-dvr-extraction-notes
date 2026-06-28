import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore } from '@/lib/demo/store/create-store'

// Drive the *interactive sandbox* surface end-to-end (the bridge's most-grown, least-covered code):
// the marquee OCR→offset path, the import pipeline, and the PDF-preview mount.
const { searchParams } = vi.hoisted(() => ({
  searchParams: { get: vi.fn<(k: string) => string | null>(() => null) },
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }))

import { DemoExperience } from '@/components/demo/DemoExperience'

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
})
