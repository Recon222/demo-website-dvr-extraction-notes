import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

// mapbox-gl is mocked (no WebGL); a constructable (non-arrow) Map so `new mapboxgl.Map(...)` works.
const { mapInstance } = vi.hoisted(() => {
  const mapInstance = {
    on: vi.fn((evt: string, cb: () => void) => { if (evt === 'load') cb() }),
    remove: vi.fn(), flyTo: vi.fn(), fitBounds: vi.fn(), setCenter: vi.fn(), setZoom: vi.fn(),
  }
  return { mapInstance }
})
vi.mock('mapbox-gl', () => ({
  default: { Map: vi.fn(function () { return mapInstance }), Marker: vi.fn(), accessToken: '' },
}))

import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { MAP_NARRATION } from '@/features/demo/engine/content/narration'

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
})
afterEach(() => vi.unstubAllEnvs())

describe('DemoExperience — Map tab wiring', () => {
  it('clicking the Map tab opens the Map screen', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByLabelText('Map'))
    expect(document.querySelector('[data-map-screen]')).toBeInTheDocument()
  })

  it('shows the map narration on the rail (not a wizard chapter)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByLabelText('Map'))
    expect(screen.getByText(MAP_NARRATION.title)).toBeInTheDocument()
  })

  it('keeps the tab bar visible on the map view', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByLabelText('Map'))
    expect(screen.getByLabelText('Map')).toBeInTheDocument()
  })
})

describe('DemoExperience — Map case picker', () => {
  it('shows the mandatory picker (no Cancel) when no viewer case is chosen', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => { store.getState().createCase({ caseNumber: 'PR25-A', displayName: 'Alpha', unit: 'R' }) })
    fireEvent.click(screen.getByLabelText('Map'))
    expect(screen.getByText('Pick a Case')).toBeInTheDocument()
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('picking a case shows it on the map without touching the form currentCaseId', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => { store.getState().createCase({ caseNumber: 'PR25-A', displayName: 'Alpha', unit: 'R' }) })
    act(() => { store.getState().createCase({ caseNumber: 'PR25-B', displayName: 'Bravo', unit: 'R' }) })
    const cur = store.getState().currentCaseId // 'Bravo'
    fireEvent.click(screen.getByLabelText('Map'))
    // Scope to the picker — the exiting CasesScreen also shows case names during the transition.
    fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('Alpha'))
    expect(document.querySelector('[data-map-canvas]')).toBeInTheDocument()
    expect(store.getState().currentCaseId).toBe(cur) // viewer is tab-local — form case untouched
  })

  it('Go to Location switches the form to that location and enters the wizard', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    let locId = ''
    act(() => {
      const c = store.getState().createCase({ caseNumber: 'PR25-GO', displayName: 'GoCase', unit: 'R' })
      locId = store.getState().addLocation(c, { locationName: 'Front Counter', gps: { lat: 43.6, lng: -79.6, source: 'geocoded' } })
    })
    fireEvent.click(screen.getByLabelText('Map'))
    fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('GoCase'))
    fireEvent.click(screen.getByText('Front Counter')) // select the located location → detail
    fireEvent.click(screen.getByText('Go to Location'))
    expect(store.getState().currentLocationId).toBe(locId)
    expect(store.getState().view).toBe('submission')
  })

  it('Change Case opens a dismissible picker that cancels back to the map', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => { store.getState().createCase({ caseNumber: 'PR25-A', displayName: 'Alpha', unit: 'R' }) })
    fireEvent.click(screen.getByLabelText('Map'))
    fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('Alpha'))
    expect(screen.queryByText('Pick a Case')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Change Case'))
    expect(screen.getByText('Pick a Case')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Pick a Case')).not.toBeInTheDocument()
    expect(document.querySelector('[data-map-canvas]')).toBeInTheDocument()
  })
})
