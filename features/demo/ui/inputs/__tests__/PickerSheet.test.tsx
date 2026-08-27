import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PICKER_SHEET_Z, PickerSheet } from '@/features/demo/ui/inputs/PickerSheet'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'

describe('PickerSheet', () => {
  it('renders the title, children, and footer', () => {
    render(
      <PickerSheet title="Select Date" onClose={vi.fn()} footer={<button>Done</button>}>
        <div>body content</div>
      </PickerSheet>,
    )
    expect(screen.getByText('Select Date')).toBeInTheDocument()
    expect(screen.getByText('body content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('exposes a dialog labelled by the title', () => {
    render(
      <PickerSheet title="Select Time" onClose={vi.fn()}>
        <div />
      </PickerSheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Select Time' })).toBeInTheDocument()
  })

  it('calls onClose when the close (✕) button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <PickerSheet title="x" onClose={onClose}>
        <div />
      </PickerSheet>,
    )
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <PickerSheet title="x" onClose={onClose}>
        <div />
      </PickerSheet>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when the sheet body is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <PickerSheet title="x" onClose={onClose}>
        <div>inside</div>
      </PickerSheet>,
    )
    await user.click(screen.getByText('inside'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when the scrim is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <PickerSheet title="x" onClose={onClose}>
        <div />
      </PickerSheet>,
    )
    fireEvent.click(container.querySelector('[data-sheet-scrim]')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('portals into the PhoneOverlayContext node when one is present', () => {
    const overlay = document.createElement('div')
    document.body.appendChild(overlay)
    render(
      <PhoneOverlayContext.Provider value={overlay}>
        <PickerSheet title="Ported" onClose={vi.fn()}>
          <div>portaled body</div>
        </PickerSheet>
      </PhoneOverlayContext.Provider>,
    )
    expect(overlay.querySelector('[role="dialog"]')).toBeTruthy()
    expect(overlay).toHaveTextContent('portaled body')
    document.body.removeChild(overlay)
  })

  /* --- U4.1: the preset's own contract over `GlassBottomSheet` (SEAM(U4.1b)). --- */

  it('mounts the shared shell — same scrim, same handle, same layer', () => {
    render(
      <PickerSheet title="Select Date" onClose={vi.fn()}>
        <div />
      </PickerSheet>,
    )
    expect(document.querySelector('[data-sheet-scrim]')!.getAttribute('style')).toContain(
      `z-index: ${PICKER_SHEET_Z}`,
    )
    expect(screen.getByRole('dialog').style.zIndex).toBe(String(PICKER_SHEET_Z + 1))
    // The pickers GAIN the handle in U4.1 — the phone's `Picker` takes the shell's default.
    expect(document.querySelector('[data-sheet-handle]')).toBeTruthy()
  })

  it('turns the accent strip OFF, as every form sheet on the phone does', () => {
    // `Picker.tsx:175`, `TimePicker.tsx:133`, `DateTimePicker.tsx:262` and
    // `ExportActionSheet.tsx:107` all pass `showAccentStrip={false}`;
    // `DateTimePicker.tsx:253-261` records why (the tapering rule under the header's flat 1px
    // border reads as one doubled band). A strip here would be a demo-only invention.
    render(
      <PickerSheet title="Select Date" onClose={vi.fn()}>
        <div />
      </PickerSheet>,
    )
    expect(document.querySelector('[data-sheet-accent-strip]')).toBeNull()
  })

  it('keeps the pickers` own body and footer padding, unmoved to the pixel', () => {
    // The shell's body has NO padding (content pads itself) and its footer node adds 12 at the
    // bottom. `16px 16px 4px` + 12 is the flat 16 these three footers rendered before U4.1.
    render(
      <PickerSheet title="x" onClose={vi.fn()} footer={<button>Done</button>}>
        <div>body content</div>
      </PickerSheet>,
    )
    const body = document.querySelector<HTMLElement>('[data-sheet-body]')!
    expect(body.firstElementChild).toHaveStyle({ padding: '16px' })
    const footerRow = screen.getByRole('button', { name: 'Done' }).parentElement!
    expect(footerRow).toHaveStyle({ paddingTop: '16px', paddingBottom: '4px' })
    expect(footerRow.style.borderTop).toBe('1px solid rgb(28, 78, 132)')
  })

  it('renders no footer node at all when the caller passes none', () => {
    // `footer ? <div .../> : undefined`, not `footer && …`: handing the shell an empty node
    // would paint the divider and 16px of padding under a sheet that has no actions.
    render(
      <PickerSheet title="x" onClose={vi.fn()}>
        <div />
      </PickerSheet>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.lastElementChild).toBe(document.querySelector('[data-sheet-body]'))
  })
})
