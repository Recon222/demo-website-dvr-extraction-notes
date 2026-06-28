import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar } from '@/features/demo/ui/inputs/Calendar'

const TODAY = { y: 2025, mo: 3, d: 8 }

function setup(props: Partial<React.ComponentProps<typeof Calendar>> = {}) {
  const onPrevMonth = vi.fn()
  const onNextMonth = vi.fn()
  const onSelectDay = vi.fn()
  const utils = render(
    <Calendar
      viewYear={2025}
      viewMonth={3}
      selected={{ y: 2025, mo: 3, d: 8 }}
      today={TODAY}
      onPrevMonth={onPrevMonth}
      onNextMonth={onNextMonth}
      onSelectDay={onSelectDay}
      {...props}
    />,
  )
  return { ...utils, onPrevMonth, onNextMonth, onSelectDay }
}

describe('Calendar grid', () => {
  it('renders one cell per day of the viewed month', () => {
    const { container } = setup({ viewMonth: 2, viewYear: 2025, selected: null }) // Feb 2025
    expect(container.querySelectorAll('[data-cell="day"]')).toHaveLength(28)
  })

  it('renders 31 cells for January', () => {
    const { container } = setup({ viewMonth: 1, selected: null })
    expect(container.querySelectorAll('[data-cell="day"]')).toHaveLength(31)
  })

  it('marks the selected day when it is in the viewed month', () => {
    setup({ selected: { y: 2025, mo: 3, d: 8 } })
    expect(screen.getByRole('button', { name: '8' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '9' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not mark a selected day from another month', () => {
    setup({ viewMonth: 3, selected: { y: 2025, mo: 1, d: 8 } })
    expect(screen.getByRole('button', { name: '8' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks today with aria-current when today is not selected', () => {
    setup({ selected: { y: 2025, mo: 3, d: 20 } })
    expect(screen.getByRole('button', { name: '8' })).toHaveAttribute('aria-current', 'date')
  })

  it('renders the "MonthName YYYY" header', () => {
    setup()
    expect(screen.getByText('March 2025')).toBeInTheDocument()
  })

  it('renders the correct number of leading blank cells for the month-start weekday', () => {
    // April 1 2025 is a Tuesday (getDay 2) → 2 leading blanks before day 1.
    const { container } = setup({ viewYear: 2025, viewMonth: 4, selected: null })
    expect(container.querySelectorAll('[data-blank]')).toHaveLength(2)
  })
})

describe('Calendar navigation & selection', () => {
  it('calls onPrevMonth / onNextMonth when the arrows are clicked', async () => {
    const user = userEvent.setup()
    const { onPrevMonth, onNextMonth } = setup()
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(onPrevMonth).toHaveBeenCalledTimes(1)
    expect(onNextMonth).toHaveBeenCalledTimes(1)
  })

  it('calls onSelectDay with the clicked day number', async () => {
    const user = userEvent.setup()
    const { onSelectDay } = setup()
    await user.click(screen.getByRole('button', { name: '15' }))
    expect(onSelectDay).toHaveBeenCalledWith(15)
  })
})
