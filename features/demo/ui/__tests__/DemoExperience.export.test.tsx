import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { DemoExperience, EXPORT_STEP_MS } from '@/features/demo/ui/DemoExperience'

/**
 * P5.3 / matrix rows 25, 27, 28 — the export flow shell driven end to end through the bridge:
 * Completion's "Export Zip" → the scope chooser → the P5.1 flow machine → the progress overlay
 * → the honest terminal notice (decision D4, deferred §70k).
 */

type Store = ReturnType<typeof createDemoStore>

const SCOPE = [
  { id: 'sc-1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '' },
]

/** A location that passes `validateLocationForPdf` — case number, one full scope, and both
 *  completion fields (phone `pdf-export-service.ts:90-161`). */
function addExportableLocation(store: Store, caseId: string, locationName: string) {
  let id = ''
  act(() => {
    id = store.getState().addLocation(caseId, { locationName })
    store.getState().switchLocation(id)
    store.getState().updateField('form.scopes', SCOPE)
    store.getState().updateField('form.dateTimeCompleted', '2025-03-09 04:10:00')
    store.getState().updateField('form.completedBy', 'Det. Vega')
  })
  return id
}

/** …and one that does not: no completion fields, no scope. */
function addIncompleteLocation(store: Store, caseId: string, locationName: string) {
  let id = ''
  act(() => {
    id = store.getState().addLocation(caseId, { locationName })
  })
  return id
}

function openCompletion(store: Store, locationId: string) {
  act(() => {
    store.getState().switchLocation(locationId)
    store.getState().setView('completion')
  })
}

/** One pipeline tick. */
function step(times = 1) {
  act(() => {
    vi.advanceTimersByTime(EXPORT_STEP_MS * times)
  })
}

/** Run the pipeline to its terminal, however many steps it has. */
function runToEnd() {
  act(() => {
    vi.advanceTimersByTime(EXPORT_STEP_MS * 20)
  })
}

function chooseScope(option: 'location' | 'case' | 'cancel') {
  fireEvent.click(screen.getByText('Export Zip'))
  fireEvent.click(screen.getByTestId(`export-option-${option}`))
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('Completion — the Export Zip affordance', () => {
  it('renders between the document previews and Complete & Save, and opens the scope chooser', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const loc = addExportableLocation(store, store.getState().cases[0].id, "Kim's Convenience")
    openCompletion(store, loc)

    const cta = screen.getByText('Export Zip')
    expect(cta).toBeEnabled()

    // Document order: Preview / Export PDF → Export Zip → Complete & Save (phone FormActions).
    const body = document.body.textContent!
    expect(body.indexOf('Preview / Export PDF')).toBeLessThan(body.indexOf('Export Zip'))
    expect(body.indexOf('Export Zip')).toBeLessThan(body.indexOf('Complete & Save'))

    fireEvent.click(cta)
    expect(screen.getByRole('menu')).toHaveAccessibleName('Choose Export Scope')
    expect(store.getState().modal).toBe('exportScope')
  })

  it('offers exactly the phone’s three options, verbatim', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const loc = addExportableLocation(store, store.getState().cases[0].id, "Kim's Convenience")
    openCompletion(store, loc)
    fireEvent.click(screen.getByText('Export Zip'))

    const sheet = screen.getByTestId('export-action-sheet')
    expect(sheet).toHaveTextContent('Export This Location')
    expect(sheet).toHaveTextContent('ZIP with documents and media for current location')
    expect(sheet).toHaveTextContent('Export Full Case')
    expect(sheet).toHaveTextContent('ZIP with all locations, documents, and media')
    expect(sheet).toHaveTextContent('Cancel')
  })

  it('disables the CTA when no location is open (the ZIP has nothing to scope itself to)', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => store.getState().setView('completion'))
    expect(screen.getByText('Export Zip')).toBeDisabled()
  })

  it('Cancel closes the sheet and dispatches nothing', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const loc = addExportableLocation(store, store.getState().cases[0].id, "Kim's Convenience")
    openCompletion(store, loc)

    chooseScope('cancel')

    expect(store.getState().modal).toBeNull()
    expect(screen.queryByTestId('export-progress-overlay')).not.toBeInTheDocument()
    runToEnd()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('Export This Location — the single-location ZIP pipeline', () => {
  function setup() {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const loc = addExportableLocation(store, store.getState().cases[0].id, "Kim's Convenience")
    openCompletion(store, loc)
    return store
  }

  it('walks validating → generating → zipping, then tells the truth about the archive', () => {
    setup()
    chooseScope('location')

    // The stage flip happens in the SAME handler that starts the run (§70j) — before any timer.
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Validating locations...')

    step()
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Generating PDFs...')
    expect(screen.getByText('Location 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('"Kim\'s Convenience"')).toBeInTheDocument()

    step()
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Creating ZIP archive...')

    step()
    // Overlay gone BEFORE the notice — never a dialog saying nothing was written over a
    // progress line saying it is being written.
    expect(screen.queryByTestId('export-progress-overlay')).not.toBeInTheDocument()
    const notice = screen.getByRole('alertdialog')
    expect(notice).toHaveAccessibleName("Downloads Aren't Available in the Demo")
    expect(notice).toHaveTextContent('a ZIP of this location')
    expect(notice).toHaveTextContent('no file system, no share sheet')
  })

  it('never enters the phone’s "sharing" stage — a browser tab has no share sheet', () => {
    setup()
    chooseScope('location')
    runToEnd()
    expect(screen.queryByText('Opening share dialog...')).not.toBeInTheDocument()
  })

  it('skips the PDF pass entirely when the location cannot produce notes', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const loc = addIncompleteLocation(store, store.getState().cases[0].id, 'Rear Alley Camera')
    openCompletion(store, loc)

    chooseScope('location')
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Validating locations...')
    step()
    // Straight to zipping — the phone only emits `generating` when something validates.
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Creating ZIP archive...')
    expect(screen.queryByText(/^Location \d+ of/)).not.toBeInTheDocument()
    // …and NO validation prompt: the phone opens that only for case / case-subset runs.
    expect(screen.queryByTestId('export-validation-modal')).not.toBeInTheDocument()
  })

  it('the CTA reads "Exporting..." and is inert while a run is in flight', () => {
    setup()
    chooseScope('location')
    expect(screen.getByText('Exporting...')).toBeDisabled()
    expect(screen.queryByText('Export Zip')).not.toBeInTheDocument()
    runToEnd()
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.getByText('Export Zip')).toBeEnabled()
  })
})

describe('Export Full Case — validation passes', () => {
  it('counts every location that will get a PDF, in card order', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const caseId = store.getState().cases[0].id
    addExportableLocation(store, caseId, 'Front Counter')
    const second = addExportableLocation(store, caseId, 'Rear Alley Camera')
    openCompletion(store, second)

    chooseScope('case')
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Validating locations...')
    // No prompt: every location validates.
    expect(screen.queryByTestId('export-validation-modal')).not.toBeInTheDocument()

    step()
    expect(screen.getByText('Location 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('"Front Counter"')).toBeInTheDocument()
    step()
    expect(screen.getByText('Location 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('"Rear Alley Camera"')).toBeInTheDocument()
    step()
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Creating ZIP archive...')
    step()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('a ZIP of the whole case')
    expect(screen.getByRole('alertdialog')).toHaveTextContent('plus the interactive case map')
  })
})

describe('Export Full Case — validation finds gaps', () => {
  function setupMixed() {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const caseId = store.getState().cases[0].id
    const good = addExportableLocation(store, caseId, 'Front Counter')
    addIncompleteLocation(store, caseId, 'Rear Alley Camera')
    openCompletion(store, good)
    return store
  }

  it('stops at the prompt, names the location and every field it is missing', () => {
    setupMixed()
    chooseScope('case')

    const prompt = screen.getByTestId('export-validation-modal')
    expect(prompt).toHaveTextContent('Some Locations Missing PDF Data')
    expect(prompt).toHaveTextContent('Rear Alley Camera')
    expect(prompt).toHaveTextContent('- Missing: At least one extraction scope with start and end times')
    expect(prompt).toHaveTextContent('- Missing: Completion date')
    expect(prompt).toHaveTextContent('- Missing: Completed by')
    expect(prompt).toHaveTextContent('1 of 2 locations will include PDF notes.')
    // The prompt is a QUESTION, not progress — the stage is back at idle behind it.
    expect(screen.queryByTestId('export-progress-overlay')).not.toBeInTheDocument()
  })

  it('Cancel drops the prompt and starts nothing', () => {
    setupMixed()
    chooseScope('case')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel export' }))

    expect(screen.queryByTestId('export-validation-modal')).not.toBeInTheDocument()
    runToEnd()
    expect(screen.queryByTestId('export-progress-overlay')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('a cancelled prompt leaves nothing armed — the next run re-validates from scratch', () => {
    setupMixed()
    chooseScope('case')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel export' }))

    chooseScope('case')
    expect(screen.getByTestId('export-validation-modal')).toBeInTheDocument()
  })

  it('Continue resumes the case pipeline and generates only the valid location', () => {
    setupMixed()
    chooseScope('case')
    fireEvent.click(screen.getByRole('button', { name: 'Continue with export' }))

    // The modal close and the stage flip land in ONE write — no blank frame between them.
    expect(screen.queryByTestId('export-validation-modal')).not.toBeInTheDocument()
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Validating locations...')

    step()
    // The invalid location is skipped: one PDF, not two.
    expect(screen.getByText('Location 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('"Front Counter"')).toBeInTheDocument()
    step()
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Creating ZIP archive...')
    step()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('a ZIP of the whole case')
  })

  it('every location invalid switches to the louder framing and Export Anyway', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const caseId = store.getState().cases[0].id
    const only = addIncompleteLocation(store, caseId, 'Rear Alley Camera')
    openCompletion(store, only)

    chooseScope('case')
    const prompt = screen.getByTestId('export-validation-modal')
    expect(prompt).toHaveTextContent('All Locations Missing PDF Data')
    expect(prompt).toHaveTextContent('The ZIP will be created without any PDF notes.')

    fireEvent.click(screen.getByRole('button', { name: 'Continue with export' }))
    step()
    // Nothing to generate — the pipeline goes validating → zipping.
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Creating ZIP archive...')
    step()
    // …and the promise the prompt made ("the ZIP will be created") is answered honestly.
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName("Downloads Aren't Available in the Demo")
  })
})

describe('Export flow — guards', () => {
  it('§70i: with the validation prompt up, a second dispatch is inert', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const caseId = store.getState().cases[0].id
    const only = addIncompleteLocation(store, caseId, 'Rear Alley Camera')
    openCompletion(store, only)

    chooseScope('case')
    expect(screen.getByTestId('export-validation-modal')).toBeInTheDocument()

    // The second dispatch must be a DIFFERENT pipeline (review R-5). Re-dispatching `case`
    // proved nothing: with the guard deleted, `requestExport` re-validates and re-opens the
    // same prompt, so every assertion passed either way. `location` is a `run`-arm dispatch —
    // unguarded it walks validating → zipping → terminal notice BEHIND the open prompt, which
    // is exactly the harm §74b describes (the rail can move the visitor while the prompt is up).
    chooseScope('location')

    expect(screen.getByTestId('export-validation-modal')).toBeInTheDocument()
    expect(screen.queryByTestId('export-progress-overlay')).not.toBeInTheDocument()
    runToEnd()
    // No terminal notice — nothing ran. (The prompt itself is an alertdialog, so this has to
    // ask for the notice by name.)
    expect(
      screen.queryByRole('alertdialog', { name: "Downloads Aren't Available in the Demo" }),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('export-validation-modal')).toBeInTheDocument()
    // …and the prompt is still answerable: the refused dispatch left the arm intact.
    fireEvent.click(screen.getByRole('button', { name: 'Continue with export' }))
    expect(screen.getByTestId('export-progress-overlay')).toBeInTheDocument()
    runToEnd()
  })

  it('Continue resumes the case the prompt was ARMED for, not one re-derived at press time', () => {
    // `continueValidatedExport` takes the case id as an argument, so remembering WHICH case
    // raised the prompt is the shell's job. Re-deriving it from the open location would let a
    // prompt raised on case A export case B — scope escalation of the exact kind the machine's
    // arming rules exist to prevent, and reachable the moment P5.2's tab can arm a case that is
    // not the open location's.
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    let caseA = ''
    let caseB = ''
    act(() => {
      caseA = store.getState().createCase({ caseNumber: 'PR25-AAA', displayName: 'Case A', unit: 'Robbery' })
      caseB = store.getState().createCase({ caseNumber: 'PR25-BBB', displayName: 'Case B', unit: 'Robbery' })
    })
    const aValid = addExportableLocation(store, caseA, 'Front Counter')
    addIncompleteLocation(store, caseA, 'Rear Alley Camera') // forces the prompt
    const bValid = addExportableLocation(store, caseB, 'Plaza Office')
    openCompletion(store, aValid)

    chooseScope('case')
    expect(screen.getByTestId('export-validation-modal')).toBeInTheDocument()

    // The prompt is not view-scoped, so the open location can move underneath it.
    act(() => store.getState().switchLocation(bValid))
    fireEvent.click(screen.getByRole('button', { name: 'Continue with export' }))

    step()
    expect(screen.getByText('"Front Counter"')).toBeInTheDocument()
    expect(screen.queryByText('"Plaza Office"')).not.toBeInTheDocument()
    runToEnd()
  })

  it('an export whose case has gone raises the phone’s "no longer available" backstop', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const caseId = store.getState().cases[0].id
    const loc = addExportableLocation(store, caseId, "Kim's Convenience")
    openCompletion(store, loc)
    // The location survives with a caseId pointing at nothing — the shape the phone's Export
    // tab guards against when its list has moved on.
    act(() => {
      store.setState({ cases: [] })
    })

    chooseScope('case')
    const alert = screen.getByRole('alertdialog')
    expect(alert).toHaveAccessibleName('Export Error')
    expect(alert).toHaveTextContent('The selected case is no longer available. Re-select and try again.')
    expect(screen.queryByTestId('export-progress-overlay')).not.toBeInTheDocument()
  })

  it('the export flow is session chrome — nothing about it is persisted', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-EXP', displayName: 'Export Case', unit: 'Robbery' })
    })
    const loc = addExportableLocation(store, store.getState().cases[0].id, "Kim's Convenience")
    openCompletion(store, loc)
    chooseScope('location')

    // §70a: the machine's state lives in the bridge, never in the store.
    expect(Object.keys(store.getState())).not.toContain('exportStage')
    expect(Object.keys(store.getState())).not.toContain('exportFlow')
    runToEnd()
  })
})
