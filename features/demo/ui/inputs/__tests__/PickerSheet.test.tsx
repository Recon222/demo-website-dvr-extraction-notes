import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PickerSheet } from '@/features/demo/ui/inputs/PickerSheet'

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
})
