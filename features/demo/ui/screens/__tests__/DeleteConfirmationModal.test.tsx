import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteConfirmationModal, type DeleteTarget } from '@/features/demo/ui/screens/DeleteConfirmationModal'

/** P3.1 / matrix row 15 — the phone's 2-arm delete confirmation (ui-mapping 11). */

const caseTarget = (locationNames: string[] = []): DeleteTarget => ({
  type: 'case',
  caseNumber: 'PR25-0098213',
  locationNames,
})
const locationTarget = (address = '1450 Eglinton Ave W, Mississauga'): DeleteTarget => ({
  type: 'location',
  locationName: "Kim's Convenience",
  address,
})

function renderModal(target: DeleteTarget, over: { onConfirm?: () => void; onCancel?: () => void } = {}) {
  const onConfirm = over.onConfirm ?? vi.fn()
  const onCancel = over.onCancel ?? vi.fn()
  render(<DeleteConfirmationModal target={target} onConfirm={onConfirm} onCancel={onCancel} />)
  return { onConfirm, onCancel }
}

describe('DeleteConfirmationModal — location variant (phone "Variation B")', () => {
  it('renders the title, the detail rows and the location-scoped warning verbatim', () => {
    renderModal(locationTarget())
    expect(screen.getByText('Delete Location?')).toBeInTheDocument()
    expect(screen.getByText('Location:')).toBeInTheDocument()
    expect(screen.getByText("Kim's Convenience")).toBeInTheDocument()
    expect(screen.getByText('Address:')).toBeInTheDocument()
    expect(screen.getByText('1450 Eglinton Ave W, Mississauga')).toBeInTheDocument()
    expect(
      screen.getByText('All form data, photos, and PDFs for this location will be permanently deleted.'),
    ).toBeInTheDocument()
  })

  it('omits the Address row entirely when the location has no address', () => {
    renderModal(locationTarget(''))
    expect(screen.queryByText('Address:')).not.toBeInTheDocument()
    expect(screen.getByText('Location:')).toBeInTheDocument()
  })

  it('labels the confirm button plainly "Delete" and fires onConfirm', () => {
    const { onConfirm } = renderModal(locationTarget())
    const confirm = screen.getByTestId('delete-modal-confirm')
    expect(confirm).toHaveTextContent('Delete')
    expect(confirm).not.toHaveTextContent('Delete Case')
    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})

describe('DeleteConfirmationModal — case variant (phone "Variation A")', () => {
  it('renders the case row and the unqualified warning line (a DIFFERENT string from the location arm)', () => {
    renderModal(caseTarget())
    expect(screen.getByText('Delete Case?')).toBeInTheDocument()
    expect(screen.getByText('Case:')).toBeInTheDocument()
    expect(screen.getByText('PR25-0098213')).toBeInTheDocument()
    expect(screen.getByText('All form data, photos, and PDFs will be permanently deleted.')).toBeInTheDocument()
    expect(
      screen.queryByText('All form data, photos, and PDFs for this location will be permanently deleted.'),
    ).not.toBeInTheDocument()
  })

  it('lists every location that will cascade away, under the warning lead-in', () => {
    renderModal(caseTarget(["Kim's Convenience", 'Rear Alley Camera', 'Plaza Office']))
    expect(screen.getByText('WARNING: This will also delete these locations:')).toBeInTheDocument()
    const list = screen.getByTestId('location-list-scroll')
    expect(list).toHaveTextContent("Kim's Convenience")
    expect(list).toHaveTextContent('Rear Alley Camera')
    expect(list).toHaveTextContent('Plaza Office')
    // The phone caps the list at 150px and scrolls inside it, so a long case can't push the
    // buttons out of the dialog.
    expect(list).toHaveStyle({ maxHeight: '150px', overflowY: 'auto' })
  })

  it('skips the warning lead-in and the list for a case with no locations', () => {
    renderModal(caseTarget([]))
    expect(screen.queryByText('WARNING: This will also delete these locations:')).not.toBeInTheDocument()
    expect(screen.queryByTestId('location-list-scroll')).not.toBeInTheDocument()
    expect(screen.getByText('All form data, photos, and PDFs will be permanently deleted.')).toBeInTheDocument()
  })

  it('labels the confirm button "Delete Case"', () => {
    renderModal(caseTarget())
    expect(screen.getByTestId('delete-modal-confirm')).toHaveTextContent('Delete Case')
  })
})

describe('DeleteConfirmationModal — dismissal', () => {
  it('is an alertdialog labelled by its title, focused on mount', () => {
    renderModal(caseTarget())
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Delete Case?')
    expect(dialog).toHaveFocus()
  })

  it('cancels on the Cancel button, on Escape, and on the scrim — the scrim DOES dismiss here', () => {
    const onCancel = vi.fn()
    renderModal(locationTarget(), { onCancel })
    fireEvent.click(screen.getByTestId('delete-modal-cancel'))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByTestId('delete-modal-overlay'))
    expect(onCancel).toHaveBeenCalledTimes(3)
  })

  it('never confirms as a side effect of dismissing', () => {
    const { onConfirm } = renderModal(caseTarget(['A']))
    fireEvent.click(screen.getByTestId('delete-modal-overlay'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
