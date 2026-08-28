import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { TimeWheel, indexFromScrollTop } from '@/features/demo/ui/inputs/TimeWheel'
import { activeScheme } from '@/features/demo/ui/tokens/palette'
import { T } from '@/features/demo/ui/inputs/input-theme'

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
 *
 * W4/F85 — the four numbers are now hand-computed PER SCHEME rather than for dark alone. Still
 * hand-computed, for the reason above: routing the expectation back through `flattenOver` and
 * the same two tokens production reads would move both sides together and pass over a wrong
 * ground. Light's arithmetic, shown the same way: the well is `rgba(203,213,225,0.45)` /
 * `rgba(226,232,240,0.35)` (`glass-tiers.ts` light.recessed, phone `Colors.ts:339`) over
 * `T.raised` = `backgroundSecondary` `#f9fafb` (249,250,251) — 203*.45 + 249*.55 = 228.3 -> 228,
 * 213*.45 + 250*.55 = 233.35 -> 233, 225*.45 + 251*.55 = 239.3 -> 239; and the lower stop at
 * 0.35 the same way -> 241, 244, 247.
 */
const FADE =
  activeScheme === 'dark'
    ? {
        top: 'rgb(6, 37, 70)',
        bottom: 'rgb(7, 45, 83)',
        rawTop: 'rgb(0, 24, 50)',
        rawBottom: 'rgb(0, 32, 64)',
      }
    : {
        top: 'rgb(228, 233, 239)',
        bottom: 'rgb(241, 244, 247)',
        rawTop: 'rgb(203, 213, 225)',
        rawBottom: 'rgb(226, 232, 240)',
      }

describe('TimeWheel per-column barrel (DP-6)', () => {
  const barrels = (c: HTMLElement) =>
    Array.from(c.querySelectorAll('[data-wheel-barrel]')) as HTMLElement[]

  it('paints one barrel PER COLUMN, not one fade across the drum', () => {
    const { container } = render(<TimeWheel value={{ h: 0, mi: 0, s: 0 }} onChange={vi.fn()} />)
    // The finding itself: the old single overlay spanned all three columns AND both gutters,
    // which is what made the drum read as one slab instead of three cylinders.
    expect(barrels(container).map((b) => b.dataset.wheelBarrel)).toEqual(['h', 'mi', 's'])
  })

  it('ends at the well composited onto the panel, never at the raw well stop', () => {
    const { container } = render(<TimeWheel value={{ h: 0, mi: 0, s: 0 }} onChange={vi.fn()} />)
    for (const barrel of barrels(container)) {
      const g = barrel.style.backgroundImage
      expect(g).toContain(`${FADE.top} 0%`)
      expect(g).toContain(`${FADE.bottom} 100%`)
      // `withAlpha(stop, 1)` — the phone's own shipped defect — lands the raw well stops.
      expect(g).not.toContain(FADE.rawTop)
      expect(g).not.toContain(FADE.rawBottom)
      // The retired fourth navy `#0f2035` the old fade ramped through. Every stop is now
      // derived from the well, so this must not reappear in any spelling.
      expect(g).not.toContain('15, 32, 53')
    }
  })

  it('carries the phone’s 13 stops, clear across the middle row', () => {
    const { container } = render(<TimeWheel value={{ h: 0, mi: 0, s: 0 }} onChange={vi.fn()} />)
    const g = barrels(container)[0].style.backgroundImage
    // `getGradientOverlayProps` (`TimePicker.styles.ts:332-349`) — 13 stops. The count is what
    // separates a real barrel from a two-stop fade wearing the same outer colours.
    expect(g.match(/\d+%/g)).toHaveLength(13)
    // The clear middle is what makes the selection band emergent rather than an element.
    expect(g).toMatch(/,\s*rgba\([^)]*,\s*0\)\s*50%/)
  })

  it('has no drum-wide band or fade left', () => {
    const { container } = render(<TimeWheel value={{ h: 0, mi: 0, s: 0 }} onChange={vi.fn()} />)
    // The old band was the only element painting `T.primaryEdge`; the old fade the only one with
    // a 42% stop. Both are gone — the wash now lives on every ROW and the fade on every COLUMN.
    const html = container.innerHTML
    expect(html).not.toContain('42%')
    expect(html).not.toContain(T.primaryEdge)
  })
})
