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

  it('carries no Edit Case button until P3.3 wires NewCaseModal edit mode (no dead affordance)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupDashboard(store)
    openSheet()
    expect(screen.queryByRole('button', { name: 'Edit Case' })).toBeNull()
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
