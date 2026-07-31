import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { LONG_PRESS_MS } from '@/features/demo/ui/useLongPress'

/**
 * P3.5 — the location action chooser, driven through the bridge (matrix row 14).
 *
 * The store actions and the modal have their own suites; this one pins the WIRING: what the
 * long-press resolves, that the suggested name is pre-deduped against the case's siblings, that
 * a duplicate lands in the list without hijacking the open location, and what the visitor is
 * told afterwards.
 */

function setup(locationNames: string[] = ['Main Store']): { store: DemoStore; caseId: string } {
  const store = createDemoStore()
  let caseId = ''
  act(() => {
    caseId = store.getState().createCase({ caseNumber: 'PR25-0098213', displayName: "Kim's — B&E", unit: 'Robbery' })
    for (const locationName of locationNames) {
      store.getState().addLocation(caseId, { locationName, streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' })
    }
  })
  return { store, caseId }
}

/** Expand the case card so its location rows render. */
function expandCase(caseNumber = 'PR25-0098213') {
  fireEvent.click(screen.getByText(caseNumber))
}

const openChooser = (locationName: string) =>
  fireEvent.click(screen.getByRole('button', { name: `Actions for ${locationName}` }))

const chooser = () => screen.getByRole('dialog', { name: 'Duplicate Location' })

afterEach(() => {
  vi.useRealTimers()
})

describe('DemoExperience — location action chooser', () => {
  it('opens from the row actions button with a pre-deduped suggested name', () => {
    const { store } = setup(['Main Store', 'Main Store - Copy'])
    render(<DemoExperience store={store} />)
    expandCase()

    openChooser('Main Store')

    expect(chooser()).toBeInTheDocument()
    // "Main Store - Copy" is taken by the sibling, so the suggestion moves on.
    expect(screen.getByLabelText('Location Name')).toHaveValue('Main Store - Copy (2)')
    expect(store.getState().modal).toBe('duplicateLocation')
  })

  it('opens from a long press on the row (and the row does not open)', () => {
    vi.useFakeTimers()
    const { store } = setup()
    render(<DemoExperience store={store} />)
    expandCase()
    const row = screen.getByText('Main Store').closest('button')!

    fireEvent.pointerDown(row, { pointerId: 1, button: 0, clientX: 4, clientY: 4 })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    fireEvent.pointerUp(row)
    fireEvent.click(row, { detail: 1 })

    expect(chooser()).toBeInTheDocument()
    expect(store.getState().view).toBe('cases') // never navigated into the wizard
  })

  it('duplicates the pressed location, keeps the visitor on Cases, and says what happened', () => {
    const { store, caseId } = setup()
    act(() => {
      // Give the source a scope so the two modes are distinguishable.
      store.getState().updateField('form.scopes', [
        { id: 'sc1', startDateTime: '2025-03-08 22:00:00', endDateTime: '2025-03-09 02:00:00', isActualTime: true, cameras: 'ch 3' },
      ])
    })
    const sourceId = store.getState().currentLocationId
    render(<DemoExperience store={store} />)
    expandCase()
    openChooser('Main Store')

    fireEvent.click(within(chooser()).getByRole('button', { name: 'Duplicate Location with Scopes' }))

    const locations = store.getState().locations
    expect(locations).toHaveLength(2)
    expect(locations[1].locationName).toBe('Main Store - Copy')
    expect(locations[1].form.scopes).toHaveLength(1)
    expect(locations[1].form.scopes[0].cameras).toBe('') // channels don't travel
    expect(store.getState().cases.find((c) => c.id === caseId)!.locationIds).toHaveLength(2)
    // The chooser closed, the wizard was NOT entered, and the open location did not move.
    expect(screen.queryByRole('dialog', { name: 'Duplicate Location' })).toBeNull()
    expect(store.getState().view).toBe('cases')
    expect(store.getState().currentLocationId).toBe(sourceId)
    expect(screen.getByTestId('demo-notification')).toHaveTextContent(
      'Location Duplicated — Main Store - Copy created with scopes.',
    )
  })

  it("'Duplicate Location' leaves the scopes behind and says so", () => {
    const { store } = setup()
    act(() => {
      store.getState().updateField('form.scopes', [
        { id: 'sc1', startDateTime: '2025-03-08 22:00:00', endDateTime: '2025-03-09 02:00:00', isActualTime: true, cameras: '' },
      ])
    })
    render(<DemoExperience store={store} />)
    expandCase()
    openChooser('Main Store')

    fireEvent.click(within(chooser()).getByRole('button', { name: 'Duplicate Location' }))

    expect(store.getState().locations[1].form.scopes).toEqual([])
    expect(screen.getByTestId('demo-notification')).toHaveTextContent(
      'Location Duplicated — Main Store - Copy created.',
    )
  })

  it('the new row is immediately in the list and the next chooser numbers past it', () => {
    const { store } = setup()
    render(<DemoExperience store={store} />)
    expandCase()

    openChooser('Main Store')
    fireEvent.click(within(chooser()).getByRole('button', { name: 'Duplicate Location' }))
    expect(screen.getByRole('button', { name: 'Actions for Main Store - Copy' })).toBeInTheDocument()

    openChooser('Main Store')
    expect(screen.getByLabelText('Location Name')).toHaveValue('Main Store - Copy (2)')
  })

  it('renaming into a sibling collision blocks the duplicate with the phone error', () => {
    const { store } = setup(['Main Store', 'Back Office'])
    render(<DemoExperience store={store} />)
    expandCase()
    openChooser('Main Store')

    fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: 'back office' } })

    expect(screen.getByRole('alert')).toHaveTextContent('A location with this name already exists in this case')
    expect(within(chooser()).getByRole('button', { name: 'Duplicate Location' })).toBeDisabled()
    fireEvent.click(within(chooser()).getByRole('button', { name: 'Duplicate Location' }))
    expect(store.getState().locations).toHaveLength(2) // nothing created
  })

  it('Cancel closes the chooser and creates nothing', () => {
    const { store } = setup()
    render(<DemoExperience store={store} />)
    expandCase()
    openChooser('Main Store')

    fireEvent.click(within(chooser()).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog', { name: 'Duplicate Location' })).toBeNull()
    expect(store.getState().modal).toBeNull()
    expect(store.getState().locations).toHaveLength(1)
  })

  describe('New Location w/ Sub Info (the copy-to-a-new-address flow)', () => {
    /** A source location with the request info a copy is supposed to carry. */
    function sourceWithRequest(): DemoStore {
      const { store } = setup()
      act(() => {
        const st = store.getState()
        st.updateField('requesterName', 'Liam McHugh')
        st.updateField('requesterBadge', '4471')
        st.updateField('requesterUnit', 'Central Robbery')
        st.updateField('requesterPhone', '905-555-0110')
        st.updateField('requesterEmail', 'l.mchugh@example.ca')
        st.updateField('locationContact', 'Sandeep Gill')
        st.updateField('locationPhone', '905-555-0142')
        st.updateField('form.scopes', [
          { id: 'sc1', startDateTime: '2025-03-08 22:00:00', endDateTime: '2025-03-09 02:00:00', isActualTime: true, cameras: 'ch 3' },
        ])
      })
      return store
    }

    const card = () => screen.getByRole('dialog', { name: 'New Location' })

    it('swaps the chooser for the require-address card, pre-filled from the source', () => {
      const store = sourceWithRequest()
      render(<DemoExperience store={store} />)
      expandCase()
      openChooser('Main Store')

      fireEvent.click(within(chooser()).getByRole('button', { name: 'New Location w/ Sub Info' }))

      expect(screen.queryByRole('dialog', { name: 'Duplicate Location' })).toBeNull()
      expect(card()).toBeInTheDocument()
      expect(store.getState().modal).toBe('newAddressLocation')
      expect(screen.getByText('Submission info copied — enter the new address.')).toBeInTheDocument()
      // Name pre-deduped from "New Location"; the on-site contact travels; the address does not.
      expect(screen.getByLabelText('Location Name')).toHaveValue('New Location')
      expect(screen.getByLabelText('Contact Person')).toHaveValue('Sandeep Gill')
      expect(screen.getByLabelText('Contact Phone')).toHaveValue('905-555-0142')
      expect(screen.getByLabelText('Street Address')).toHaveValue('')
    })

    it('gates Create on the new street address', () => {
      const store = sourceWithRequest()
      render(<DemoExperience store={store} />)
      expandCase()
      openChooser('Main Store')
      fireEvent.click(within(chooser()).getByRole('button', { name: 'New Location w/ Sub Info' }))

      const create = within(card()).getByRole('button', { name: 'Create Location' })
      expect(create).toBeDisabled()

      fireEvent.click(create)
      expect(store.getState().locations).toHaveLength(1) // nothing created

      fireEvent.change(screen.getByLabelText('Street Address'), { target: { value: '99 Queen St W' } })
      expect(within(card()).getByRole('button', { name: 'Create Location' })).toBeEnabled()
    })

    it('creates an independent location carrying the requester block, then opens it', () => {
      const store = sourceWithRequest()
      const sourceId = store.getState().currentLocationId
      render(<DemoExperience store={store} />)
      expandCase()
      openChooser('Main Store')
      fireEvent.click(within(chooser()).getByRole('button', { name: 'New Location w/ Sub Info + Scopes' }))

      fireEvent.change(screen.getByLabelText('Street Address'), { target: { value: '99 Queen St W' } })
      fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Brampton' } })
      fireEvent.click(within(card()).getByRole('button', { name: 'Create Location' }))

      const created = store.getState().locations[1]
      expect(created.locationName).toBe('New Location')
      expect(created.streetAddress).toBe('99 Queen St W')
      expect(created.city).toBe('Brampton')
      expect(created.requesterName).toBe('Liam McHugh')
      expect(created.requesterUnit).toBe('Central Robbery')
      expect(created.requesterEmail).toBe('l.mchugh@example.ca')
      expect(created.form.scopes).toHaveLength(1) // "+ Scopes"
      expect(created.id).not.toBe(sourceId)

      // The phone navigates into the wizard for this flow (unlike a plain duplicate).
      expect(store.getState().currentLocationId).toBe(created.id)
      expect(store.getState().view).toBe('submission')
      expect(store.getState().modal).toBeNull()
      expect(screen.getByTestId('demo-notification')).toHaveTextContent(
        'Location Created — New Location created with copied submission info and scopes',
      )
    })

    it('omits the scopes (and says so) in the submission-only mode', () => {
      const store = sourceWithRequest()
      render(<DemoExperience store={store} />)
      expandCase()
      openChooser('Main Store')
      fireEvent.click(within(chooser()).getByRole('button', { name: 'New Location w/ Sub Info' }))
      fireEvent.change(screen.getByLabelText('Street Address'), { target: { value: '99 Queen St W' } })
      fireEvent.click(within(card()).getByRole('button', { name: 'Create Location' }))

      expect(store.getState().locations[1].form.scopes).toEqual([])
      expect(screen.getByTestId('demo-notification')).toHaveTextContent(
        'Location Created — New Location created with copied submission info',
      )
    })

    it('numbers the default name past an existing "New Location"', () => {
      const { store } = setup(['Main Store', 'New Location'])
      render(<DemoExperience store={store} />)
      expandCase()
      openChooser('Main Store')
      fireEvent.click(within(chooser()).getByRole('button', { name: 'New Location w/ Sub Info' }))

      expect(screen.getByLabelText('Location Name')).toHaveValue('New Location (2)')
    })

    it('blocks a name typed into a sibling collision', () => {
      const { store } = setup(['Main Store', 'Back Office'])
      render(<DemoExperience store={store} />)
      expandCase()
      openChooser('Main Store')
      fireEvent.click(within(chooser()).getByRole('button', { name: 'New Location w/ Sub Info' }))

      fireEvent.change(screen.getByLabelText('Street Address'), { target: { value: '99 Queen St W' } })
      fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: '  BACK OFFICE ' } })

      expect(screen.getByRole('alert')).toHaveTextContent('A location with this name already exists in this case')
      expect(within(card()).getByRole('button', { name: 'Create Location' })).toBeDisabled()
      expect(store.getState().locations).toHaveLength(2)
    })

    it('Cancel drops the card without creating anything', () => {
      const store = sourceWithRequest()
      render(<DemoExperience store={store} />)
      expandCase()
      openChooser('Main Store')
      fireEvent.click(within(chooser()).getByRole('button', { name: 'New Location w/ Sub Info' }))
      fireEvent.click(within(card()).getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByRole('dialog', { name: 'New Location' })).toBeNull()
      expect(store.getState().modal).toBeNull()
      expect(store.getState().locations).toHaveLength(1)
      expect(store.getState().view).toBe('cases')
    })
  })

  describe('the two export actions (honest, not fake — plan D4)', () => {
    it.each([
      ['Export ZIP', "Export ZIP isn't available yet — it lands with the Export tab."],
      ['Export GeoJSON', "Export GeoJSON isn't available yet — it lands with the Export tab."],
    ])('%s closes the chooser and says what is really true', (label, message) => {
      const { store } = setup()
      render(<DemoExperience store={store} />)
      expandCase()
      openChooser('Main Store')

      fireEvent.click(within(chooser()).getByRole('button', { name: label }))

      expect(screen.queryByRole('dialog', { name: 'Duplicate Location' })).toBeNull()
      expect(screen.getByTestId('demo-notification')).toHaveTextContent(message)
      // Nothing was fabricated: no location, no navigation, no download claim.
      expect(store.getState().locations).toHaveLength(1)
      expect(store.getState().view).toBe('cases')
    })
  })

  it('the chooser scopes to sibling names of ITS case, not every location in the demo', () => {
    const { store } = setup(['Main Store'])
    act(() => {
      const other = store.getState().createCase({ caseNumber: 'PR25-0000001', displayName: 'Other', unit: 'Robbery' })
      store.getState().addLocation(other, { locationName: 'Main Store - Copy' })
    })
    render(<DemoExperience store={store} />)
    expandCase()
    openChooser('Main Store')

    // The other case's "Main Store - Copy" is not a sibling — the first suggestion stands.
    expect(screen.getByLabelText('Location Name')).toHaveValue('Main Store - Copy')
  })
})
