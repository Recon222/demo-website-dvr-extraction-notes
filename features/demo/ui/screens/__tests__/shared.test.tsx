import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateTimeField, WizardNext } from '@/features/demo/ui/screens/_shared'
import { ElevatedEdges, PrimaryButtonGradient } from '@/features/demo/ui/controls/button-recipe'
import { palette } from '@/features/demo/ui/tokens/palette'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'

// The old datetime-local DateTimeField was replaced by the custom Date/Time picker
// (features/demo/ui/inputs/*). The canonical "seconds always present" guarantee now lives
// in engine/logic/datetime-parts (formatStored/mergeDate/mergeTime), exercised here at the
// _shared boundary.
beforeEach(() => stubClock())
afterEach(() => vi.restoreAllMocks())

describe('_shared.DateTimeField', () => {
  it('renders separate Date and Time buttons (no datetime-local input)', () => {
    const { container } = render(<DateTimeField label="Start" value="2025-03-08 23:45:00" onChange={vi.fn()} />)
    expect(container.querySelector('input[type="datetime-local"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Set date' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set time' })).toBeInTheDocument()
  })

  it('emits a canonical "YYYY-MM-DD HH:MM:SS" string (seconds always present) on edit', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateTimeField label="Start" value="2025-03-08 23:45:00" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Set date' }))
    await user.click(screen.getByRole('button', { name: '9' }))
    expect(onChange).toHaveBeenCalledWith('2025-03-09 23:45:00')
    expect(onChange.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})

describe('_shared.WizardNext — the primary CTA ten wizard screens render (A64/A50/A51/A68)', () => {
  it('paints the gradient, both elevation edges and the CTA shadow from the shared recipe', () => {
    // The second ADOPTION pin (the first is `UserProfilePane.test.tsx`, on `outline`). `primary`
    // is the variant with the most to get wrong — a gradient, two edge colours the phone keeps
    // deliberately non-palette, a drop shadow and a text shadow — and `WizardNext` is the
    // highest-leverage consumer in the demo.
    render(<WizardNext label="Continue" onClick={vi.fn()} />)
    const cta = screen.getByRole('button', { name: 'Continue' })

    // A50: the re-based CTA pair, read off the record rather than retyped.
    // jsdom rewrites a gradient's hex stops to `rgb(...)`, so the expectation is DERIVED from
    // the constant rather than retyped — the same device `TerminalLine.test.tsx:116` uses. A pin
    // that compared hex strings here would be green over an empty declaration.
    expect(cta.style.background).toBe(
      `linear-gradient(180deg, ${hexToJsdomRgb(PrimaryButtonGradient.dark[0])}, ${hexToJsdomRgb(PrimaryButtonGradient.dark[1])})`,
    )

    // A51: lit top, grounded bottom, transparent sides — four LONGHANDS, no shorthand.
    expect(cta.style.borderTopColor).toBe(ElevatedEdges.dark.top)
    expect(cta.style.borderBottomColor).toBe(ElevatedEdges.dark.bottom)
    expect(cta.style.borderLeftColor).toBe('transparent')
    expect(cta.style.borderRightColor).toBe('transparent')

    // A64: the drop shadow replaces the demo's hand-rolled `0 6px 18px rgba(37,128,173,0.35)`,
    // which `CompletionScreen`'s own CTA duplicated byte for byte (demo §3.1).
    expect(cta.style.boxShadow).toBe('0 6px 20px rgba(0, 0, 0, 0.45)')
    expect(cta.style.textShadow).toBe('0 1px 1px rgba(255, 255, 255, 0.06)')

    // A68: the size step the phone defaults to. The demo had `padding: 14` and no min-height.
    expect(cta.style.minHeight).toBe('48px')
    expect(cta.style.padding).toBe('16px 24px')
    expect(cta.style.fontSize).toBe('16px')
    expect(cta.style.color).toBe('rgb(255, 255, 255)') // `onPrimary`, not the old `#fff` literal
    expect(palette.dark.onPrimary).toBe('#ffffff')
  })
})

/** jsdom normalizes hex inline colours to rgb(r, g, b). Same helper as `TerminalLine.test.tsx:116`. */
function hexToJsdomRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}
