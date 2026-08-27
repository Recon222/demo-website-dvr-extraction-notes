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

/**
 * The drum-curvature fade's outer stops (A39 / A59).
 *
 * HAND-COMPUTED, not read off the module under test. `rgb(6, 37, 70)` is
 * `rgba(0,24,50,0.6)` source-over `#0e3965` — 0*0.6 + 14*0.4 = 5.6 -> 6, 24*0.6 + 57*0.4 = 37.2
 * -> 37, 50*0.6 + 101*0.4 = 70.4 -> 70 — and `rgb(7, 45, 83)` is the lower stop at 0.5 the same
 * way. Composing the expectation with `flattenOver` here would restate production and pass over
 * any wrong ground.
 *
 * The mutation this exists for is the one the PHONE shipped: `withAlpha(stop, 1)` instead of
 * `flattenOver`, which discards the alpha rather than compositing it and painted the drum at
 * `#060c16`, 27.77 CIE76 dE from its own sheet (`with-alpha.ts:56-65`). That mutation lands
 * `rgb(0, 24, 50)` here, which is darker than the well on every channel — so the fade would
 * paint a black band at both edges of the drum instead of disappearing into it.
 */
describe('TimeWheel drum-curvature fade', () => {
  it('ends at the well composited onto the panel, never at the raw well stop', () => {
    const { container } = render(<TimeWheel value={{ h: 0, mi: 0, s: 0 }} onChange={vi.fn()} />)
    // The drum ROOT also paints a `linear-gradient(180deg` (the well); the fade is the one with
    // explicit percentage stops. Matching on the prefix alone silently reads the well.
    const fade = Array.from(container.querySelectorAll('div')).find((d) =>
      d.style.backgroundImage.includes('42%'),
    ) as HTMLElement
    expect(fade.style.backgroundImage).toContain('rgb(6, 37, 70) 0%')
    expect(fade.style.backgroundImage).toContain('rgb(7, 45, 83) 100%')
    // `withAlpha(stop, 1)` — the phone's own shipped defect — lands these instead.
    expect(fade.style.backgroundImage).not.toContain('rgb(0, 24, 50)')
    expect(fade.style.backgroundImage).not.toContain('rgb(0, 32, 64)')
  })
})
