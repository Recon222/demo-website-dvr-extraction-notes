import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { NEW_LOCATION_BLOCK_MESSAGES } from '@/features/demo/engine/logic/new-location-gate'
import { NewLocationModal, type NewLocationFields } from '@/features/demo/ui/screens/NewLocationModal'

const blank: NewLocationFields = {
  locationName: '',
  businessName: '',
  streetAddress: '',
  city: '',
  locationContact: '',
  locationPhone: '',
}

interface Options {
  form?: Partial<NewLocationFields>
  existingNames?: readonly string[]
  requireAddress?: boolean
  subtitle?: string
  onSubmit?: () => void
}

const modal = (o: Options = {}) => (
  <NewLocationModal
    form={{ ...blank, ...o.form }}
    existingNames={o.existingNames}
    requireAddress={o.requireAddress}
    subtitle={o.subtitle}
    onChange={vi.fn()}
    onSubmit={o.onSubmit ?? vi.fn()}
    onCancel={vi.fn()}
    gpsDeps={{ geolocation: null }}
  />
)

const renderModal = (o: Options = {}) => render(modal(o))

const submitButton = () => screen.getByRole('button', { name: 'Create Location' })
const reason = () => screen.getByTestId('new-location-blocked')

describe('NewLocationModal — required name', () => {
  it('blocks submit with the phone\'s copy while the name is blank', () => {
    const onSubmit = vi.fn()
    renderModal({ onSubmit })

    expect(submitButton()).toHaveAttribute('aria-disabled', 'true')
    expect(reason()).toHaveTextContent(NEW_LOCATION_BLOCK_MESSAGES.nameRequired)
    fireEvent.click(submitButton())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('treats a whitespace-only name as blank', () => {
    renderModal({ form: { locationName: '   ' } })
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true')
    expect(reason()).toHaveTextContent(NEW_LOCATION_BLOCK_MESSAGES.nameRequired)
  })

  it('submits once a name is present', () => {
    const onSubmit = vi.fn()
    renderModal({ form: { locationName: 'Rear Door' }, onSubmit })

    expect(submitButton()).toHaveAttribute('aria-disabled', 'false')
    expect(reason()).toBeEmptyDOMElement()
    fireEvent.click(submitButton())
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})

describe('NewLocationModal — live duplicate-name check (matrix row 13)', () => {
  it('shows the phone\'s error at the field and blocks submit', () => {
    const onSubmit = vi.fn()
    renderModal({ form: { locationName: 'Main Store' }, existingNames: ['Main Store'], onSubmit })

    const nameInput = screen.getByLabelText('Location Name')
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    const describedBy = nameInput.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy as string)).toHaveTextContent(NEW_LOCATION_BLOCK_MESSAGES.duplicateName)

    expect(submitButton()).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(submitButton())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('collides case-insensitively and after trimming (phone comparison rules)', () => {
    renderModal({ form: { locationName: '  main STORE ' }, existingNames: ['Main Store'] })
    expect(screen.getByLabelText('Location Name')).toHaveAttribute('aria-invalid', 'true')
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('allows a name that is not on this case — the caller passes siblings only', () => {
    const onSubmit = vi.fn()
    renderModal({ form: { locationName: 'Rear Door' }, existingNames: ['Main Store', 'Loading Bay'], onSubmit })

    expect(screen.getByLabelText('Location Name')).not.toHaveAttribute('aria-invalid')
    expect(submitButton()).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(submitButton())
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('reports the blank name, not the duplicate, when a blank sibling exists', () => {
    // isLocationNameTaken('') matches a blank sibling — the gate's ordering is what stops the
    // visitor being told an empty field is a duplicate.
    renderModal({ form: { locationName: '' }, existingNames: [''] })
    expect(reason()).toHaveTextContent(NEW_LOCATION_BLOCK_MESSAGES.nameRequired)
    expect(screen.getByLabelText('Location Name')).not.toHaveAttribute('aria-invalid')
  })

  it('clears the error and re-enables submit once the collision is resolved', () => {
    const { rerender } = renderModal({ form: { locationName: 'Main Store' }, existingNames: ['Main Store'] })
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true')

    rerender(modal({ form: { locationName: 'Main Store 2' }, existingNames: ['Main Store'] }))
    expect(screen.getByLabelText('Location Name')).not.toHaveAttribute('aria-invalid')
    expect(submitButton()).toHaveAttribute('aria-disabled', 'false')
    expect(reason()).toBeEmptyDOMElement()
  })
})

describe('NewLocationModal — the requireAddress variant (P3.5\'s caller)', () => {
  const named = { locationName: 'Rear Door' }

  it('is OFF by default: a blank street submits, as the phone\'s Add Location flow does', () => {
    // ui-mapping 11:385 — Street Address keeps its red asterisk but is only enforced for the
    // new-address-copy flow. Reproduced, not "corrected".
    const onSubmit = vi.fn()
    renderModal({ form: named, onSubmit })

    expect(submitButton()).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(submitButton())
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('blocks a blank street when on, with the phone\'s copy', () => {
    const onSubmit = vi.fn()
    renderModal({ form: named, requireAddress: true, onSubmit })

    expect(reason()).toHaveTextContent(NEW_LOCATION_BLOCK_MESSAGES.addressRequired)
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(submitButton())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('blocks a whitespace-only street when on', () => {
    renderModal({ form: { ...named, streetAddress: '   ' }, requireAddress: true })
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true')
  })

  it('submits once an address is entered', () => {
    const onSubmit = vi.fn()
    renderModal({ form: { ...named, streetAddress: '1450 Eglinton Ave W' }, requireAddress: true, onSubmit })

    expect(reason()).toBeEmptyDOMElement()
    fireEvent.click(submitButton())
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('still reports the name rules first — the address rule is last', () => {
    const { rerender } = renderModal({ form: { locationName: '' }, requireAddress: true })
    expect(reason()).toHaveTextContent(NEW_LOCATION_BLOCK_MESSAGES.nameRequired)

    rerender(modal({ form: named, existingNames: ['Rear Door'], requireAddress: true }))
    expect(reason()).toHaveTextContent(NEW_LOCATION_BLOCK_MESSAGES.duplicateName)
  })

  it('renders the caller\'s subtitle as the dialog description, keeping "New Location" as its name', () => {
    const subtitle = 'Submission info copied — enter the new address.'
    renderModal({ form: named, requireAddress: true, subtitle })

    // The name has to stay stable: the phone uses ONE title for both instances of this modal
    // (ui-mapping 11:75 — there is no "Edit Location" variant).
    const dialog = screen.getByRole('dialog', { name: 'New Location' })
    expect(screen.getByTestId('modal-subtitle')).toHaveTextContent(subtitle)
    const describedBy = dialog.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy as string)).toHaveTextContent(subtitle)
  })

  it('renders no subtitle for the plain Add Location caller', () => {
    renderModal({ form: named })
    expect(screen.queryByTestId('modal-subtitle')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'New Location' })).not.toHaveAttribute('aria-describedby')
  })
})

describe('NewLocationModal — the blocked action names its reason', () => {
  it('describes the disabled submit from the live reason region, and drops it when unblocked', () => {
    const { rerender } = renderModal()
    const describedBy = submitButton().getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy as string)).toHaveTextContent(NEW_LOCATION_BLOCK_MESSAGES.nameRequired)

    rerender(
      <NewLocationModal
        form={{ ...blank, locationName: 'Rear Door' }}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        gpsDeps={{ geolocation: null }}
      />,
    )
    expect(submitButton()).not.toHaveAttribute('aria-describedby')
  })

  it('keeps the submit focusable while blocked (R-7: `disabled` would drop focus to <body>)', () => {
    renderModal()
    const button = submitButton()
    button.focus()
    expect(document.activeElement).toBe(button)
    expect(button).not.toHaveAttribute('disabled')
  })
})
