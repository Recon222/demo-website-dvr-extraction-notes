import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'

/**
 * P2.4 / matrix G9 — the Completion gate through the real bridge.
 *
 * The phone's `finalSubmissionSchema` is its ONE runtime validation gate, run on
 * "Complete & Save" and on "Preview/Export PDF" (`app/(form)/completion.tsx:119/138/171/235/371`,
 * catalogued in phone docs/ui-mapping/08-wizard-d-completion.md → Completion → Validation).
 * These drive it end to end: what blocks, what the visitor is told, how they get unblocked,
 * and that a passing gate leaves the existing location-scoped completion untouched.
 */

type Store = ReturnType<typeof createDemoStore>

const SCOPE = [
  { id: 'sc-1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '' },
]

const MSG = {
  occ: 'OCC number is required',
  address: 'Address is required',
  scopes: 'At least one extraction scope with start and end times is required',
} as const

/** A case + location with NOTHING the gate wants beyond the occurrence number. */
function setupBare(store: Store, caseNumber = 'PR25-GATE') {
  let locId = ''
  act(() => {
    const caseId = store.getState().createCase({ caseNumber, displayName: 'Gate Case', unit: 'Robbery' })
    locId = store.getState().addLocation(caseId, { locationName: 'Test Location' })
    store.getState().switchLocation(locId)
    store.getState().setView('completion')
  })
  return locId
}

function fillAddress(store: Store) {
  act(() => {
    store.getState().updateField('streetAddress', '1450 Eglinton Ave W')
    store.getState().updateField('city', 'Mississauga')
  })
}

function fillScope(store: Store) {
  act(() => store.getState().updateField('form.scopes', SCOPE))
}

describe('Completion gate — Complete & Save', { timeout: 20000 }, () => {
  it('blocks an incomplete location: no completion, the phone alert, and the missing rules listed', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)

    fireEvent.click(screen.getByText('Complete & Save'))

    // Nothing was completed — not the location, not the case (the G4 payoff must not fire).
    expect(store.getState().locations[0].form.completed).toBe(false)
    expect(store.getState().cases[0].status).toBe('draft')
    expect(screen.queryByText('Location Complete')).not.toBeInTheDocument()

    // The phone's blocked alert, copy verbatim (completion.tsx:372-380).
    const dialog = screen.getByRole('alertdialog', { name: 'Missing Required Fields' })
    expect(dialog).toHaveTextContent('Please fill in all required fields to complete the case. Save progress instead?')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Progress' })).toBeInTheDocument()

    // …and the on-screen card names exactly which rules failed (completion.tsx:468-479).
    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('Required Fields Missing')
    expect(card).toHaveTextContent(`- ${MSG.address}`)
    expect(card).toHaveTextContent(`- ${MSG.scopes}`)
    expect(card).not.toHaveTextContent(MSG.occ) // the case number IS set — only real gaps listed
  })

  it('lists all three rules when nothing is filled in, in the phone order', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store, '') // a case with no occurrence number

    fireEvent.click(screen.getByText('Complete & Save'))

    const lines = screen.getByRole('alert').textContent!
    expect(lines).toContain(`- ${MSG.occ}`)
    expect(lines).toContain(`- ${MSG.address}`)
    expect(lines).toContain(`- ${MSG.scopes}`)
    expect(lines.indexOf(MSG.occ)).toBeLessThan(lines.indexOf(MSG.address))
    expect(lines.indexOf(MSG.address)).toBeLessThan(lines.indexOf(MSG.scopes))
  })

  it('a half-filled scope does not satisfy the scope rule', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)
    fillAddress(store)
    act(() =>
      store.getState().updateField('form.scopes', [{ ...SCOPE[0], endDateTime: '' }]),
    )

    fireEvent.click(screen.getByText('Complete & Save'))
    expect(screen.getByRole('alert')).toHaveTextContent(`- ${MSG.scopes}`)
    expect(store.getState().locations[0].form.completed).toBe(false)
  })

  it('Cancel closes the alert and changes nothing — the card stays as the standing explanation', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)
    fireEvent.click(screen.getByText('Complete & Save'))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Required Fields Missing')
    expect(store.getState().locations[0].form.completed).toBe(false)
    expect(store.getState().view).toBe('completion')
  })

  it('Escape dismisses the blocked alert without completing anything', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)
    fireEvent.click(screen.getByText('Complete & Save'))

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(store.getState().locations[0].form.completed).toBe(false)
  })

  it('Save Progress routes to Cases with the phone copy plus the demo’s honest session line', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)
    fireEvent.click(screen.getByText('Complete & Save'))

    fireEvent.click(screen.getByRole('button', { name: 'Save Progress' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Progress Saved' })
    expect(dialog).toHaveTextContent('You can continue this location later from the Cases screen.')
    // Honesty rule (R-2): the persistence sentence is gated on the persistence layer actually
    // storing. An INJECTED store is deliberately never persisted, so the truthful copy here is
    // the demoted one — the promise must not be a constant. Both arms live in
    // DemoExperience.progress-saved.test.tsx.
    expect(dialog).toHaveTextContent("This browser isn't storing the session")
    expect(dialog).not.toHaveTextContent('survives a refresh')

    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(store.getState().view).toBe('cases')
    // Save Progress is not completion: the case stays a draft, the work stays in the store.
    expect(store.getState().cases[0].status).toBe('draft')
    expect(store.getState().locations[0].form.completed).toBe(false)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('fixing the data clears the card by itself — no second tap needed (phone auto-clear effect)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)
    fireEvent.click(screen.getByText('Complete & Save'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fillAddress(store)
    expect(screen.getByRole('alert')).toBeInTheDocument() // still one rule short
    fillScope(store)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a satisfied gate completes exactly as before — the location-scoped semantics are untouched', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)
    fillAddress(store)
    fillScope(store)

    fireEvent.click(screen.getByText('Complete & Save'))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Location Complete')).toBeInTheDocument()
    expect(store.getState().locations[0].form.completed).toBe(true)
    expect(store.getState().cases[0].status).toBe('complete')
  })

  it('R-19: the gate reads the OWNING case, not the selection pair', () => {
    // The location's own case has NO occurrence number; the (incoherent) currentCaseId points
    // at one that does. Reading the pair would wave through a location with no OCC number.
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    let loc = ''
    act(() => {
      const caseA = store.getState().createCase({ caseNumber: '', displayName: 'A', unit: 'Robbery' })
      loc = store.getState().addLocation(caseA, { locationName: 'L1' })
      store.getState().switchLocation(loc)
      store.getState().updateField('streetAddress', '1450 Eglinton Ave W')
      store.getState().updateField('form.scopes', SCOPE)
      const caseB = store.getState().createCase({ caseNumber: 'CASE-B', displayName: 'B', unit: 'Robbery' })
      store.setState({ currentLocationId: loc, currentCaseId: caseB })
      store.getState().setView('completion')
    })

    fireEvent.click(screen.getByText('Complete & Save'))

    expect(screen.getByRole('alert')).toHaveTextContent(`- ${MSG.occ}`)
    expect(store.getState().locations[0].form.completed).toBe(false)
    expect(store.getState().cases.find((c) => c.caseNumber === 'CASE-B')?.status).toBe('draft')
  })

  it('errors do not follow the visitor to another location', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)
    fireEvent.click(screen.getByText('Complete & Save'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      const other = store.getState().addLocation(store.getState().cases[0].id, { locationName: 'Site Two' })
      store.getState().switchLocation(other)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('leaving Completion closes a standing alert — it never hangs over another screen', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)
    fireEvent.click(screen.getByText('Complete & Save'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    act(() => store.getState().setView('cases'))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('Completion gate — Preview / Export PDF', { timeout: 20000 }, () => {
  it('blocks the court document and names the missing fields in the alert body', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)

    fireEvent.click(screen.getByText('Preview / Export PDF'))

    expect(screen.queryByTitle('Case Notes — PDF')).not.toBeInTheDocument()
    const dialog = screen.getByRole('alertdialog', { name: 'Missing Required Fields' })
    // The phone's PDF-path alert body is the joined messages, not the Save-Progress prompt.
    expect(dialog).toHaveTextContent(MSG.address)
    expect(dialog).toHaveTextContent(MSG.scopes)
    expect(dialog).not.toHaveTextContent('Save progress instead?')
    expect(screen.queryByRole('button', { name: 'Save Progress' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
    // The same card the completion path raises — one gate, one explanation.
    expect(screen.getByRole('alert')).toHaveTextContent('Required Fields Missing')
  })

  it('names the missing fields on the FIRST blocked tap (the phone shows an empty body there)', () => {
    // Deliberate deviation: the phone reads `validationErrors` state that
    // `validateRequiredFields()` has only just `setValidationErrors`'d in the same tick
    // (completion.tsx:171-173), so its first blocked tap alerts with an empty message.
    // Copying that bug is not parity.
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)

    fireEvent.click(screen.getByText('Preview / Export PDF')) // FIRST tap
    expect(screen.getByRole('alertdialog')).toHaveTextContent(MSG.address)
  })

  it('renders the document once the gate passes', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupBare(store)
    fillAddress(store)
    fillScope(store)

    fireEvent.click(screen.getByText('Preview / Export PDF'))

    expect(screen.getByTitle('Case Notes — PDF')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
