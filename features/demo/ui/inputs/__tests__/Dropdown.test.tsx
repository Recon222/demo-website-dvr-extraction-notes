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
  it('is closed by default (no menu in the DOM) and reports aria-expanded=false', () => {
    render(<Dropdown label="FPS" value="" onChange={vi.fn()} options={OPTIONS} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'FPS' })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Dropdown open/select', () => {
  it('opens the menu when the selector is clicked and reports aria-expanded=true', async () => {
    const user = userEvent.setup()
    render(<Dropdown label="Recording FPS" value="" onChange={vi.fn()} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: 'Recording FPS' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(OPTIONS.length)
    expect(screen.getByRole('button', { name: 'Recording FPS' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('calls onChange with the option value and closes when an option is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Dropdown label="Recording FPS" value="" onChange={onChange} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: 'Recording FPS' }))
    await user.click(screen.getByRole('menuitemradio', { name: '15' }))
    expect(onChange).toHaveBeenCalledWith('15')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('marks the currently-selected option', async () => {
    const user = userEvent.setup()
    render(<Dropdown label="FPS" value="24" onChange={vi.fn()} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: 'FPS' }))
    expect(screen.getByRole('menuitemradio', { name: '24' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: '15' })).toHaveAttribute('aria-checked', 'false')
  })

  it('closes on Escape without calling onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Dropdown label="FPS" value="" onChange={onChange} options={OPTIONS} />)
    await user.click(screen.getByRole('button', { name: 'FPS' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
