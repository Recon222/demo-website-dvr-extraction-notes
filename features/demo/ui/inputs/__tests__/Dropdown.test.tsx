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

describe('Dropdown label/value options (phone-style annotated lists)', () => {
  const PAIRS = [
    { label: '1920x1080 (1080p)', value: '1920x1080' },
    { label: 'Other (Custom)', value: 'custom' },
  ]

  it('shows the LABEL of the selected value in the pill', () => {
    render(<Dropdown label="Resolution" value="1920x1080" onChange={vi.fn()} options={PAIRS} />)
    expect(screen.getByText('1920x1080 (1080p)')).toBeInTheDocument()
    expect(screen.queryByText(/^1920x1080$/)).not.toBeInTheDocument()
  })

  it('renders labels in the menu but reports the VALUE through onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Dropdown label="Resolution" value="" onChange={onChange} options={PAIRS} />)
    await user.click(screen.getByRole('button', { name: 'Resolution' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Other (Custom)' }))
    expect(onChange).toHaveBeenCalledWith('custom')
  })

  it('marks the selected option by value, not label', async () => {
    const user = userEvent.setup()
    render(<Dropdown label="Resolution" value="custom" onChange={vi.fn()} options={PAIRS} />)
    await user.click(screen.getByRole('button', { name: 'Resolution' }))
    expect(screen.getByRole('menuitemradio', { name: 'Other (Custom)' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: '1920x1080 (1080p)' })).toHaveAttribute('aria-checked', 'false')
  })

  it('degrades honestly for an unknown non-empty value: shows the raw value, not the placeholder', () => {
    render(<Dropdown label="Resolution" value="1440x900" onChange={vi.fn()} options={PAIRS} placeholder="Select…" />)
    expect(screen.getByText('1440x900')).toBeInTheDocument()
    expect(screen.queryByText('Select…')).not.toBeInTheDocument()
  })
})
