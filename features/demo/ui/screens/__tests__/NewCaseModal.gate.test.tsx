import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { NewCaseModal, type NewCaseFields } from '@/features/demo/ui/screens/NewCaseModal'

/**
 * P3.3 / matrix row 11 — the required-field gate.
 *
 * Phone spec: Case Number and Unit are the only required fields; the primary action is
 * unavailable while either is blank (`NewCaseModal.tsx:445`), and `validateForm`
 * (`:135-150`) owns the messages "Case number is required" / "Unit is required".
 * The demo keeps the click live so those messages are reachable — see `ModalActions`'s
 * `submitBlocked` doc comment.
 */

const blank: NewCaseFields = {
  caseNumber: '', displayName: '', unit: '', oicName: '', oicBadge: '', vcName: '', vcBadge: '',
  incidentBusinessName: '', incidentStreetAddress: '', incidentCity: '',
  incidentLatitude: '', incidentLongitude: '', incidentCoordinateSource: '', notes: '',
}

function renderModal(
  over: Partial<NewCaseFields> = {},
  props: { onSubmit?: () => void; onChange?: () => void; onCancel?: () => void } = {},
) {
  const onSubmit = props.onSubmit ?? vi.fn()
  const onChange = props.onChange ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  render(<NewCaseModal form={{ ...blank, ...over }} onChange={onChange} onSubmit={onSubmit} onCancel={onCancel} />)
  return { onSubmit, onChange, onCancel, submit: screen.getByText('Create Case') }
}

/** A form that clears the required-field gate, so submits reach the confirmation. */
const fillable: Partial<NewCaseFields> = { caseNumber: 'PR25-1', unit: 'Robbery' }
const confirmButton = (label: string) => within(screen.getByRole('alertdialog')).getByText(label)

describe('NewCaseModal — required-field gate', () => {
  it('marks Create Case unavailable while Case Number or Unit is blank', () => {
    const { submit } = renderModal()
    expect(submit).toHaveAttribute('aria-disabled', 'true')
  })

  it('marks Create Case available once both required fields are filled', () => {
    const { submit } = renderModal({ caseNumber: 'PR25-1', unit: 'Robbery' })
    expect(submit).not.toHaveAttribute('aria-disabled')
  })

  it('treats whitespace-only values as blank (the phone trims before checking)', () => {
    const { submit } = renderModal({ caseNumber: '   ', unit: '  ' })
    expect(submit).toHaveAttribute('aria-disabled', 'true')
  })

  it('a blocked submit does not call onSubmit and surfaces both phone messages', () => {
    const { onSubmit, submit } = renderModal()
    fireEvent.click(submit)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Case number is required')).toBeInTheDocument()
    expect(screen.getByText('Unit is required')).toBeInTheDocument()
  })

  it('flags only the field that is actually missing', () => {
    renderModal({ caseNumber: 'PR25-1' })
    fireEvent.click(screen.getByText('Create Case'))
    expect(screen.queryByText('Case number is required')).not.toBeInTheDocument()
    expect(screen.getByText('Unit is required')).toBeInTheDocument()
  })

  it('does not shout at an untouched form — no errors before a submit attempt', () => {
    renderModal()
    expect(screen.queryByText('Case number is required')).not.toBeInTheDocument()
    expect(screen.queryByText('Unit is required')).not.toBeInTheDocument()
  })

  it('typing into a flagged field clears its message', () => {
    renderModal()
    fireEvent.click(screen.getByText('Create Case'))
    expect(screen.getByText('Unit is required')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'R' } })
    expect(screen.queryByText('Unit is required')).not.toBeInTheDocument()
    // the other field is untouched, so its message stays up
    expect(screen.getByText('Case number is required')).toBeInTheDocument()
  })

  it('the error message replaces the field hint (phone: error wins over helperText)', () => {
    renderModal()
    expect(screen.getByText(/names the evidence folder/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Create Case'))
    expect(screen.queryByText(/names the evidence folder/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Case Number')).toHaveAttribute('aria-invalid', 'true')
  })
})

/**
 * P3.3 / matrix row 11 — the create-mode confirmation (`NewCaseModal.tsx:237-249`).
 * The phone raises `Alert.alert('Confirm Case Number', …)` BEFORE saving, so the visitor
 * learns the number is the one field they can never change; only the "Create Case" arm
 * proceeds. The demo renders it on the shared blocking-dialog primitive.
 */
describe('NewCaseModal — confirm on create', () => {
  it('a valid submit raises the confirmation instead of creating', () => {
    const { onSubmit } = renderModal(fillable)
    fireEvent.click(screen.getByText('Create Case'))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('carries the phone copy verbatim, quoting the trimmed number', () => {
    renderModal({ ...fillable, caseNumber: '  PR25-1  ' })
    fireEvent.click(screen.getByText('Create Case'))
    expect(screen.getByText('Confirm Case Number')).toBeInTheDocument()
    expect(
      screen.getByText(
        'The case number "PR25-1" can\'t be changed after the case is created. Everything else can be edited later.',
      ),
    ).toBeInTheDocument()
  })

  it('the Create Case arm performs the submit', () => {
    const { onSubmit } = renderModal(fillable)
    fireEvent.click(screen.getByText('Create Case'))
    fireEvent.click(confirmButton('Create Case'))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('Cancel dismisses the confirmation without submitting, leaving the form open', () => {
    const { onSubmit, onCancel } = renderModal(fillable)
    fireEvent.click(screen.getByText('Create Case'))
    fireEvent.click(confirmButton('Cancel'))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Case Number')).toBeInTheDocument()
  })

  it('Escape answers the confirmation only — it must not also close the form', () => {
    const { onCancel } = renderModal(fillable)
    fireEvent.click(screen.getByText('Create Case'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled() // the sheet behind the alert stays put
  })

  it('Escape still closes the form when no confirmation is up', () => {
    const { onCancel } = renderModal(fillable)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
