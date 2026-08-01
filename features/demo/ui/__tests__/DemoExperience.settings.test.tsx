import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { MODAL_NARRATION } from '@/features/demo/engine/content/narration'
import { snapshotOf } from '@/features/demo/engine/store/persistence'

/**
 * P7.1 — the Settings surface through the bridge (matrix rows 81–84 + 87–93 + A1, decision D6).
 *
 * The component suites (`ui/screens/settings/__tests__/`) pin what the sheet and the panes
 * RENDER. What is pinned here is the half only the bridge can show: the gear entry points on
 * both tab headers, the modal-id registration in all four of its places, the settings state
 * living in bridge state rather than the store, and the rail following the open sheet.
 */

function seedWithCase(): DemoStore {
  const store = createDemoStore()
  act(() => {
    store.getState().createCase({ caseNumber: 'PR25-S', displayName: 'Settings', unit: 'FVU' })
  })
  return store
}

function openFromCases(store: DemoStore) {
  render(<DemoExperience store={store} />)
  fireEvent.click(screen.getByTestId('header-settings-button'))
}

describe('Settings entry points (phone MainHeader gear on BOTH tab headers)', () => {
  it('opens from the Cases header', () => {
    const store = createDemoStore()
    openFromCases(store)
    expect(store.getState().modal).toBe('settings')
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })

  it('opens from the Dashboard header too — the phone wires both (home.tsx:350, cases.tsx:1019)', () => {
    const store = createDemoStore()
    act(() => store.getState().setView('dashboard'))
    render(<DemoExperience store={store} />)

    fireEvent.click(screen.getByTestId('header-settings-button'))
    expect(store.getState().modal).toBe('settings')
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })

  it('keeps the New Case button beside the gear on Cases, and only there', () => {
    const cases = createDemoStore()
    const { unmount } = render(<DemoExperience store={cases} />)
    expect(screen.getByRole('button', { name: 'New case' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument()
    // Separate MOUNTS, not a setView: `ScreenStage` runs AnimatePresence in `mode="sync"`, so
    // the outgoing screen stays in the DOM through its exit animation and a queryBy would still
    // find the Cases header's button for reasons that have nothing to do with this assertion.
    unmount()

    const dashboard = createDemoStore()
    act(() => dashboard.getState().setView('dashboard'))
    render(<DemoExperience store={dashboard} />)
    // Phone parity: `onNewCasePress` is omitted on the Dashboard header, so its button is not
    // rendered at all (`MainHeader.tsx:51`), while the gear is on both.
    expect(screen.queryByRole('button', { name: 'New case' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeInTheDocument()
  })

  it('closes back to the tab it was opened from, clearing the modal id', () => {
    const store = createDemoStore()
    openFromCases(store)
    fireEvent.click(screen.getByTestId('settings-close-button'))

    expect(store.getState().modal).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument()
    expect(store.getState().view).toBe('cases')
  })
})

describe('modal-id registration (the §59e lesson: all of it, or none of it)', () => {
  it('records the visit under its own id, so the snapshot guard accepts it', () => {
    const store = createDemoStore()
    openFromCases(store)
    expect(store.getState().visited.settings).toBe(true)
  })

  it('survives a snapshot round-trip — MODAL_IDS knows the key', () => {
    // `visited` is validated against MODAL_IDS on rehydrate; an unregistered id is dropped
    // silently, which would unlight the rail row after a refresh.
    const store = createDemoStore()
    openFromCases(store)
    const snapshot = snapshotOf(store.getState())
    expect(snapshot.visited.settings).toBe(true)

    const restored = createDemoStore(snapshot)
    expect(restored.getState().visited.settings).toBe(true)
  })

  it('is NOT itself persisted — an open sheet never survives a refresh', () => {
    // `modal` is excluded from `snapshotOf` by explicit pick; the sheet is chrome, and a tab
    // that reopened straight into Settings would be restoring a gesture, not state.
    const store = createDemoStore()
    openFromCases(store)
    expect('modal' in snapshotOf(store.getState())).toBe(false)
  })

  it('drives the rail with its own narration while it is open', () => {
    const store = createDemoStore()
    openFromCases(store)
    const copy = MODAL_NARRATION.settings
    expect(copy, 'MODAL_NARRATION.settings missing — the rail would fall back to the chapter').toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: copy!.title })).toBeInTheDocument()
  })

  it('lights its exploration-manifest row, and makes it the active one while open', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    // The rail row exists before the sheet is ever opened, unvisited.
    expect(screen.getByRole('button', { name: 'Settings, not visited yet' })).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('header-settings-button'))

    expect(store.getState().visited.settings).toBe(true)
    const row = screen.getByRole('button', { name: 'Settings, visited' })
    // The manifest anchor prefers the OPEN MODAL, so this row is the active one while the
    // sheet is up — the same treatment the other modal rows get.
    expect(row).toHaveAttribute('data-explore-active')
  })
})

describe('settings state lives in the bridge (deferred §80c)', () => {
  it('a change survives closing and reopening the sheet within the session', () => {
    const store = seedWithCase()
    openFromCases(store)

    fireEvent.click(screen.getByTestId('settings-row-time-sync'))
    // Toggle something cheap and observable on a different pane instead: the media pane's
    // shutter switch, reached after going back.
    fireEvent.click(screen.getByTestId('settings-back-button'))
    fireEvent.click(screen.getByTestId('settings-row-media-capture'))
    fireEvent.click(screen.getByRole('switch', { name: 'Enable shutter sound' }))
    expect(screen.getByText(/Silent capture may not be legal/)).toBeInTheDocument()

    // Close the whole sheet and reopen: the value is bridge state, not sheet state.
    fireEvent.click(screen.getByTestId('settings-back-button'))
    fireEvent.click(screen.getByTestId('settings-close-button'))
    fireEvent.click(screen.getByTestId('header-settings-button'))
    fireEvent.click(screen.getByTestId('settings-row-media-capture'))
    expect(screen.getByRole('switch', { name: 'Enable shutter sound' })).toHaveAttribute('aria-checked', 'false')
  })

  it('updates the master row preview as the value changes', () => {
    const store = createDemoStore()
    openFromCases(store)
    expect(screen.getByTestId('settings-preview-media-capture')).toHaveTextContent('1080p')

    fireEvent.click(screen.getByTestId('settings-row-media-capture'))
    const group = screen.getByRole('group', { name: 'Video Quality' })
    fireEvent.click(within(group).getByRole('button'))
    fireEvent.click(screen.getByRole('menuitemradio', { name: /4K UHD/ }))
    fireEvent.click(screen.getByTestId('settings-back-button'))

    // The row abbreviates 2160p to 4K, exactly as the phone's own second string table does.
    expect(screen.getByTestId('settings-preview-media-capture')).toHaveTextContent('4K')
  })

  it('R-19: the Export Security row keeps its claim withdrawn whatever the switches say', () => {
    const store = createDemoStore()
    openFromCases(store)
    expect(screen.getByTestId('settings-preview-export-security')).toHaveTextContent('Not applied')

    fireEvent.click(screen.getByTestId('settings-row-export-security'))
    fireEvent.click(screen.getByRole('switch', { name: 'Encrypt ZIP exports (case, location)' }))
    fireEvent.click(screen.getByTestId('settings-back-button'))

    // The switch moved (D6's cosmetic arm, and the pane's reveal is real); the ROW still refuses
    // to claim the export is protected, because it is not.
    expect(screen.getByTestId('settings-preview-export-security')).toHaveTextContent('Not applied')
  })

  it('never writes settings into the store (the whole record is bridge-local)', () => {
    const store = createDemoStore()
    openFromCases(store)
    const before = store.getState()

    fireEvent.click(screen.getByTestId('settings-row-location'))
    fireEvent.click(screen.getByRole('switch', { name: 'Show accuracy warnings' }))

    // Identity, not a deep compare: a settings write anywhere in the store would replace it.
    expect(store.getState()).toBe(before)
  })

  it('SEAM(P7.3): the Form Fields preview reads the store’s live profile, not a literal', () => {
    const store = createDemoStore()
    openFromCases(store)
    expect(screen.getByTestId('settings-preview-form-customization')).toHaveTextContent('Forensic')
  })
})
