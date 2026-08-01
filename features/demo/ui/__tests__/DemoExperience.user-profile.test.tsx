import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { SNAPSHOT_KEY } from '@/features/demo/engine/store/persistence'
import { selectCaseNotesData, selectDrawerStatus } from '@/features/demo/engine/store/selectors'
import { generateCaseNotesDoc } from '@/features/demo/engine/logic/pdf/case-notes'

/**
 * The analyst profile through the bridge (P7.2, matrix rows 85/86).
 *
 * The pane's own rendering is pinned in `ui/screens/settings/__tests__/UserProfilePane.test.tsx`.
 * What is pinned here is the half only the bridge can show: the pane reaching the store, the
 * master row's live preview, refresh survival, and the Completion autofill — the whole point of
 * the feature, since that is what carries the name into the Case Notes header.
 */

const NAME = 'K. Vasilyev'

/** Open Settings from the Cases header and push the User Profile pane. */
function openProfilePane() {
  fireEvent.click(screen.getByTestId('header-settings-button'))
  fireEvent.click(screen.getByTestId('settings-row-user-profile'))
}

/** Fill the editor's name and save. */
function saveName(name: string) {
  fireEvent.click(screen.getByTestId('user-profile-section-edit-button'))
  fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: name } })
  fireEvent.click(screen.getByTestId('user-profile-save-button'))
}

/** A case + location, opened, sitting on the Completion screen. */
function setupCompletion(store: DemoStore) {
  act(() => {
    const caseId = store.getState().createCase({ caseNumber: 'PR25-PROFILE', displayName: 'Profile', unit: 'FVU' })
    const locId = store.getState().addLocation(caseId, { locationName: 'Test Location' })
    store.getState().switchLocation(locId)
    store.getState().setView('completion')
  })
}

const completedByField = () => screen.getByLabelText('Completed By')

describe('the pane through the sheet', () => {
  it('is the real pane, not the stub — and it writes the store', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    openProfilePane()

    expect(screen.getByTestId('user-profile-section-empty')).toHaveTextContent('No profile configured.')
    saveName(NAME)

    expect(store.getState().userProfile.name).toBe(NAME)
    // …and the pane flips to its configured state without leaving the sheet.
    expect(screen.getByTestId('user-profile-section-name')).toHaveTextContent(`Name: ${NAME}`)
  })

  it('updates the master row preview from the phone’s "Not set" to the live name', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByTestId('header-settings-button'))
    expect(screen.getByTestId('settings-preview-user-profile')).toHaveTextContent('Not set')

    fireEvent.click(screen.getByTestId('settings-row-user-profile'))
    saveName(`  ${NAME}  `)
    fireEvent.click(screen.getByTestId('settings-back-button'))

    expect(screen.getByTestId('settings-preview-user-profile')).toHaveTextContent(NAME)
  })

  it('keeps the profile when the sheet closes — it is store state, not sheet state', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    openProfilePane()
    saveName(NAME)

    fireEvent.click(screen.getByTestId('settings-back-button'))
    fireEvent.click(screen.getByTestId('settings-close-button'))
    openProfilePane()

    expect(screen.getByTestId('user-profile-section-name')).toHaveTextContent(`Name: ${NAME}`)
  })
})

describe('refresh survival (v7)', { timeout: 20000 }, () => {
  beforeEach(() => window.sessionStorage.clear())
  afterEach(() => window.sessionStorage.clear())

  it('a profile entered before a refresh is still there after it', () => {
    const first = render(<DemoExperience />)
    openProfilePane()
    saveName(NAME)
    fireEvent(window, new Event('pagehide')) // flush the debounced write, like a real refresh
    expect(window.sessionStorage.getItem(SNAPSHOT_KEY)).toContain(NAME)
    first.unmount()

    render(<DemoExperience />)
    openProfilePane()
    expect(screen.getByTestId('user-profile-section-name')).toHaveTextContent(`Name: ${NAME}`)
  })
})

describe('Completed By autofill (phone completion.tsx:127-134)', () => {
  it('fills the empty field on arrival at Completion', () => {
    const store = createDemoStore()
    act(() => store.getState().updateUserProfile({ name: `  ${NAME}  ` }))
    render(<DemoExperience store={store} />)
    setupCompletion(store)

    // Trimmed on the way in, exactly as the phone writes it.
    expect(completedByField()).toHaveValue(NAME)
    expect(store.getState().locations[0].form.completedBy).toBe(NAME)
  })

  it('does nothing when there is no profile name — the field stays the visitor’s', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupCompletion(store)

    expect(completedByField()).toHaveValue('')
    expect(store.getState().locations[0].form.completedBy).toBe('')
  })

  /**
   * The two tests that PIN the dependency list (review R-1a). Every other test in this block
   * either arrives with a name already present — so the empty-guard short-circuits whatever the
   * deps are — or changes the profile from a different view, which forces a `view`-driven re-run
   * that exists under any dep list. These two are the ones that redden when the deps are
   * "fixed", one per plausible fix:
   *
   *   deps + `currentLocation?.form.completedBy` → the field becomes unclearable (test 1)
   *   deps + `userProfile.name`                  → a late name fills an open screen  (test 2)
   *
   * Both mutations verified red here and green on the shipped list.
   */
  it('a CLEARED field stays cleared — adding completedBy to the deps would refill it', () => {
    const store = createDemoStore()
    act(() => store.getState().updateUserProfile({ name: NAME }))
    render(<DemoExperience store={store} />)
    setupCompletion(store)
    expect(completedByField()).toHaveValue(NAME) // autofilled on arrival…

    fireEvent.change(completedByField(), { target: { value: '' } })

    // …and deleting it is a decision the effect must not overrule while the screen is open.
    expect(completedByField()).toHaveValue('')
    expect(store.getState().locations[0].form.completedBy).toBe('')
  })

  it('a profile name set while Completion is OPEN does not fill it', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    setupCompletion(store)
    expect(completedByField()).toHaveValue('')

    act(() => store.getState().updateUserProfile({ name: NAME }))

    // The fill happens on ARRIVAL. Nothing about saving a profile reaches a screen already open.
    expect(completedByField()).toHaveValue('')
    expect(store.getState().locations[0].form.completedBy).toBe('')
  })

  it('writes NOTHING when the visitor has switched Completed By off [R-1b]', () => {
    // A write must not outlive the visibility decision that hid its field: the input is not
    // rendered, so an autofilled value could not be seen, edited or cleared — and it would still
    // reach the Case Notes document and green the drawer dot.
    const store = createDemoStore()
    act(() => {
      store.getState().updateUserProfile({ name: NAME })
      store.getState().setFormFieldVisible('completion.completedBy', false)
    })
    render(<DemoExperience store={store} />)
    setupCompletion(store)

    expect(screen.queryByLabelText('Completed By')).not.toBeInTheDocument()
    expect(store.getState().locations[0].form.completedBy).toBe('')
    // …so the court document does not carry a name the visitor never saw.
    expect(generateCaseNotesDoc(selectCaseNotesData(store.getState()))).not.toContain(NAME)
    // …and the drawer dot is not greened by an invisible write.
    expect(selectDrawerStatus(store.getState().locations[0], store.getState()).completion).not.toBe('complete')
  })

  it('fills again once the field is switched back on — hiding suppresses, it does not disable', () => {
    const store = createDemoStore()
    act(() => {
      store.getState().updateUserProfile({ name: NAME })
      store.getState().setFormFieldVisible('completion.completedBy', false)
    })
    render(<DemoExperience store={store} />)
    setupCompletion(store)
    expect(store.getState().locations[0].form.completedBy).toBe('')

    // Separate acts: React commits between them, so `view` genuinely leaves 'completion' and
    // comes back. Batched into one, the dep never changes and the arrival never happens.
    act(() => {
      store.getState().setFormFieldVisible('completion.completedBy', true)
      store.getState().setView('cases')
    })
    act(() => store.getState().setView('completion'))
    expect(completedByField()).toHaveValue(NAME)
  })

  it('treats a whitespace-only name as no name', () => {
    const store = createDemoStore()
    act(() => store.getState().updateUserProfile({ name: '   ' }))
    render(<DemoExperience store={store} />)
    setupCompletion(store)

    expect(completedByField()).toHaveValue('')
  })

  it('never overwrites a value that is already there', () => {
    const store = createDemoStore()
    act(() => store.getState().updateUserProfile({ name: NAME }))
    render(<DemoExperience store={store} />)
    act(() => {
      const caseId = store.getState().createCase({ caseNumber: 'PR25-PRIOR', displayName: 'Prior', unit: 'FVU' })
      const locId = store.getState().addLocation(caseId, { locationName: 'Test Location' })
      store.getState().switchLocation(locId)
      store.getState().updateField('form.completedBy', 'D. Osei')
      store.getState().setView('completion')
    })

    expect(completedByField()).toHaveValue('D. Osei')
  })

  it('a typed override survives — the autofill does not chase the field', () => {
    const store = createDemoStore()
    act(() => store.getState().updateUserProfile({ name: NAME }))
    render(<DemoExperience store={store} />)
    setupCompletion(store)

    fireEvent.change(completedByField(), { target: { value: 'D. Osei' } })
    expect(completedByField()).toHaveValue('D. Osei')
    // A store change that re-renders the bridge must not re-run the fill.
    act(() => store.getState().updateField('form.dateTimeCompleted', '2025-03-09 12:00:00'))
    expect(completedByField()).toHaveValue('D. Osei')
  })

  it('does not rewrite a location that already carries a name when the profile changes later', () => {
    // Phone `user-profile/README.md`, workflow step 4: "editing the profile later does not
    // retroactively change completedBy on existing Locations".
    const store = createDemoStore()
    act(() => store.getState().updateUserProfile({ name: NAME }))
    render(<DemoExperience store={store} />)
    setupCompletion(store)
    expect(completedByField()).toHaveValue(NAME)

    act(() => {
      store.getState().setView('cases')
      store.getState().updateUserProfile({ name: 'Someone Else' })
      store.getState().setView('completion')
    })
    expect(completedByField()).toHaveValue(NAME)
  })

  it('fills a SECOND location on its own arrival — the fill is per location, not per session', () => {
    const store = createDemoStore()
    act(() => store.getState().updateUserProfile({ name: NAME }))
    render(<DemoExperience store={store} />)
    setupCompletion(store)

    let second = ''
    act(() => {
      second = store.getState().addLocation(store.getState().cases[0].id, { locationName: 'Second Location' })
      store.getState().switchLocation(second)
      store.getState().setView('completion')
    })
    expect(store.getState().locations.find((l) => l.id === second)?.form.completedBy).toBe(NAME)
  })

  it('carries the name all the way into the Case Notes document', () => {
    // The whole point of the autofill. Asserted on the generated HTML rather than the on-screen
    // field: the profile's job is finished only when the court document says the name.
    const store = createDemoStore()
    act(() => store.getState().updateUserProfile({ name: NAME }))
    render(<DemoExperience store={store} />)
    setupCompletion(store)

    const html = generateCaseNotesDoc(selectCaseNotesData(store.getState()))
    expect(html).toContain('Completion Information')
    expect(html).toContain('Completed By:')
    expect(html).toContain(NAME)
  })
})
