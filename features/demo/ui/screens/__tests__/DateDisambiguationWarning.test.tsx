import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { DateDisambiguationWarning } from '@/features/demo/ui/screens/DateDisambiguationWarning'
import { generateDisambiguationWarning, type DateDisambiguationResult } from '@/features/demo/engine/logic/date-disambiguation'
import { colors } from '@/features/demo/ui/tokens/palette'

/**
 * A71 / U3.3. The plan calls this "the cleanest adoption" because the phone did not restyle its
 * callout — it DELETED it and folded three strings into one Banner message
 * (`DateDisambiguationWarning.tsx:45-48`), without changing any of the three.
 *
 * The five defects the deleted callout carried are asserted as ABSENT rather than described,
 * because each one is a live regression shape: the phone's own docblock (`:19-28`) names a 2px
 * doubled border, a 4px left accent bar found nowhere else, a bare `!` glyph a screen reader
 * announced as an exclamation mark, and a heading painted `colors.warning` at 2.15:1. The demo
 * carried all four plus a translucent fill.
 */

const rgb = (hex: string): string => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/** A low-confidence MM/DD-vs-DD/MM ambiguity — the only state this component renders at all. */
const ambiguous: DateDisambiguationResult = {
  chosenDate: '2025-03-04',
  alternativeDate: '2025-04-03',
  chosenFormat: 'MM-DD',
  confidence: 'low',
  reason: 'equidistant',
  chosenDistanceDays: 10,
  alternativeDistanceDays: 10,
}

describe('DateDisambiguationWarning — the Banner adoption (A71)', () => {
  it('folds the three copy strings into ONE Banner message, unchanged (phone :47)', () => {
    render(<DateDisambiguationWarning result={ambiguous} />)
    const copy = generateDisambiguationWarning(ambiguous)
    // Built from the engine's own output, so a copy change moves the pin with it — and the
    // punctuation between the three parts is the phone's expression, not this file's opinion.
    expect(screen.getByRole('alert')).toHaveTextContent(`${copy.title}. ${copy.description} ${copy.suggestion}`)
    // Only ONE alert: the old callout was itself `role="alert"`, so a half-done adoption that
    // left the wrapper's role in place would announce the whole block twice.
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('paints that Banner from the warning trio, not the saturated accent', () => {
    render(<DateDisambiguationWarning result={ambiguous} />)
    const banner = screen.getByRole('alert')
    expect(banner.style.backgroundColor).toBe(rgb(colors.warningLight))
    expect(banner.style.borderColor).toBe(rgb(colors.warning))
    expect((banner.lastElementChild as HTMLElement).style.color).toBe(rgb(colors.warningOnLight))
    // §C.3 rule 1, and the phone's measured 2.15:1: `colors.warning` may not carry text here.
    expect((banner.lastElementChild as HTMLElement).style.color).not.toBe(rgb(colors.warning))
  })

  it('carries none of the five defects the deleted callout had', () => {
    const { container } = render(<DateDisambiguationWarning result={ambiguous} />)
    const box = container.firstElementChild as HTMLElement
    const banner = screen.getByRole('alert')
    // 1-2: the doubled 2px border and the 4px left accent bar (D4: "delete the 4px left accent").
    // jsdom expands `borderWidth` into four longhands, so `borderLeftWidth` reads `1px` rather
    // than `''` — assert all four are EQUAL, which is what "uniform four-sided border" means and
    // what a re-introduced `borderLeftWidth: 4` would break.
    expect([banner.style.borderTopWidth, banner.style.borderRightWidth, banner.style.borderBottomWidth, banner.style.borderLeftWidth]).toEqual(['1px', '1px', '1px', '1px'])
    // 3: the bare `!` badge. Banner's glyph is an SVG, and it is aria-hidden.
    expect(box.textContent).not.toContain('!')
    expect(banner.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    // 4: the heading. It no longer exists as its own node — the title is inside the message.
    expect(screen.queryByText('Date Format Ambiguity Detected')).toBeNull()
    // 5: the translucent fill, the reason the ratio above is measurable at all.
    expect(banner.style.backgroundColor).not.toContain('rgba')
    expect(banner.style.backgroundImage).toBe('')
  })

  it('lands the phone :93-114 values on the two dated interpretations', () => {
    render(<DateDisambiguationWarning result={ambiguous} />)
    const label = screen.getByText('Chosen Interpretation:')
    const chosen = label.nextElementSibling as HTMLElement
    const alternative = screen.getByText('Alternative:').nextElementSibling as HTMLElement

    expect(label.style.fontSize).toBe('12px') // `:108` fontSize.xs — was 11
    expect(label.style.marginBottom).toBe('2px') // `:109` spacing.xxs — was 3
    expect(label.style.color).toBe(rgb(colors.textSecondary)) // `:52` — was textTertiary
    expect(chosen.style.fontSize).toBe('14px') // `:112` fontSize.sm — was 13
    expect(chosen.style.fontWeight).toBe('500') // `:113` fontWeight.medium
    expect(chosen.style.color).toBe(rgb(colors.text)) // `:55`
    // `:61` — the alternative is deliberately quieter than the chosen one.
    expect(alternative.style.color).toBe(rgb(colors.textSecondary))
    expect(chosen).toHaveTextContent('Mar 4, 2025 (MM-DD)')
    expect(alternative).toHaveTextContent('Apr 3, 2025')
  })

  it('renders nothing at high confidence (phone :37-39)', () => {
    const { container } = render(<DateDisambiguationWarning result={{ ...ambiguous, confidence: 'high' }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
