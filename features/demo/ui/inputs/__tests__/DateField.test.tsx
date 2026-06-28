import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateField } from '@/features/demo/ui/inputs/DateField'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'

beforeEach(() => stubClock())
afterEach(() => vi.restoreAllMocks())

describe('DateField button', () => {
  it('shows the formatted date for a value', () => {
    render(<DateField value="2025-03-08 10:20:30" onChange={vi.fn()} />)
    expect(screen.getByText('2025-03-08')).toBeInTheDocument()
  })
  it('shows an em-dash for an empty value', () => {
    render(<DateField value="" onChange={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('DateField interaction', () => {
  it('opens the calendar sheet when the Date button is clicked', async () => {
    const user = userEvent.setup()
    render(<DateField value="2025-03-08 10:20:30" onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Set date' }))
    expect(screen.getByRole('dialog', { name: 'Select Date' })).toBeInTheDocument()
  })

  it('auto-populates today (seeding time from now) on open when value is empty', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateField value="" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Set date' }))
    expect(onChange).toHaveBeenCalledWith('2025-03-08 12:05:30')
  })

  it('sets the date and preserves the time when a day is picked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateField value="2025-03-08 10:20:30" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Set date' }))
    await user.click(screen.getByRole('button', { name: '15' }))
    expect(onChange).toHaveBeenCalledWith('2025-03-15 10:20:30')
  })

  it('does not call onChange when only navigating months', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateField value="2025-03-08 10:20:30" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Set date' }))
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
