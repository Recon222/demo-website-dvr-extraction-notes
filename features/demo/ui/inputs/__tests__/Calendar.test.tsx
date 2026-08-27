import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar } from '@/features/demo/ui/inputs/Calendar'
import { colors } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

const TODAY = { y: 2025, mo: 3, d: 8 }

/** What jsdom stores for a colour written into a declaration (it re-spaces and hex->rgb). */
function jsdomColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

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

/**
 * A59 / A73, matrix §C.2 — "Calendar selected day label 3.73 -> 5.80".
 *
 * VALUE pins, not a re-measured ratio. The pair `onPrimary` on `primaryDark` is already bounded
 * at >= 4.5 by `ui/__tests__/palette-contrast.test.ts` row 16 (measured 5.80), so recomputing
 * it here would be the tautology U2.2's consume-me warns about (R10). What is NOT pinned
 * anywhere else is that THIS consumer reaches for that pair: the phone's own comment
 * (`CalendarPicker.styles.ts:62-67`) says a date numeral is normal-size text with no AA-large
 * relief, so the flat mid-tone `primary` it used to sit on — 3.73:1 — was the defect.
 */
describe('Calendar day-cell recipe (A59 / A73)', () => {
  const cell = (name: string) => screen.getByRole('button', { name })

  it('fills the selected day with primaryDark and its numeral with onPrimary', () => {
    setup({ selected: { y: 2025, mo: 3, d: 8 } })
    const selected = cell('8')
    expect(selected.style.backgroundColor).toBe(jsdomColor(colors.primaryDark))
    expect(selected.style.color).toBe(jsdomColor(colors.onPrimary))
  })

  it('leaves an unselected day transparent and in the body text colour', () => {
    setup({ selected: { y: 2025, mo: 3, d: 8 } })
    const plain = cell('9')
    expect(plain.style.backgroundColor).toBe('transparent')
    expect(plain.style.color).toBe(jsdomColor(colors.text))
  })

  /**
   * `withAlpha(primary, 0.5)`, not the 0.25 `T.primaryEdge` the demo had — the phone's ring is
   * the ONLY mark on today's cell (`CalendarPicker.styles.ts:78-81`, `:203-212`: "border ring
   * treatment, NOT background fill"), so half the alpha meant half of the only cue.
   */
  it('rings today at the phone alpha, and only when it is not also the selection', () => {
    setup({ selected: { y: 2025, mo: 3, d: 15 } })
    expect(cell('8').style.borderColor).toBe(jsdomColor(withAlpha(colors.primary, 0.5)))
    // Selected wins: the ring would compete with the fill.
    expect(cell('15').style.borderColor).toBe('transparent')
  })

  it('titles the month in textSecondary — the flat token, not a third muted tone', () => {
    setup()
    expect(screen.getByText('March 2025').style.color).toBe(jsdomColor(colors.textSecondary))
  })
})
