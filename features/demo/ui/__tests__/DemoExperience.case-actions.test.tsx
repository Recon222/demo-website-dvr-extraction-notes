import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'

/**
 * P3.2 (matrix rows 8/9) — the dashboard's Case Actions Sheet through the real bridge:
 * the long-press entry, the status actions, and the boundaries the phone gets for free from
 * a native pageSheet (nothing navigates under it) that the demo's rail can otherwise break.
 */

type Store = ReturnType<typeof createDemoStore>

/** The phone's `delayLongPress` (DashboardCaseCard.tsx:169). */
const LONG_PRESS = 500

function setupDashboard(store: Store, caseNumber = 'PR25-0001') {
  let caseId = ''
  act(() => {
    caseId = store.getState().createCase({
      caseNumber,
      displayName: 'Dash Case',
      unit: 'Robbery',
      oicName: 'L. McHugh',
      oicBadge: '4471',
    })
    store.getState().addLocation(caseId, { locationName: "Kim's Convenience", streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' })
    store.getState().setView('dashboard')
  })
  return caseId
}

const openSheet = (caseNumber = 'PR25-0001') =>
  fireEvent.click(screen.getByRole('button', { name: `Case actions for ${caseNumber}` }))

const statusOf = (store: Store, caseId: string) => store.getState().cases.find((c) => c.id === caseId)?.status

afterEach(() => {
  vi.useRealTimers()
})

describe('Case Actions Sheet — opening', () => {
  it('a 500ms hold on a dashboard card opens the sheet for THAT case', () => {
    vi.useFakeTimers()
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    const caseId = setupDashboard(store)

    const card = document.querySelector(`[data-case-card="${caseId}"]`) as HTMLElement
    fireEvent.pointerDown(card, { button: 0 })
    act(() => void vi.advanceTimersByTime(LONG_PRESS))

    expect(screen.getByRole('dialog', { name: 'PR25-0001' })).toBeInTheDocument()
    expect(screen.getByText('Status: Active')).toBeInTheDocument()
    // The report reads off the live case record.
    expect(screen.getByText('L. McHugh · #4471')).toBeInTheDocument()
    expect(screen.getByText('Locations')).toBeInTheDocument()
  })

  it('Cancel dismisses without touching the case', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    const caseId = setupDashboard(store)

    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'PR25-0001' })).toBeNull()
    expect(statusOf(store, caseId)).toBe('draft')
  })
})

describe('Case Actions Sheet — status actions', () => {
  it('Complete Case closes the sheet, greens the card, and stamps NO location', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    const caseId = setupDashboard(store)

    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Complete Case' }))

    expect(screen.queryByRole('dialog', { name: 'PR25-0001' })).toBeNull()
    expect(statusOf(store, caseId)).toBe('complete')
    // The location's own completion gate is untouched — the dashboard never had one open.
    expect(store.getState().locations[0].form.completed).toBe(false)
    // The card's badge follows the store immediately (no refetch, hence no toast).
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('Archive then Reopen walks the case back to draft, offering the right actions each time', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    const caseId = setupDashboard(store)

    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Archive Case' }))
    expect(statusOf(store, caseId)).toBe('archived')

    openSheet()
    // An archived case offers Reopen only — no Complete, no second Archive.
    expect(screen.queryByRole('button', { name: 'Complete Case' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Archive Case' })).toBeNull()
    expect(screen.getByText('Status: archived')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reopen Case' }))
    expect(statusOf(store, caseId)).toBe('draft')

    openSheet()
    expect(screen.getByRole('button', { name: 'Complete Case' })).toBeInTheDocument()
  })

  it('acts on the long-pressed case, not the selected one', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    const first = setupDashboard(store, 'PR25-0001')
    const second = setupDashboard(store, 'PR25-0002') // createCase also makes this the current case

    openSheet('PR25-0001')
    fireEvent.click(screen.getByRole('button', { name: 'Complete Case' }))

    expect(statusOf(store, first)).toBe('complete')
    expect(statusOf(store, second)).toBe('draft')
  })

  /**
   * The §50e END-TO-END edit test, owed by whichever package wired the first entry — this one
   * (P3 assembly). P3.3 shipped the modal's edit mode, the `caseFormData` mapper, `updateCase`
   * and the immutability rule, each covered on its own; nothing covered the COMPOSITION,
   * because `DemoExperience.editCase` had no caller until §49a's seam was wired here.
   *
   * The whole round trip, in one arm: open the sheet → Edit Case → the form comes up SEEDED
   * from the stored case → change a field → Save Changes → the patch lands on the case and the
   * case number is untouched.
   */
  it('Edit Case → seeded form → Save Changes patches the case, number immutable (§50e)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    const caseId = setupDashboard(store)

    openSheet()
    // §49a's honest-rule consequence: the button renders now that it can do what it says.
    // Its position (first, as on the phone) is pinned at component level in
    // `CaseActionsSheet.test.tsx` — "renders Edit Case FIRST when the bridge supplies onEdit".
    expect(screen.getByRole('button', { name: 'Edit Case' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Case' }))

    // The sheet closed and the editor opened in EDIT mode, seeded through the shared mapper.
    expect(screen.queryByRole('dialog', { name: 'PR25-0001' })).toBeNull()
    const caseNumber = screen.getByLabelText('Case Number') as HTMLInputElement
    expect(caseNumber.value).toBe('PR25-0001')
    expect(caseNumber).toHaveAttribute('readonly') // immutable after create
    const displayName = screen.getByLabelText('Display Name') as HTMLInputElement
    expect(displayName.value).toBe('Dash Case') // seeded, not blank
    expect((screen.getByLabelText('OIC Name') as HTMLInputElement).value).toBe('L. McHugh')

    fireEvent.change(displayName, { target: { value: 'Dash Case (amended)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    const saved = store.getState().cases.find((c) => c.id === caseId)!
    expect(saved.displayName).toBe('Dash Case (amended)')
    expect(saved.caseNumber).toBe('PR25-0001') // never rewritten by an edit
    expect(saved.oicName).toBe('L. McHugh') // untouched fields survive the total payload
    expect(saved.status).toBe('draft') // edit is not a status move
    // One case, not two — the edit submit must never fall through to create.
    expect(store.getState().cases).toHaveLength(1)
    expect(store.getState().modal).toBeNull()
  })

  it('a second Edit opens on the case just long-pressed, not the previous one', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupDashboard(store, 'PR25-0001')
    setupDashboard(store, 'PR25-0002')

    openSheet('PR25-0001')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Case' }))
    expect((screen.getByLabelText('Case Number') as HTMLInputElement).value).toBe('PR25-0001')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    openSheet('PR25-0002')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Case' }))
    expect((screen.getByLabelText('Case Number') as HTMLInputElement).value).toBe('PR25-0002')
  })

  it('Cancel leaves create mode behind it — the next New Case opens blank', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupDashboard(store)

    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Case' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    act(() => void store.getState().openModal('newCase'))
    // `closeCaseModal` clears the edit target, so this is the CREATE sheet: an editable,
    // blank case number and a Create Case action.
    const caseNumber = screen.getByLabelText('Case Number') as HTMLInputElement
    expect(caseNumber.value).toBe('')
    expect(caseNumber).not.toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Create Case' })).toBeInTheDocument()
  })
})

describe('Case Actions Sheet — it never outlives the dashboard', () => {
  it('closes when the rail jumps the phone to another screen', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupDashboard(store)

    openSheet()
    expect(screen.getByRole('dialog', { name: 'PR25-0001' })).toBeInTheDocument()

    act(() => store.getState().setView('map'))
    expect(screen.queryByRole('dialog', { name: 'PR25-0001' })).toBeNull()
  })

  it('Escape dismisses it, like every other overlay in the phone frame', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupDashboard(store)

    openSheet()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'PR25-0001' })).toBeNull()
  })
})

describe('Dashboard — the 5-recent cap through the bridge', () => {
  it('shows the five newest cases; older ones stay on the Cases tab', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      for (let i = 1; i <= 7; i++) {
        store.getState().createCase({ caseNumber: `PR25-000${i}`, displayName: '', unit: 'Robbery' })
      }
      store.getState().setView('dashboard')
    })

    // createCase prepends, so 7..3 are the five most recent.
    for (const n of [7, 6, 5, 4, 3]) expect(screen.getByText(`PR25-000${n}`)).toBeInTheDocument()
    for (const n of [2, 1]) expect(screen.queryByText(`PR25-000${n}`)).toBeNull()

    act(() => store.getState().setView('cases'))
    expect(screen.getByText('PR25-0001')).toBeInTheDocument()
  })
})
