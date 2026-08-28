import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { snapshotOf } from '@/features/demo/engine/store/persistence'

/**
 * P7.3 — Form Fields through the bridge (matrix A2, decision D9).
 *
 * The pane suite pins what the grid RENDERS; this pins the half only the bridge can show: the
 * pane is store-connected (a toggle reaches the store and the store reaches the pane back), the
 * profile confirm is the demo's blocking dialog rather than the phone's `Alert.alert`, the
 * master row's preview follows the live profile, and the whole thing rides the snapshot.
 */

function openFormFields(store: DemoStore) {
  render(<DemoExperience store={store} />)
  fireEvent.click(screen.getByTestId('header-settings-button'))
  fireEvent.click(screen.getByTestId('settings-row-form-customization'))
  return screen.getByTestId('settings-pane-form-customization')
}

describe('the pane is wired to the store', () => {
  it('opens on the live profile', () => {
    const store = createDemoStore()
    act(() => store.getState().applyFormProfile('canvas'))
    openFormFields(store)
    expect(screen.getByTestId('fc-profile-canvas')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('fc-screen-toggle-cameras')).toHaveAttribute('aria-checked', 'false')
  })

  it('writes a screen toggle through to the store and back to the switch', () => {
    const store = createDemoStore()
    openFormFields(store)
    const sw = screen.getByTestId('fc-screen-toggle-cameras')
    expect(sw).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(sw)
    expect(store.getState().formOverrides.steps.cameras).toBe(false)
    expect(screen.getByTestId('fc-screen-toggle-cameras')).toHaveAttribute('aria-checked', 'false')
  })

  it('writes a field toggle, and shows the group moving with it', () => {
    const store = createDemoStore()
    openFormFields(store)
    fireEvent.click(screen.getByTestId('fc-group-submission'))
    fireEvent.click(screen.getByTestId('fc-toggle-submission.latitude'))

    expect(store.getState().formOverrides.fields).toEqual({
      'submission.latitude': false,
      'submission.longitude': false,
      'submission.coordinateAccuracy': false,
      'submission.coordinateSource': false,
    })
    expect(screen.getByTestId('fc-toggle-submission.coordinateSource')).toHaveAttribute('aria-checked', 'false')
  })

  it('shows the auto-hide cascade land on the screen row itself', () => {
    const store = createDemoStore()
    openFormFields(store)
    fireEvent.click(screen.getByTestId('fc-group-arrivalDeparture'))
    fireEvent.click(screen.getByTestId('fc-toggle-arrival.arrivalDateTime'))
    fireEvent.click(screen.getByTestId('fc-toggle-arrival.departureDateTime'))
    // The last field went off, so the screen went with it — and the row says so.
    expect(screen.getByTestId('fc-screen-toggle-arrivalDeparture')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('fc-body-arrivalDeparture')).toHaveTextContent('This screen is hidden.')
  })
})

describe('applying a profile', () => {
  it('applies straight away when there is nothing to lose', () => {
    const store = createDemoStore()
    openFormFields(store)
    fireEvent.click(screen.getByTestId('fc-profile-canvas'))
    expect(store.getState().profile).toBe('canvas')
    expect(screen.queryByText('Apply profile?')).not.toBeInTheDocument()
  })

  it('confirms first when overrides exist, and Cancel keeps them', () => {
    const store = createDemoStore()
    openFormFields(store)
    fireEvent.click(screen.getByTestId('fc-screen-toggle-cameras'))

    fireEvent.click(screen.getByTestId('fc-profile-canvas'))
    expect(screen.getByText('Apply profile?')).toBeInTheDocument()
    expect(
      screen.getByText("Switching to Canvas resets your custom field choices to that profile's defaults."),
    ).toBeInTheDocument()
    expect(store.getState().profile).toBe('forensic') // nothing applied yet

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(store.getState().profile).toBe('forensic')
    expect(store.getState().formOverrides.steps.cameras).toBe(false)
  })

  it('stamps the profile and clears the overrides on Apply', () => {
    const store = createDemoStore()
    openFormFields(store)
    fireEvent.click(screen.getByTestId('fc-screen-toggle-cameras'))
    fireEvent.click(screen.getByTestId('fc-profile-limited'))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(store.getState().profile).toBe('limited')
    expect(store.getState().formOverrides).toEqual({ steps: {}, fields: {} })
    expect(screen.queryByText('Apply profile?')).not.toBeInTheDocument()
    expect(screen.getByTestId('fc-screen-toggle-cameras')).toHaveAttribute('aria-checked', 'true')
  })

  it('re-picking the active profile does nothing at all', () => {
    const store = createDemoStore()
    openFormFields(store)
    fireEvent.click(screen.getByTestId('fc-screen-toggle-cameras'))
    const before = store.getState()
    fireEvent.click(screen.getByTestId('fc-profile-forensic'))
    expect(store.getState()).toBe(before)
    expect(screen.queryByText('Apply profile?')).not.toBeInTheDocument()
  })
})

describe('the wizard runs on the visible step set', () => {
  function seedInWizard(view: 'dvrInfo' | 'exportInfo' | 'submission' = 'dvrInfo'): DemoStore {
    const store = createDemoStore()
    act(() => {
      const caseId = store.getState().createCase({ caseNumber: 'PR25-F', displayName: 'Flow', unit: 'FVU' })
      const locId = store.getState().addLocation(caseId, { locationName: 'Site' })
      store.getState().switchLocation(locId)
      store.getState().applyFormProfile('canvas') // hides Cameras
      store.getState().setView(view)
    })
    return store
  }

  it('skips a hidden screen going forward', () => {
    const store = seedInWizard('dvrInfo')
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next: Export Information' }))
    expect(store.getState().view).toBe('exportInfo')
  })

  /**
   * The CTA names the next VISIBLE step, the phone's `useWizardNav` shape verbatim
   * (`src/features/form-customization/hooks/useWizardNav.ts:45` — `` `Next: ${next.label}` ``
   * over `getNextStep`'s visible walk). Two mutations this must kill, and the `canvas` profile
   * is chosen so that ONE fixture separates them: it hides Cameras, which is DVR Information's
   * registry neighbour, so a hardcoded label reads "Continue →" and a visibility-blind
   * derivation reads "Next: Cameras" — neither is what Continue actually does.
   */
  it('names the next VISIBLE step on the CTA, not the next registry step', () => {
    const store = seedInWizard('dvrInfo')
    render(<DemoExperience store={store} />)
    expect(screen.getByRole('button', { name: 'Next: Export Information' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next: Cameras' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue →' })).not.toBeInTheDocument()
  })

  /** The label is single-sourced from the drawer's own row, so the two can never disagree. */
  it('the CTA name matches the drawer row it points at', () => {
    const store = seedInWizard('dvrInfo')
    render(<DemoExperience store={store} />)
    act(() => store.getState().setDrawerOpen(true))
    const drawer = screen.getByRole('dialog', { name: 'Navigation' })
    expect(within(drawer).getByText('Export Information')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next: Export Information' })).toBeInTheDocument()
  })

  it('skips it going back too', () => {
    const store = seedInWizard('exportInfo')
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(store.getState().view).toBe('dvrInfo')
  })

  it('still leaves the wizard for Cases from the first step', () => {
    const store = seedInWizard('submission')
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(store.getState().view).toBe('cases')
  })

  it('drops the hidden screen from the drawer and from the rail checklist', () => {
    const store = seedInWizard('dvrInfo')
    render(<DemoExperience store={store} />)
    act(() => store.getState().setDrawerOpen(true))
    const drawer = screen.getByRole('dialog', { name: 'Navigation' })
    expect(within(drawer).queryByText('Cameras')).not.toBeInTheDocument()
    expect(within(drawer).getByText('DVR Information')).toBeInTheDocument()
  })

  it('drops the row from the rail the moment it is switched off, not on the next modal flip', () => {
    // Review R-4. The seeded-before-render tests above pass with the memo's old dep list; this
    // one toggles AFTER render, which is the visitor's actual path (the Settings sheet is OPEN
    // beside the rail while they flip the switch). Before the fix the rail kept a Cameras row
    // and an inflated denominator until closing the sheet happened to flip `modal`.
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    const railBefore = screen.getByText(/explored$/).textContent
    expect(screen.getByRole('button', { name: /^Cameras, / })).toBeInTheDocument()

    act(() => store.getState().setFormStepVisible('cameras', false))

    expect(screen.queryByRole('button', { name: /^Cameras, / })).not.toBeInTheDocument()
    expect(screen.getByText(/explored$/).textContent).not.toBe(railBefore)
  })

  it('drops a switched-off capture tool from the drawer accordion', () => {
    const store = seedInWizard('dvrInfo')
    act(() => store.getState().setFormStepVisible('audioRecording', false))
    render(<DemoExperience store={store} />)
    act(() => store.getState().setDrawerOpen(true))
    fireEvent.click(screen.getByRole('button', { name: 'Media section' }))
    expect(screen.queryByRole('button', { name: 'Record audio note' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open camera to capture media' })).toBeInTheDocument()
  })
})

describe('the rest of the surface follows', () => {
  it('updates the master row preview when the profile changes', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    fireEvent.click(screen.getByTestId('header-settings-button'))
    expect(screen.getByTestId('settings-preview-form-customization')).toHaveTextContent('Forensic')

    act(() => store.getState().applyFormProfile('canvas'))
    expect(screen.getByTestId('settings-preview-form-customization')).toHaveTextContent('Canvas')
  })

  it('rides the snapshot — profile and overrides both', () => {
    const store = createDemoStore()
    openFormFields(store)
    fireEvent.click(screen.getByTestId('fc-screen-toggle-cameras'))
    fireEvent.click(screen.getByTestId('fc-profile-limited'))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    fireEvent.click(screen.getByTestId('fc-screen-toggle-exportInfo'))

    const snap = snapshotOf(store.getState())
    expect(snap.profile).toBe('limited')
    expect(snap.formOverrides).toEqual({ steps: { exportInfo: false }, fields: {} })
  })
})
