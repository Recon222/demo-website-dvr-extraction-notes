import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteConfirmationModal, type DeleteTarget } from '@/features/demo/ui/screens/DeleteConfirmationModal'
import { DangerFill } from '@/features/demo/ui/controls/button-recipe'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'

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

  it('fills the confirm button with the DEEP danger red, not the flat error mid-tone (A52/A67)', () => {
    // The third ADOPTION pin, and the one with a named history: the phone's `SwipeDeleteAction`
    // suite compared its rendered fill against `DangerFill` ITSELF, so it moved WITH the constant
    // and stayed 32/32 green through a mutation back to the failing flat pair. This asserts the
    // rendered value against the DEEP red by name AND asserts it is not `error`, which is the
    // mutation that pin could not see. Phone `Button.tsx:159-160` + `:234`.
    renderModal(locationTarget())
    const confirm = screen.getByTestId('delete-modal-confirm')
    expect(confirm).toHaveStyle({ background: DangerFill[scheme], color: colors.onError }) // W4/F85: indexed, as the recipe indexes it
    expect(confirm.style.backgroundColor).not.toBe(hexToJsdomRgb(colors.error))
    // ...and the border matches the fill, so the control reads as one solid block.
    expect(confirm).toHaveStyle({ borderTopColor: DangerFill[scheme], borderBottomColor: DangerFill[scheme] })
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

  /**
   * U4.3. This dialog used to read `document.activeElement` in its mount effect — the path
   * `CentredDialog.tsx` documents as broken, and the reason the three focus blocks could not
   * be consolidated onto the majority. A row action that disables itself while the confirm is
   * up (the swipe-delete belt) is non-focusable by the time React runs passive effects, so the
   * old read captured `<body>` and cancelling dropped a keyboard visitor at document start.
   *
   * The shell's capture-phase tracker reads the opener at GESTURE time instead. If this ever
   * goes green through `document.activeElement` again, focus restore has silently regressed
   * for exactly the openers that need it most.
   */
  it('restores focus to the row action that was pressed, even after it disabled itself', () => {
    const opener = document.createElement('button')
    opener.textContent = 'Delete'
    document.body.appendChild(opener)
    opener.focus()
    fireEvent.pointerDown(opener)
    opener.blur()
    opener.disabled = true
    expect(document.activeElement).toBe(document.body)

    const { unmount } = render(
      <DeleteConfirmationModal target={caseTarget()} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    opener.disabled = false
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })
})

/** jsdom normalizes hex inline colours to rgb(r, g, b). Same helper as `TerminalLine.test.tsx:116`. */
function hexToJsdomRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}
