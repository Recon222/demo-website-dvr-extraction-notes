import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
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
