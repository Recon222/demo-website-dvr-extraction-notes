import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateTimeField, SectionCard, WizardNext } from '@/features/demo/ui/screens/_shared'
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

describe('_shared.SectionCard — the phone `FormSection` glass recipe (A77 / U6.1)', () => {
  /**
   * The demo renders `FormSection`'s GLASS branch only — all five consumers are glass sections —
   * so the values below are `FormSection.tsx:150-200`'s `glassContainer` + `glassGradient` +
   * `header` + `title`, resolved through `Layout.spacing` / `Typography.fontSize`.
   */
  it('paints the section geometry: 24 outer, 16 padding, clipped, over an 18/600 title', () => {
    const { container } = render(<SectionCard title="Basic DVR Details">body</SectionCard>)
    const card = container.firstElementChild as HTMLElement

    // `glassContainer` (`:155-160`): `marginBottom: Layout.spacing.lg` (24, was 18),
    // `overflow: 'hidden'`. Radius, shadow and the lit edge arrive with `glassCard` (U1.2).
    expect(card.style.marginBottom).toBe('24px')
    expect(card.style.overflow).toBe('hidden')
    // `glassGradient` (`:171-175`): `padding: Layout.spacing.md`.
    expect(card.style.padding).toBe('16px')

    const title = screen.getByText('Basic DVR Details')
    // `title` (`:184-187`): `Typography.fontSize.lg` / `fontWeight.semibold`, `colors.text`.
    // 17 -> 18 is plan §4.9's ladder step, not a re-tune.
    expect(title.style.fontSize).toBe('18px')
    expect(title.style.fontWeight).toBe('600')
    expect(title.style.color).toBe(hexToJsdomRgb(palette.dark.text))
    // `header` (`:176-183`): `paddingBottom: spacing.sm`, `borderBottomWidth: 1`, and
    // `marginBottom: spacing.md` SUMMED with `content`'s `marginTop: spacing.sm` (`:198`) —
    // see the component docblock for why the web spells the pair as one 24.
    expect(title.style.paddingBottom).toBe('8px')
    expect(title.style.marginBottom).toBe('24px')
    expect(title.style.borderBottomWidth).toBe('1px')
  })

  it('leaves the header rule TRANSPARENT, because the section is glass (`:75`)', () => {
    // `borderBottomColor: glass ? 'transparent' : colors.border`. The demo painted
    // `GLASS.border` here; on the phone a glass section's title rule is invisible and the
    // 1px only holds its place in the layout.
    render(<SectionCard title="Retention">body</SectionCard>)
    expect(screen.getByText('Retention').style.borderBottomColor).toBe('transparent')
  })

  it('renders NOTHING when every child is gated off (`:118-120`)', () => {
    // Form Customization gates fields, and a section whose every field is hidden must not
    // leave an empty titled box. `Children.toArray` drops false/null/undefined, so an
    // all-`{show && <Field/>}` section resolves to [].
    const show = false
    const { container } = render(
      <SectionCard title="Requester Information">
        {show && <div>Requester Name</div>}
        {show && <div>Requester Badge</div>}
      </SectionCard>,
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Requester Information')).not.toBeInTheDocument()
  })

  it('still renders when ONE child survives the gate', () => {
    // The negative control for the clause above: the guard must key off the children, not
    // off some property every mount shares.
    render(
      <SectionCard title="Requester Information">
        {false && <div>Requester Name</div>}
        <div>Requester Badge</div>
      </SectionCard>,
    )
    expect(screen.getByText('Requester Information')).toBeInTheDocument()
  })
})

/** jsdom normalizes hex inline colours to rgb(r, g, b). Same helper as `TerminalLine.test.tsx:116`. */
function hexToJsdomRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}
