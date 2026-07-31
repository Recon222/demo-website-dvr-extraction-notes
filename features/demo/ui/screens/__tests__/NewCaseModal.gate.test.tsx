import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

function renderModal(over: Partial<NewCaseFields> = {}, props: { onSubmit?: () => void; onChange?: () => void } = {}) {
  const onSubmit = props.onSubmit ?? vi.fn()
  const onChange = props.onChange ?? vi.fn()
  render(<NewCaseModal form={{ ...blank, ...over }} onChange={onChange} onSubmit={onSubmit} onCancel={vi.fn()} />)
  return { onSubmit, onChange, submit: screen.getByText('Create Case') }
}

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
