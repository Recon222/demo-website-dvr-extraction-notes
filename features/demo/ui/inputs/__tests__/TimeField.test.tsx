import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeField } from '@/features/demo/ui/inputs/TimeField'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'

const ROW = 44

beforeEach(() => stubClock())
afterEach(() => vi.restoreAllMocks())

describe('TimeField button', () => {
  it('shows the formatted time for a value', () => {
    render(<TimeField value="2025-03-08 10:20:30" onChange={vi.fn()} />)
    expect(screen.getByText('10:20:30')).toBeInTheDocument()
  })
  it('shows an em-dash for an empty value', () => {
    render(<TimeField value="" onChange={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('TimeField interaction', () => {
  it('opens the wheel sheet on click', async () => {
    const user = userEvent.setup()
    render(<TimeField value="2025-03-08 10:20:30" onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Set time' }))
    expect(screen.getByRole('dialog', { name: 'Select Time' })).toBeInTheDocument()
  })

  it('Confirm calls onChange with the time set and the date preserved', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<TimeField value="2025-03-08 10:20:30" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Set time' }))
    const hours = container.querySelector('[data-wheel-col="h"]') as HTMLElement
    hours.scrollTop = 23 * ROW
    fireEvent.scroll(hours)
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onChange).toHaveBeenCalledWith('2025-03-08 23:20:30')
  })

  it('seeds the wheel from now() and confirms it when value is empty', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TimeField value="" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Set time' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onChange).toHaveBeenCalledWith('2025-03-08 12:05:30')
  })

  it('Cancel closes without calling onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TimeField value="2025-03-08 10:20:30" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Set time' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('re-seeds the wheel from the stored value after a cancelled edit', async () => {
    const user = userEvent.setup()
    const { container } = render(<TimeField value="2025-03-08 10:20:30" onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Set time' }))
    const hCol = () => container.querySelector('[data-wheel-col="h"]') as HTMLElement
    hCol().scrollTop = 23 * ROW
    fireEvent.scroll(hCol())
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Set time' }))
    expect(hCol().scrollTop).toBe(10 * ROW) // stored 10, not the discarded 23
  })
})
