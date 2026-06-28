import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dropdown } from '@/features/demo/ui/inputs/Dropdown'

const OPTIONS = ['7', '10', '15', '24', '30', 'Other']

describe('Dropdown selector', () => {
  it('shows the placeholder when value is empty', () => {
    render(<Dropdown value="" onChange={vi.fn()} options={OPTIONS} placeholder="Select…" />)
    expect(screen.getByText('Select…')).toBeInTheDocument()
  })
  it('shows the selected option when value is set', () => {
    render(<Dropdown value="24" onChange={vi.fn()} options={OPTIONS} />)
    expect(screen.getByText('24')).toBeInTheDocument()
  })
  it('is closed by default (no listbox in the DOM)', () => {
    render(<Dropdown value="" onChange={vi.fn()} options={OPTIONS} />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('Dropdown open/select', () => {
  it('opens the option list when the selector is clicked', async () => {
    const user = userEvent.setup()
    render(<Dropdown label="Recording FPS" value="" onChange={vi.fn()} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: 'Recording FPS' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length)
  })

  it('calls onChange with the option value and closes when an option is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Dropdown label="Recording FPS" value="" onChange={onChange} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: 'Recording FPS' }))
    await user.click(screen.getByRole('option', { name: '15' }))
    expect(onChange).toHaveBeenCalledWith('15')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('marks the currently-selected option', async () => {
    const user = userEvent.setup()
    render(<Dropdown label="FPS" value="24" onChange={vi.fn()} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: 'FPS' }))
    expect(screen.getByRole('option', { name: '24' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: '15' })).toHaveAttribute('aria-selected', 'false')
  })

  it('closes on Escape without calling onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Dropdown label="FPS" value="" onChange={onChange} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: 'FPS' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
