import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Accordion, AddRowButton, DateTimeField, Field, SectionCard, WizardNext } from '@/features/demo/ui/screens/_shared'
import { ElevatedEdges, PrimaryButtonGradient } from '@/features/demo/ui/controls/button-recipe'
import { colors, scheme, type ColorScheme } from '@/features/demo/ui/tokens/palette'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'
import { spacing } from '@/features/demo/ui/tokens/scale'
import { conflictingStyleWarnings } from '@/vitest.setup'

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

/**
 * A64's two shadows, both arms. `button-recipe.ts:179-188` spells them as inline scheme
 * ternaries rather than as a `Record<ColorScheme, string>`, so there is nothing to index the
 * way `ElevatedEdges` and `PrimaryButtonGradient` are indexed below; transcribing both arms
 * here keeps the pin exact under either scheme instead of asserting whichever one ships today.
 * Values from `button-recipe.ts:182-183` / `:187-188` (phone A64's RN five-prop mapping).
 */
const CTA_DROP_SHADOW = {
  light: '0 6px 20px rgba(30, 58, 138, 0.22)',
  dark: '0 6px 20px rgba(0, 0, 0, 0.45)',
} as const satisfies Record<ColorScheme, string>
const CTA_TEXT_SHADOW = {
  light: '0 1px 1px rgba(0, 0, 0, 0.1)',
  dark: '0 1px 1px rgba(255, 255, 255, 0.06)',
} as const satisfies Record<ColorScheme, string>

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
      `linear-gradient(180deg, ${hexToJsdomRgb(PrimaryButtonGradient[scheme][0])}, ${hexToJsdomRgb(PrimaryButtonGradient[scheme][1])})`,
    )

    // A51: lit top, grounded bottom, transparent sides — four LONGHANDS, no shorthand.
    expect(cta.style.borderTopColor).toBe(ElevatedEdges[scheme].top)
    expect(cta.style.borderBottomColor).toBe(ElevatedEdges[scheme].bottom)
    expect(cta.style.borderLeftColor).toBe('transparent')
    expect(cta.style.borderRightColor).toBe('transparent')

    // A64: the drop shadow replaces the demo's hand-rolled `0 6px 18px rgba(37,128,173,0.35)`,
    // which `CompletionScreen`'s own CTA duplicated byte for byte (demo §3.1).
    // W4/F85: transcribed per ARM, not per current scheme. Unlike its `ElevatedEdges` /
    // `PrimaryButtonGradient` siblings the pair has no exported record to index —
    // `button-recipe.ts:179-188` forks it inline — so the record lives here until it is lifted.
    expect(cta.style.boxShadow).toBe(CTA_DROP_SHADOW[scheme])
    expect(cta.style.textShadow).toBe(CTA_TEXT_SHADOW[scheme])

    // A68: the size step the phone defaults to. The demo had `padding: 14` and no min-height.
    expect(cta.style.minHeight).toBe('48px')
    expect(cta.style.padding).toBe('16px 24px')
    expect(cta.style.fontSize).toBe('16px')
    expect(cta.style.color).toBe('rgb(255, 255, 255)') // `onPrimary`, not the old `#fff` literal
    expect(colors.onPrimary).toBe('#ffffff')
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
    expect(title.style.color).toBe(hexToJsdomRgb(colors.text))
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

describe('_shared.Accordion — the phone `FormSection` NON-glass collapsible (DP-5)', () => {
  /**
   * `NewCaseModal.tsx:333-334`/`:367-368` pass `collapsible` WITHOUT `glass`, so the counterpart
   * is `FormSection`'s non-glass branch (`:142-147`) whose whole styling is `marginBottom:
   * Layout.spacing.lg`. The demo painted a card there instead — prototype furniture whose ground
   * was the retired navy in its rgb spelling.
   */
  const render1 = () =>
    render(
      <Accordion title="Officer in Charge">
        <div>OIC Name</div>
      </Accordion>,
    )

  it('paints no card — no fill, no border, no radius', () => {
    const { container } = render1()
    const details = container.querySelector('details') as HTMLElement
    expect(details.style.background).toBe('')
    expect(details.style.border).toBe('')
    expect(details.style.borderRadius).toBe('')
    expect(details.style.marginBottom).toBe(`${spacing.lg}px`)
  })

  it('rules the header off with a 1px `colors.border` edge, per side', () => {
    const { container } = render1()
    const summary = container.querySelector('summary') as HTMLElement
    // Per side, never the shorthand — jsdom does not decompose `borderBottom` (HANDOFF §4).
    expect(summary.style.borderBottomWidth).toBe('1px')
    expect(summary.style.borderBottomStyle).toBe('solid')
    expect(summary.style.borderBottomColor).toBe(hexToJsdomRgb(colors.border))
    expect(summary.style.paddingBottom).toBe(`${spacing.sm}px`)
    expect(summary.style.marginBottom).toBe(`${spacing.md}px`)
    // `fontSize.lg` / semibold — the phone's `styles.title`, not the old 14/600 field-label size.
    expect(summary.style.fontSize).toBe('18px')
    expect(summary.style.fontWeight).toBe('600')
  })

  it('opens by default and swaps a `−`/`+` glyph, not a chevron', async () => {
    const user = userEvent.setup()
    const { container } = render1()
    const details = container.querySelector('details') as HTMLDetailsElement
    // Phone `FormSection.tsx:60` — `defaultCollapsed = false`, and neither call site overrides it.
    expect(details.open).toBe(true)
    expect(screen.getByText('−')).toBeInTheDocument()
    expect(container.querySelector('.demo-accordion-chevron')).toBeNull()

    await user.click(container.querySelector('summary') as HTMLElement)
    expect(details.open).toBe(false)
    expect(screen.getByText('+')).toBeInTheDocument()
  })
})

describe('_shared.Field — the phone `TextInput` label/help/error typography (A72 / U6.1)', () => {
  /** Values from `src/components/common/TextInput.tsx:150-190` @ `dd5551ec`. */
  it('sets the label 14/500 in `colors.text`, 4 above the box, 16 below the block', () => {
    const { container } = render(<Field label="Case Number" value="" onChange={vi.fn()} />)
    const block = container.firstElementChild as HTMLElement
    // `container:151-153` — `marginBottom: Layout.spacing.md` (was 14).
    expect(block.style.marginBottom).toBe('16px')

    const label = screen.getByText('Case Number')
    // `label:158-161` — `fontSize.sm` / `fontWeight.medium`; `:105` paints `colors.text`.
    // The demo's `#cdd9e6` is not a palette token at all.
    expect(label.style.fontSize).toBe('14px')
    expect(label.style.fontWeight).toBe('500')
    expect(label.style.color).toBe(hexToJsdomRgb(colors.text))
    // `labelContainer:155-157` — `marginBottom: Layout.spacing.xs` (was 6).
    expect(label.style.marginBottom).toBe('4px')
  })

  it('paints the required asterisk from `colors.error` (`:110`)', () => {
    render(<Field label="Unit" required value="" onChange={vi.fn()} />)
    expect(screen.getByText('*').style.color).toBe(hexToJsdomRgb(colors.error))
  })

  it('sets the helper line 14 in `textSecondary`, 4 below the box', () => {
    // `helperContainer:181-183` + `helperText:184-186` — `spacing.xs` / `fontSize.sm`; `:133`
    // paints `colors.textSecondary`. The demo's `#7a9fc4` is `textTertiary`, which D5's rider
    // forbids taking on NEW text (3.81:1 worst dark glass vs `textSecondary`'s 5.24).
    render(<Field label="Display Name" value="" onChange={vi.fn()} hint="Friendly name for case" />)
    const hint = screen.getByText('Friendly name for case')
    expect(hint.style.fontSize).toBe('14px')
    expect(hint.style.color).toBe(hexToJsdomRgb(colors.textSecondary))
    expect(hint.style.marginTop).toBe('4px')
  })

  it('carries the error SEVERITY on the icon and the MESSAGE in `colors.text` (C.3 rule 1)', () => {
    // The phone spells this line `color: colors.error` (`:128`, `errorText:185`). Matrix §C.3
    // rule 1 — adjudicated-closed `P8-DEF-A`, "the single most portable recipe in the whole
    // ledger" — forbids exactly that, and names `#ff6b78` (this site's colour) among the six
    // the demo ships "doing exactly what this rule forbids". Measured on the dark glass
    // grounds `palette-contrast.test.ts` composites: `#ff6b78` 3.84 worst, `colors.error`
    // 3.16 worst — so porting the phone verbatim would LOWER it. Severity moves to the icon
    // (a non-text mark: 3.16 clears 1.4.11's 3.0) and the message takes `colors.text` (9.56).
    render(<Field label="Case Number" value="" onChange={vi.fn()} error="Case number is required" />)
    const alert = screen.getByRole('alert')
    expect(alert.style.color).toBe(hexToJsdomRgb(colors.text))
    expect(alert.style.fontSize).toBe('14px')
    expect(alert.style.marginTop).toBe('4px')

    const icon = alert.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveAttribute('stroke', colors.error)
    // The colour is on the ICON, not on the text — the two must not be the same value, or the
    // rule was not applied. This is the relational half the value pins cannot express.
    expect(alert.style.color).not.toBe(hexToJsdomRgb(colors.error))
  })

  it('gives the multiline box the phone `styles.multiline` height (`:176`)', () => {
    render(<Field label="Notes" multiline value="" onChange={vi.fn()} />)
    expect(screen.getByRole('textbox').style.minHeight).toBe('100px')
  })

  it('keeps ONE border declaration across an error toggle on a MOUNTED field (ledger I-7)', () => {
    // The tripwire (`vitest.setup.ts:41-48`) declares itself the sole guard for W1's `Field`
    // error-border fix, with "transitive" coverage from the consumer suites. W2's integration
    // probe proved that false: reintroducing the split (error branch declares `borderColor`,
    // the other declares `border`) left the screens and inputs suites entirely green, because
    // NOTHING toggles `error` on a mounted `Field`. This drives that transition in both
    // directions.
    //
    // WHAT ACTUALLY KILLS THE MUTANT, measured (probe M15, `probe-u6.1-pins` @ a993ee3):
    // the BORDER VALUE assertions below, not the tripwire. Re-applying W2's exact split makes
    // this file exit 1 on `expected '' to be '2px solid rgb(255, 71, 87)'` — jsdom does not
    // synthesise `style.border` from the three longhands, so the error state reads empty —
    // while `conflictingStyleWarnings` stays EMPTY and React logs nothing. So I-7 understated
    // its own case: for this defect shape the tripwire is not merely un-driven, it does not
    // fire at all, and a VALUE pin is the only guard available. The emptiness assertion below
    // is kept because it is a true property of this transition, but it is not the catch.
    const { rerender } = render(<Field label="Case Number" value="x" onChange={vi.fn()} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.style.border).toBe(`1px solid ${hexToJsdomRgb(colors.border)}`)

    rerender(<Field label="Case Number" value="x" onChange={vi.fn()} error="Case number is required" />)
    expect(input.style.border).toBe(`2px solid ${hexToJsdomRgb(colors.error)}`)

    rerender(<Field label="Case Number" value="x" onChange={vi.fn()} />)
    expect(input.style.border).toBe(`1px solid ${hexToJsdomRgb(colors.border)}`)

    // Asserted HERE as well as in the setup's `afterEach`, so a future shape that DOES trip
    // React names this transition rather than arriving detached at the end of the file.
    expect(conflictingStyleWarnings).toEqual([])
  })
})

describe('_shared.AddRowButton — the "+ Add …" affordance the three array screens render', () => {
  it('paints the label from `link`, never the accent-as-text the demo used (A66/A27)', () => {
    // `#4BA3D4` as 14/600 measures 3.77 worst on the dark glass grounds; `link` measures 6.90.
    // DEF-UI-018's rule reaches this control even though it is not one of A66's six outline
    // sites — the border stays the dashed `borderLight` the row ratified, because the LABEL is
    // what carries the affordance here.
    render(<AddRowButton label="+ Add Camera" onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: '+ Add Camera' })
    expect(btn.style.color).toBe(hexToJsdomRgb(colors.link))
    expect(btn.style.color).not.toBe(hexToJsdomRgb(colors.primaryLight))
    // `radius.control` (10) and `spacing.base` (12) — the lifted values, now named.
    expect(btn.style.borderRadius).toBe('10px')
    expect(btn.style.padding).toBe('12px')
    expect(btn.style.borderStyle).toBe('dashed')
    expect(btn.style.borderColor).toBe(hexToJsdomRgb(colors.borderLight))
  })
})

/** jsdom normalizes hex inline colours to rgb(r, g, b). Same helper as `TerminalLine.test.tsx:116`. */
function hexToJsdomRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}
