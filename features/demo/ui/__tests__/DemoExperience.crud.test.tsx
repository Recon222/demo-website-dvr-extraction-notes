import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'

/**
 * P3.1 end-to-end through the bridge: row action → confirmation dialog → store write →
 * repaired selection. The long-press mechanics themselves are pinned in
 * `screens/__tests__/CasesScreen.row-actions.test.tsx`; here the trays are opened through the
 * keyboard-reachable trigger so this suite stays free of fake timers.
 */

function seed() {
  const store = createDemoStore()
  act(() => {
    const a = store.getState().createCase({ caseNumber: 'PR25-A', displayName: "Kim's — B&E", unit: 'Robbery' })
    store.getState().addLocation(a, { locationName: "Kim's Convenience", streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' })
    store.getState().addLocation(a, { locationName: 'Rear Alley' })
    const b = store.getState().createCase({ caseNumber: 'PR25-B', displayName: '', unit: 'Robbery' })
    store.getState().addLocation(b, { locationName: 'Plaza Office' })
  })
  return store
}

const caseIdOf = (store: DemoStore, caseNumber: string) => store.getState().cases.find((c) => c.caseNumber === caseNumber)!.id
const locIdOf = (store: DemoStore, name: string) => store.getState().locations.find((l) => l.locationName === name)!.id

/** Reveal a row's actions through its trigger, then press Delete. */
function pressDelete(triggerName: string) {
  fireEvent.click(screen.getByRole('button', { name: triggerName }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
}

/** Expand a case card (the bridge owns `expandedCaseId`). */
function expandCase(caseNumber: string) {
  fireEvent.click(screen.getByText(caseNumber).closest('button') as HTMLElement)
}

describe('DemoExperience — delete a case', () => {
  it('confirms with the case number and the locations that go with it, then deletes', () => {
    const store = seed()
    render(<DemoExperience store={store} />)

    pressDelete('Actions for case PR25-A')

    expect(screen.getByText('Delete Case?')).toBeInTheDocument()
    expect(screen.getByText('WARNING: This will also delete these locations:')).toBeInTheDocument()
    const list = screen.getByTestId('location-list-scroll')
    expect(list).toHaveTextContent("Kim's Convenience")
    expect(list).toHaveTextContent('Rear Alley')
    expect(list).not.toHaveTextContent('Plaza Office') // the other case's location

    fireEvent.click(screen.getByTestId('delete-modal-confirm'))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(store.getState().cases.map((c) => c.caseNumber)).toEqual(['PR25-B'])
    expect(store.getState().locations.map((l) => l.locationName)).toEqual(['Plaza Office'])
    expect(screen.queryByText('PR25-A')).not.toBeInTheDocument()
    expect(screen.getByText('PR25-B')).toBeInTheDocument()
  })

  it('leaves everything alone on Cancel — and on Escape', () => {
    const store = seed()
    render(<DemoExperience store={store} />)

    pressDelete('Actions for case PR25-A')
    fireEvent.click(screen.getByTestId('delete-modal-cancel'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(store.getState().cases).toHaveLength(2)

    pressDelete('Actions for case PR25-A')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(store.getState().cases).toHaveLength(2)
    expect(store.getState().locations).toHaveLength(3)
  })

  it('omits the cascade warning for a case with no locations', () => {
    const store = seed()
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-C', displayName: '', unit: 'Robbery' })
    })
    render(<DemoExperience store={store} />)

    pressDelete('Actions for case PR25-C')
    expect(screen.getByText('Delete Case?')).toBeInTheDocument()
    expect(screen.queryByText('WARNING: This will also delete these locations:')).not.toBeInTheDocument()
    expect(screen.getByText('All form data, photos, and PDFs will be permanently deleted.')).toBeInTheDocument()
  })
})

describe('DemoExperience — delete a location', () => {
  it('confirms with the location name and its composed address, then deletes just that row', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    expandCase('PR25-A')

    pressDelete("Actions for location Kim's Convenience")

    const dialog = within(screen.getByRole('alertdialog'))
    expect(dialog.getByText('Delete Location?')).toBeInTheDocument()
    expect(dialog.getByText('Address:')).toBeInTheDocument()
    // Street + city, composed exactly as the row behind it renders (formatAddress abbreviates)
    // — scoped to the dialog precisely because the row shows the same string.
    expect(dialog.getByText('1450 Eglinton Ave W, Mississauga')).toBeInTheDocument()
    expect(
      dialog.getByText('All form data, photos, and PDFs for this location will be permanently deleted.'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('delete-modal-confirm'))

    expect(store.getState().locations.map((l) => l.locationName)).toEqual(['Rear Alley', 'Plaza Office'])
    expect(store.getState().cases).toHaveLength(2)
    const caseA = store.getState().cases.find((c) => c.caseNumber === 'PR25-A')!
    expect(caseA.locationIds).toEqual([locIdOf(store, 'Rear Alley')])
    expect(screen.getByText('Rear Alley')).toBeInTheDocument()
  })

  it('omits the Address row for a location with no address', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    expandCase('PR25-A')
    pressDelete('Actions for location Rear Alley')
    expect(screen.getByText('Delete Location?')).toBeInTheDocument()
    expect(screen.queryByText('Address:')).not.toBeInTheDocument()
  })
})

describe('DemoExperience — the selection survives coherently (R-19)', () => {
  it('deleting the case that owns the OPEN location returns the visitor to a live surface', () => {
    const store = seed()
    render(<DemoExperience store={store} />)

    // Select the location without leaving the Cases screen. (Opening it through the row would
    // navigate into the wizard, and coming back leaves the exiting screen mounted for the
    // cross-slide — the sibling test below covers the UI-driven open.)
    act(() => {
      store.getState().switchLocation(locIdOf(store, "Kim's Convenience"))
    })
    expect(store.getState().currentCaseId).toBe(caseIdOf(store, 'PR25-A'))

    pressDelete('Actions for case PR25-A')
    fireEvent.click(screen.getByTestId('delete-modal-confirm'))

    expect(store.getState().currentLocationId).toBeNull()
    expect(store.getState().currentCaseId).toBeNull()

    // Walking back into the wizard now shows the honest no-location notice, not a dead form.
    act(() => {
      store.getState().setView('submission')
    })
    expect(screen.getByText(/No location open/)).toBeInTheDocument()
  })

  it('deleting an unrelated case leaves the open location and its case selected', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    expandCase('PR25-A')
    fireEvent.click(screen.getByText("Kim's Convenience").closest('button') as HTMLElement)
    act(() => {
      store.getState().setView('cases')
    })

    pressDelete('Actions for case PR25-B')
    fireEvent.click(screen.getByTestId('delete-modal-confirm'))

    expect(store.getState().currentLocationId).toBe(locIdOf(store, "Kim's Convenience"))
    expect(store.getState().currentCaseId).toBe(caseIdOf(store, 'PR25-A'))
  })
})
