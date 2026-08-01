import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { EXPORT_NARRATION } from '@/features/demo/engine/content/narration'
import { DemoExperience, EXPORT_STEP_MS } from '@/features/demo/ui/DemoExperience'

/**
 * P5.2 — the Export tab end to end through the bridge (matrix rows 7/24 + G7, ui-mapping 04).
 *
 * What matters here is the wiring the components can't prove on their own: that the selection
 * is bridge-local and ephemeral, that it is pruned against live store data on READ, that the
 * footer and the CTA read the SAME engine decision, and that the not-yet-built export RUN says
 * so out loud (the SEAM(P5.3) handoff) rather than pretending.
 */

// Generous suite timeout, matching the sibling full-experience suites (R-6): these renders are
// heavy under jsdom and this file runs alongside others under CPU contention.
const TIMEOUT = { timeout: 20000 }

/** A case with `count` locations, opened on the Export tab. */
function seed(count: number, caseNumber = 'PR25-0001'): DemoStore {
  const store = createDemoStore()
  act(() => {
    const caseId = store.getState().createCase({ caseNumber, displayName: 'Alpha', unit: 'VRU' })
    for (let i = 1; i <= count; i++) {
      store.getState().addLocation(caseId, { locationName: `Location ${i}`, streetAddress: `${i} Main St`, city: 'Brampton' })
    }
  })
  return store
}

/** One scope + both completion fields — what `validateLocationForPdf` needs to pass (lifted
 *  from `DemoExperience.export.test.tsx:20-30`, the P5.3 suite's own recipe). */
const SCOPE = [
  { id: 'sc-1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '' },
]

/** A case whose `count` locations all VALIDATE, so a dispatch runs the pipeline instead of
 *  stopping at the validation prompt (which is what `seed` above is for). */
function seedExportable(count: number, caseNumber = 'PR25-0001'): DemoStore {
  const store = createDemoStore()
  act(() => {
    const caseId = store.getState().createCase({ caseNumber, displayName: 'Alpha', unit: 'VRU' })
    for (let i = 1; i <= count; i++) {
      const id = store.getState().addLocation(caseId, { locationName: `Location ${i}`, streetAddress: `${i} Main St`, city: 'Brampton' })
      store.getState().switchLocation(id)
      store.getState().updateField('form.scopes', SCOPE)
      store.getState().updateField('form.dateTimeCompleted', '2025-03-09 04:10:00')
      store.getState().updateField('form.completedBy', 'Det. Vega')
    }
  })
  return store
}

/** One pipeline tick / run it to its terminal (the P5.3 suite's pair). */
const step = (times = 1) => act(() => void vi.advanceTimersByTime(EXPORT_STEP_MS * times))
const runToEnd = () => act(() => void vi.advanceTimersByTime(EXPORT_STEP_MS * 20))

const openExportTab = () => fireEvent.click(screen.getByLabelText('Export'))
const caseHeader = (caseNumber: string) => screen.getByRole('button', { name: `Case ${caseNumber}` })
const caseCheckbox = (caseNumber: string) => screen.getByRole('checkbox', { name: `Select all locations in ${caseNumber}` })
const locationRow = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` })

describe('DemoExperience — Export tab wiring', TIMEOUT, () => {
  it('opens the hub from the 4th tab and keeps the tab bar reachable', () => {
    const store = seed(2)
    render(<DemoExperience store={store} />)
    openExportTab()
    expect(store.getState().view).toBe('export')
    expect(document.querySelector('[data-export-hub]')).toBeInTheDocument()
    // Not a trap: the other tabs are still there.
    fireEvent.click(screen.getByLabelText('Cases'))
    expect(store.getState().view).toBe('cases')
  })

  it('shows the export narration on the rail (a tab destination, not a chapter)', () => {
    const store = seed(1)
    render(<DemoExperience store={store} />)
    openExportTab()
    expect(screen.getByText(EXPORT_NARRATION.title)).toBeInTheDocument()
    // A tab-only view never becomes the chapter the wizard would resume from.
    expect(store.getState().currentChapter).not.toBe('export')
  })

  it('says "No cases to export" with an empty store', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    openExportTab()
    expect(screen.getByText('No cases to export')).toBeInTheDocument()
  })
})

describe('DemoExperience — Export selection', TIMEOUT, () => {
  it('arms the whole case from the header checkbox and names the canonical artifact', () => {
    render(<DemoExperience store={seed(2)} />)
    openExportTab()
    fireEvent.click(caseCheckbox('PR25-0001'))
    expect(screen.getByText('CASE ZIP · CANONICAL · INCLUDES CASE MAP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export Full Case (2 locations)' })).toBeInTheDocument()
    expect(screen.getByText('2 of 2 locations selected')).toBeInTheDocument()
    // Arming also surfaces the case (the accordion's "raised focus" beat).
    expect(locationRow('Location 1')).toBeInTheDocument()
  })

  it('keeps a hand-built single-location pick a FLAT export, unlike the same set armed by gesture', () => {
    // The N=1 collision the engine's `armedFullCase` exists to resolve, driven through the UI.
    render(<DemoExperience store={seed(1)} />)
    openExportTab()
    fireEvent.click(caseHeader('PR25-0001'))
    fireEvent.click(locationRow('Location 1'))
    expect(screen.getByRole('button', { name: 'Export 1 Location' })).toBeInTheDocument()
    expect(screen.getByText('LOCATION ZIP · SINGLE LOCATION')).toBeInTheDocument()

    // Same one location, armed from the case checkbox instead: the canonical package. (The
    // checkbox reads 'all' at this point, so a press there would CLEAR — start from empty, the
    // way an operator who meant "the whole case" would.)
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    fireEvent.click(caseCheckbox('PR25-0001'))
    expect(screen.getByRole('button', { name: 'Export Full Case (1 location)' })).toBeInTheDocument()
    expect(screen.getByText('CASE ZIP · CANONICAL · INCLUDES CASE MAP')).toBeInTheDocument()
  })

  it('clears the case when its checkbox is pressed with everything already selected', () => {
    render(<DemoExperience store={seed(2)} />)
    openExportTab()
    fireEvent.click(caseCheckbox('PR25-0001'))
    expect(caseCheckbox('PR25-0001')).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(caseCheckbox('PR25-0001'))
    expect(caseCheckbox('PR25-0001')).toHaveAttribute('aria-checked', 'false')
    expect(document.querySelector('[data-export-footer]')).toBeNull()
  })

  it('builds a partial subset from location rows', () => {
    render(<DemoExperience store={seed(3)} />)
    openExportTab()
    fireEvent.click(caseHeader('PR25-0001'))
    fireEvent.click(locationRow('Location 1'))
    fireEvent.click(locationRow('Location 3'))
    expect(screen.getByText('SUBSET ZIP · PARTIAL · 2 OF 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export 2 of 3 Locations' })).toBeInTheDocument()
  })

  it('replaces the selection when a location in another case is ticked (one-case rule)', () => {
    const store = seed(2)
    act(() => {
      const other = store.getState().createCase({ caseNumber: 'PR25-0002', displayName: 'Bravo', unit: 'VRU' })
      store.getState().addLocation(other, { locationName: 'Dock', streetAddress: '9 Rear Ln', city: 'Brampton' })
    })
    render(<DemoExperience store={store} />)
    openExportTab()
    fireEvent.click(caseCheckbox('PR25-0001'))
    fireEvent.click(caseHeader('PR25-0002'))
    fireEvent.click(locationRow('Dock'))
    // The footer's case number is the indicator that the whole selection moved.
    expect(screen.getByRole('button', { name: 'Export 1 Location' })).toBeInTheDocument()
    expect(screen.getByText('1 of 1 location selected')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select all locations in PR25-0001' })).toHaveAttribute('aria-checked', 'false')
  })

  it('clears the selection, footer and all', () => {
    render(<DemoExperience store={seed(2)} />)
    openExportTab()
    fireEvent.click(caseCheckbox('PR25-0001'))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(document.querySelector('[data-export-footer]')).toBeNull()
  })

  it('prunes a deleted location out of the armed selection on the next read', () => {
    const store = seed(3)
    render(<DemoExperience store={store} />)
    openExportTab()
    fireEvent.click(caseHeader('PR25-0001'))
    fireEvent.click(locationRow('Location 1'))
    fireEvent.click(locationRow('Location 2'))
    expect(screen.getByText('2 of 3 locations selected')).toBeInTheDocument()

    const doomed = store.getState().locations.find((l) => l.locationName === 'Location 2')!
    act(() => store.getState().deleteLocation(doomed.id))
    // Dropped from the set AND from the denominator — no ghost row, no stale count.
    expect(screen.getByText('1 of 2 locations selected')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Select Location 2' })).toBeNull()
  })

  it('drops the footer entirely when the armed case is deleted', () => {
    const store = seed(2)
    render(<DemoExperience store={store} />)
    openExportTab()
    fireEvent.click(caseCheckbox('PR25-0001'))
    const armed = store.getState().cases[0]
    act(() => store.getState().deleteCase(armed.id))
    expect(document.querySelector('[data-export-footer]')).toBeNull()
    expect(screen.getByText('No cases to export')).toBeInTheDocument()
  })

  it('keeps the selection out of the session snapshot — it is tab-local, like the map viewer case', () => {
    const store = seed(2)
    render(<DemoExperience store={store} />)
    openExportTab()
    fireEvent.click(caseCheckbox('PR25-0001'))
    // Nothing selection-shaped reaches the store; the export selection is bridge `useState`.
    expect(JSON.stringify(store.getState())).not.toContain('armedFullCase')
  })
})

describe('DemoExperience — the P5.2/P5.3 seam, closed: the CTA runs the real flow', TIMEOUT, () => {
  // Fake timers scoped to this block only: the pipeline is `setTimeout`-driven, and the
  // selection tests above are pure `fireEvent` — no reason to freeze their clock too.
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  /**
   * R-4: the seam has four moving parts and only the `case` arm was pinned, so three
   * scope-changing mutations ran full-suite green — a subset dispatching the whole case (the
   * §74l escalation), a dead single-location arm, and a reverted disabled-during-run treatment.
   * The three tests below are those mutations' obituaries; they are what makes R-3's switch
   * mean something at runtime as well as at compile time.
   */

  it('dispatches the SUBSET arm with exactly the ticked locations — not the whole case', () => {
    render(<DemoExperience store={seedExportable(3)} />)
    openExportTab()
    fireEvent.click(caseHeader('PR25-0001'))
    fireEvent.click(locationRow('Location 1'))
    fireEvent.click(locationRow('Location 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Export 2 of 3 Locations' }))

    // The PDF pass is scoped to the selection: two locations, k-of-n counted against 2, not 3.
    step()
    expect(screen.getByText('Location 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('"Location 1"')).toBeInTheDocument()
    step()
    expect(screen.getByText('Location 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('"Location 2"')).toBeInTheDocument()
    // The unticked location is never named by the pipeline (a `case` dispatch would name it).
    expect(screen.queryByText('"Location 3"')).not.toBeInTheDocument()

    runToEnd()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('a ZIP of the 2 selected locations')
  })

  it('dispatches the SINGLE-LOCATION arm — a live pipeline, not a dead button', () => {
    render(<DemoExperience store={seedExportable(2)} />)
    openExportTab()
    fireEvent.click(caseHeader('PR25-0001'))
    fireEvent.click(locationRow('Location 2'))
    fireEvent.click(screen.getByRole('button', { name: 'Export 1 Location' }))

    step()
    expect(screen.getByText('Location 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('"Location 2"')).toBeInTheDocument()

    runToEnd()
    const terminal = screen.getByRole('alertdialog')
    expect(terminal).toHaveTextContent('a ZIP of this location')
    expect(terminal).not.toHaveTextContent('whole case')
  })

  it('locks the hub while a run is in flight — every checkbox and the CTA, but never Clear', () => {
    render(<DemoExperience store={seedExportable(2)} />)
    openExportTab()
    fireEvent.click(caseCheckbox('PR25-0001'))
    const cta = screen.getByRole('button', { name: 'Export Full Case (2 locations)' })
    expect(cta).toBeEnabled()

    fireEvent.click(cta)
    step()
    expect(caseCheckbox('PR25-0001')).toBeDisabled()
    expect(locationRow('Location 1')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export Full Case (2 locations)' })).toBeDisabled()
    // Phone parity, ported as observed (§73g): Clear alone is not gated on the run.
    expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled()

    // …and the lock lifts when the pipeline reaches its terminal.
    runToEnd()
    expect(caseCheckbox('PR25-0001')).toBeEnabled()
  })

  it('dispatches the footer plan into the export flow instead of a placeholder notice', () => {
    render(<DemoExperience store={seed(2)} />)
    openExportTab()
    fireEvent.click(caseCheckbox('PR25-0001'))
    fireEvent.click(screen.getByRole('button', { name: 'Export Full Case (2 locations)' }))
    // The interim answer is gone — the press enters the machine. This seed's bare locations
    // all fail PDF validation, so the gate it meets is the validation prompt's all-invalid
    // arm; the continue control's accessible name is its aria-label, not the visible label.
    expect(screen.queryByText(/isn't available yet/)).not.toBeInTheDocument()
    expect(screen.getByText('All Locations Missing PDF Data')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with export' })).toBeInTheDocument()
  })
})
