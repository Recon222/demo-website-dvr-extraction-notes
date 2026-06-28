import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateTimeField } from '@/features/demo/ui/inputs/DateTimeField'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'

const ROW = 44

beforeEach(() => stubClock())
afterEach(() => vi.restoreAllMocks())

describe('DateTimeField', () => {
  it('renders the label and both a Date and a Time button', () => {
    render(<DateTimeField label="Start Date / Time" value="2025-03-08 10:20:30" onChange={vi.fn()} />)
    expect(screen.getByText('Start Date / Time')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set date' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set time' })).toBeInTheDocument()
  })

  it('shows the formatted date and time for a value', () => {
    render(<DateTimeField label="x" value="2025-03-08 10:20:30" onChange={vi.fn()} />)
    expect(screen.getByText('2025-03-08')).toBeInTheDocument()
    expect(screen.getByText('10:20:30')).toBeInTheDocument()
  })

  it('editing the date preserves the time portion', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateTimeField label="x" value="2025-03-08 10:20:30" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Set date' }))
    await user.click(screen.getByRole('button', { name: '20' }))
    expect(onChange).toHaveBeenCalledWith('2025-03-20 10:20:30')
  })

  it('editing the time preserves the date portion', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<DateTimeField label="x" value="2025-03-08 10:20:30" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Set time' }))
    const seconds = container.querySelector('[data-wheel-col="s"]') as HTMLElement
    seconds.scrollTop = 45 * ROW
    fireEvent.scroll(seconds)
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onChange).toHaveBeenCalledWith('2025-03-08 10:20:45')
  })
})
