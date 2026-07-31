import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { NEW_LOCATION_BLOCK_MESSAGES } from '@/features/demo/engine/logic/new-location-gate'

/** Opens the New Location modal through the real affordance — Cases → expand the card →
 *  "Add Location" — which is also what tells the bridge WHICH case's siblings the duplicate
 *  check compares against. */
function openNewLocationModal(caseNumber: string) {
  // Expanding is a toggle and only one card is open at a time; the row survives a modal
  // open/close, so only expand when the action isn't already on screen.
  if (!screen.queryByText('Add Location')) fireEvent.click(screen.getByText(caseNumber))
  fireEvent.click(screen.getByText('Add Location'))
}

const nameInput = () => screen.getByLabelText('Location Name')
const submit = () => screen.getByRole('button', { name: 'Create Location' })

// Generous suite timeout (R-6): full-experience renders are heavy under jsdom and this file runs
// alongside siblings under CPU contention; isolation runs finish well inside the default.
describe('DemoExperience — New Location duplicate names are per-case', { timeout: 20000 }, () => {
  it('blocks a name already on the SAME case, and lets it through once renamed', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      const caseId = store.getState().createCase({ caseNumber: 'PR25-DUP', displayName: 'X', unit: 'Robbery' })
      store.getState().addLocation(caseId, { locationName: 'Main Store' })
      store.getState().setView('cases')
    })

    openNewLocationModal('PR25-DUP')
    fireEvent.change(nameInput(), { target: { value: '  main STORE ' } })

    expect(screen.getByTestId('new-location-blocked')).toHaveTextContent(NEW_LOCATION_BLOCK_MESSAGES.duplicateName)
    expect(submit()).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(submit())
    expect(store.getState().locations).toHaveLength(1)

    fireEvent.change(nameInput(), { target: { value: 'Rear Door' } })
    expect(submit()).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(submit())

    expect(store.getState().locations.map((l) => l.locationName)).toEqual(['Main Store', 'Rear Door'])
  })

  it('allows the same name on a DIFFERENT case', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      const a = store.getState().createCase({ caseNumber: 'PR25-A', displayName: 'X', unit: 'Robbery' })
      store.getState().addLocation(a, { locationName: 'Main Store' })
      store.getState().createCase({ caseNumber: 'PR25-B', displayName: 'Y', unit: 'Robbery' })
      store.getState().setView('cases')
    })

    openNewLocationModal('PR25-B')
    fireEvent.change(nameInput(), { target: { value: 'Main Store' } })

    expect(screen.getByTestId('new-location-blocked')).toBeEmptyDOMElement()
    fireEvent.click(submit())

    const byCase = store.getState().cases.map((c) => ({
      caseNumber: c.caseNumber,
      names: store.getState().locations.filter((l) => l.caseId === c.id).map((l) => l.locationName),
    }))
    expect(byCase).toEqual([
      { caseNumber: 'PR25-B', names: ['Main Store'] },
      { caseNumber: 'PR25-A', names: ['Main Store'] },
    ])
  })
})
