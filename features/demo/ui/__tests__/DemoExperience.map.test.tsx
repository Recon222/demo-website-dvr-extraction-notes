import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

// mapbox-gl is mocked (no WebGL). The shared stub is chainable and complete (MR-5): this file's
// previous `Marker: vi.fn()` returned `undefined`, so `new Marker(...).setLngLat(...)` throws the
// moment markers are actually plotted — which today they never are, because nothing here awaits
// the map's async boot. One `await` away from ~15 confusing red tests.
vi.mock('mapbox-gl', async () => {
  const { createMapboxModuleStub } = await import('@/features/demo/ui/screens/map/__tests__/test-utils')
  return createMapboxModuleStub().module
})

import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { MAP_NARRATION } from '@/features/demo/engine/content/narration'
import { latestMapboxStub } from '@/features/demo/ui/screens/map/__tests__/test-utils'

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
})
afterEach(() => vi.unstubAllEnvs())

// Generous suite timeout (R-6): full-experience renders are heavy under jsdom and this file
// runs alongside sibling suites under CPU contention (observed 5.8s on a loaded runner) —
// not a loop; isolation runs finish well inside the default.
describe('DemoExperience — Map tab wiring', { timeout: 20000 }, () => {
  it('clicking the Map tab opens the Map screen', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByLabelText('Map'))
    expect(document.querySelector('[data-map-screen]')).toBeInTheDocument()
  })

  it('the manifest Map row jumps to the zero-case map, which is escapable via the tab bar', () => {
    // The checklist routes visitors here before any case exists — the empty picker
    // must not be a trap (docs/features/demo-explorer/ arch §5).
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByRole('button', { name: 'Case Map, not visited yet' }))
    expect(store.getState().view).toBe('map')
    expect(screen.getByText('No cases yet')).toBeInTheDocument() // picker's empty state
    fireEvent.click(screen.getByLabelText('Cases')) // tab bar still reachable
    expect(store.getState().view).toBe('cases')
    expect(screen.getByRole('button', { name: 'Case Map, visited' })).toBeInTheDocument()
  })

  it('shows the map narration on the rail (not a wizard chapter)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByLabelText('Map'))
    expect(screen.getByText(MAP_NARRATION.title)).toBeInTheDocument()
  })

  it('plots real markers once the map has actually booted (MR-5 stub guard)', async () => {
    // The ONLY test in this file that awaits the map's async boot, and it exists to keep the
    // shared mapbox stub honest: with a bare `Marker: vi.fn()` the chain
    // `new Marker(...).setLngLat(...).addTo(map)` throws, and every other test here passes only
    // because it returns before the boot resolves. If this goes red with a TypeError about
    // `setLngLat`, the stub regressed — not `MapCanvas`.
    const store = createDemoStore()
    const caseId = store.getState().createCase({
      caseNumber: 'PR25-MR5',
      displayName: 'Stub guard',
      unit: 'R',
      incidentCoordinates: { lat: 43.6, lng: -79.6, source: 'geocoded' },
    })
    store.getState().addLocation(caseId, { locationName: 'Rear door', gps: { lat: 43.61, lng: -79.61, source: 'geocoded' } })
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByLabelText('Map'))
    fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('Stub guard'))

    // Asked of the constructor, not the DOM: a stubbed Marker's `addTo` is a no-op, so nothing
    // is ever appended. What matters is that the full chain ran without throwing.
    //
    // `latestMapboxStub()` is read INSIDE the waitFor: `MapCanvas` imports mapbox-gl lazily, so
    // the mock factory has not run when this test's body starts.
    await waitFor(() => expect(latestMapboxStub().Marker).toHaveBeenCalled())
    const { markerInstances } = latestMapboxStub()
    expect(markerInstances.length).toBeGreaterThan(0)
    for (const marker of markerInstances) {
      expect(marker.setLngLat).toHaveBeenCalled()
      expect(marker.addTo).toHaveBeenCalled()
    }
  })

  it('keeps the tab bar visible on the map view', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByLabelText('Map'))
    expect(screen.getByLabelText('Map')).toBeInTheDocument()
  })
})

describe('DemoExperience — Map case picker', { timeout: 20000 }, () => {
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

  it('the search bar`s back button opens a dismissible picker that cancels back to the map', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => { store.getState().createCase({ caseNumber: 'PR25-A', displayName: 'Alpha', unit: 'R' }) })
    fireEvent.click(screen.getByLabelText('Map'))
    fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('Alpha'))
    expect(screen.queryByText('Pick a Case')).not.toBeInTheDocument()
    // The floating "Change Case" pill is gone (U5.2 / matrix row 17): PR #127 retired it into the
    // search bar's `[←]`, which is an icon button carrying the pill's job and the phone's label.
    expect(screen.queryByText('Change Case')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Change case'))
    expect(screen.getByText('Pick a Case')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Pick a Case')).not.toBeInTheDocument()
    expect(document.querySelector('[data-map-canvas]')).toBeInTheDocument()
  })
})
