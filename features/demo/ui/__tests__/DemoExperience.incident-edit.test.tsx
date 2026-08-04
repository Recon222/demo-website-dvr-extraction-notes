import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'

// mapbox-gl is mocked (no WebGL). The shared stub is chainable and complete (MR-5): this file's
// previous `Marker: vi.fn()` returned `undefined`, so `new Marker(...).setLngLat(...)` throws the
// moment markers are actually plotted — which today they never are, because nothing here awaits
// the map's async boot. One `await` away from ~15 confusing red tests.
vi.mock('mapbox-gl', async () => {
  const { createMapboxModuleStub } = await import('@/features/demo/ui/screens/map/__tests__/test-utils')
  return createMapboxModuleStub().module
})

import { DemoExperience } from '@/features/demo/ui/DemoExperience'

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
})
afterEach(() => vi.unstubAllEnvs())

/** Boots the demo on the map, viewing a case whose incident has coordinates (so the pin and the
 *  incident sheet row exist), and opens the incident detail card. */
function openIncidentDetail(store: DemoStore) {
  render(<DemoExperience store={store} />)
  act(() => {
    store.getState().createCase({
      caseNumber: 'PR25-INC',
      displayName: 'Kim B&E',
      unit: 'Central Robbery',
      oicName: 'Liam McHugh',
      notes: 'do not touch',
      incidentBusinessName: 'Kim Convenience',
      incidentStreetAddress: '1450 Eglinton Ave W',
      incidentCity: 'Mississauga',
      incidentCoordinates: { lat: 43.5, lng: -79.5, source: 'geocoded' },
    })
  })
  fireEvent.click(screen.getByLabelText('Map'))
  fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('Kim B&E'))
  // The incident row heads the sheet list (mapData pushes it before the locations). Selected by
  // position rather than by text: the incident row's headline is the case display name, which the
  // exiting CasesScreen still shows during the transition.
  fireEvent.click(screen.getAllByTestId('location-row')[0])
}

// Generous timeout (R-6): full-experience renders are heavy under jsdom and this file runs
// alongside sibling suites under CPU contention.
describe('DemoExperience — incident-location editing', { timeout: 20000 }, () => {
  it('the incident card opens the editor, seeded from the case', () => {
    const store = createDemoStore()
    openIncidentDetail(store)
    fireEvent.click(screen.getByText('Edit Incident Location'))
    expect(store.getState().modal).toBe('editIncident')
    expect(screen.getByRole('dialog', { name: 'Edit Incident Location' })).toBeInTheDocument()
    expect(screen.getByLabelText('Business / Scene Name')).toHaveValue('Kim Convenience')
    expect(screen.getByLabelText('Street Address')).toHaveValue('1450 Eglinton Ave W')
    expect(screen.getByLabelText('City')).toHaveValue('Mississauga')
    expect(screen.getByLabelText('Latitude')).toHaveValue('43.5')
    expect(screen.getByLabelText('Longitude')).toHaveValue('-79.5')
  })

  it('re-seeds from the store on each open, discarding an abandoned edit', () => {
    const store = createDemoStore()
    openIncidentDetail(store)
    fireEvent.click(screen.getByText('Edit Incident Location'))
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Typed then abandoned' } })
    fireEvent.click(screen.getByText('Cancel'))
    expect(store.getState().modal).toBeNull()
    // Cancel wrote nothing…
    expect(store.getState().cases[0].incidentCity).toBe('Mississauga')
    // …and the next open starts from the case again, not from the abandoned draft.
    fireEvent.click(screen.getByText('Edit Incident Location'))
    expect(screen.getByLabelText('City')).toHaveValue('Mississauga')
  })

  it('saving writes the incident fields and leaves the rest of the case alone', () => {
    const store = createDemoStore()
    openIncidentDetail(store)
    fireEvent.click(screen.getByText('Edit Incident Location'))
    fireEvent.change(screen.getByLabelText('Business / Scene Name'), { target: { value: 'Rear laneway' } })
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Brampton' } })
    fireEvent.click(screen.getByText('Save Changes'))

    const c = store.getState().cases[0]
    expect(c.incidentBusinessName).toBe('Rear laneway')
    expect(c.incidentCity).toBe('Brampton')
    expect(c.incidentCoordinates).toEqual({ lat: 43.5, lng: -79.5, source: 'geocoded' })
    expect(c.caseNumber).toBe('PR25-INC')
    expect(c.oicName).toBe('Liam McHugh')
    expect(c.notes).toBe('do not touch')
    expect(store.getState().modal).toBeNull()
  })

  // The phone bumps a `reloadToken` here because MapHost re-reads SQLite. The demo derives
  // mapData from the store, so the write itself must be the refresh — this is what pins it.
  it('the open detail card and the sheet row show the saved values immediately', () => {
    const store = createDemoStore()
    openIncidentDetail(store)
    fireEvent.click(screen.getByText('Edit Incident Location'))
    fireEvent.change(screen.getByLabelText('Business / Scene Name'), { target: { value: 'Rear laneway' } })
    fireEvent.change(screen.getByLabelText('Street Address'), { target: { value: '7 Elm St' } })
    fireEvent.click(screen.getByText('Save Changes'))

    // Still on the incident detail card — and it is rendering the new data.
    const detail = document.querySelector('[data-map-detail]')!
    expect(within(detail as HTMLElement).getByText('Rear laneway')).toBeInTheDocument()
    expect(within(detail as HTMLElement).getByText('7 Elm St')).toBeInTheDocument()
    expect(within(detail as HTMLElement).queryByText('Kim Convenience')).not.toBeInTheDocument()
  })

  it('moving the pin updates the plotted coordinates', () => {
    const store = createDemoStore()
    openIncidentDetail(store)
    fireEvent.click(screen.getByText('Edit Incident Location'))
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '43.7' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-79.4' } })
    fireEvent.click(screen.getByText('Save Changes'))

    // Typed by hand → provenance flips from geocoded to manual (phone stamping parity).
    expect(store.getState().cases[0].incidentCoordinates).toEqual({ lat: 43.7, lng: -79.4, source: 'manual' })
    const detail = document.querySelector('[data-map-detail]')!
    expect(within(detail as HTMLElement).getByText('43.700000, -79.400000')).toBeInTheDocument()
  })

  it('clearing both coordinates removes the incident from the map and falls back to the list', () => {
    const store = createDemoStore()
    openIncidentDetail(store)
    fireEvent.click(screen.getByText('Edit Incident Location'))
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '' } })
    fireEvent.click(screen.getByText('Save Changes'))

    expect(store.getState().cases[0].incidentCoordinates).toBeUndefined()
    // The incident item is gone from the projection, so the sheet returns to list mode rather
    // than stranding a detail card for an item that no longer exists.
    expect(document.querySelector('[data-map-detail]')).toBeNull()
  })

  it('does not offer the editor on a recovery location', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      const c = store.getState().createCase({ caseNumber: 'PR25-L', displayName: 'LocCase', unit: 'R' })
      store.getState().addLocation(c, { locationName: 'Front Counter', gps: { lat: 43.6, lng: -79.6, source: 'geocoded' } })
    })
    fireEvent.click(screen.getByLabelText('Map'))
    fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('LocCase'))
    fireEvent.click(screen.getByText('Front Counter'))
    expect(screen.getByText('Go to Location')).toBeInTheDocument()
    expect(screen.queryByText('Edit Incident Location')).not.toBeInTheDocument()
  })
})
