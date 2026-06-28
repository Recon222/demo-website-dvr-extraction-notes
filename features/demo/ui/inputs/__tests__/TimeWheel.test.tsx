import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { TimeWheel, indexFromScrollTop } from '@/features/demo/ui/inputs/TimeWheel'

const ROW = 44

function col(container: HTMLElement, which: 'h' | 'mi' | 's'): HTMLElement {
  return container.querySelector(`[data-wheel-col="${which}"]`) as HTMLElement
}

describe('indexFromScrollTop (pure)', () => {
  it('rounds scrollTop/rowH to the nearest index', () => {
    expect(indexFromScrollTop(0, ROW, 24)).toBe(0)
    expect(indexFromScrollTop(13 * ROW, ROW, 24)).toBe(13)
    expect(indexFromScrollTop(13 * ROW + 10, ROW, 24)).toBe(13) // rounds down
    expect(indexFromScrollTop(13 * ROW + 30, ROW, 24)).toBe(14) // rounds up
  })
  it('clamps below 0 and above count-1', () => {
    expect(indexFromScrollTop(-50, ROW, 24)).toBe(0)
    expect(indexFromScrollTop(999 * ROW, ROW, 60)).toBe(59)
  })
})

describe('TimeWheel', () => {
  it('renders three columns (h / mi / s)', () => {
    const { container } = render(<TimeWheel value={{ h: 0, mi: 0, s: 0 }} onChange={vi.fn()} />)
    expect(col(container, 'h')).toBeTruthy()
    expect(col(container, 'mi')).toBeTruthy()
    expect(col(container, 's')).toBeTruthy()
  })

  it('reflects the controlled value as the initial scroll position', () => {
    const { container } = render(<TimeWheel value={{ h: 12, mi: 5, s: 30 }} onChange={vi.fn()} />)
    expect(col(container, 'h').scrollTop).toBe(12 * ROW)
    expect(col(container, 'mi').scrollTop).toBe(5 * ROW)
    expect(col(container, 's').scrollTop).toBe(30 * ROW)
  })

  it('calls onChange with the snapped value after a scroll settles', () => {
    const onChange = vi.fn()
    const { container } = render(<TimeWheel value={{ h: 12, mi: 5, s: 30 }} onChange={onChange} />)
    const hours = col(container, 'h')
    hours.scrollTop = 13 * ROW
    fireEvent.scroll(hours)
    expect(onChange).toHaveBeenCalledWith({ h: 13, mi: 5, s: 30 })
  })

  it('clamps to the column range', () => {
    const onChange = vi.fn()
    const { container } = render(<TimeWheel value={{ h: 12, mi: 5, s: 30 }} onChange={onChange} />)
    const seconds = col(container, 's')
    seconds.scrollTop = 70 * ROW // beyond 59
    fireEvent.scroll(seconds)
    expect(onChange).toHaveBeenCalledWith({ h: 12, mi: 5, s: 59 })
  })

  it('re-syncs scroll position when the value prop changes', () => {
    const { container, rerender } = render(<TimeWheel value={{ h: 12, mi: 5, s: 30 }} onChange={vi.fn()} />)
    rerender(<TimeWheel value={{ h: 7, mi: 5, s: 30 }} onChange={vi.fn()} />)
    expect(col(container, 'h').scrollTop).toBe(7 * ROW)
  })
})
