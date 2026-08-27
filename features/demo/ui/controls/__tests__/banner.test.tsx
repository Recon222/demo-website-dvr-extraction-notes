import { describe, it, expect } from 'vitest'
import { render, within } from '@testing-library/react'

import { Banner, type BannerSeverity } from '@/features/demo/ui/controls/Banner'
import { colors, palette } from '@/features/demo/ui/tokens/palette'

/**
 * A71 / U3.3. The phone's `src/components/common/__tests__/Banner.test.tsx` split into the two
 * halves it names, and the split is load-bearing (phone `:37-40`, verbatim):
 *
 *   *"The other half — that Banner actually RENDERS the pair it measures here — lives in
 *   'paints $severity from its own tokens'. Neither block is sufficient alone: this one never
 *   renders a Banner, and that one would pass over a foreground rewired to any colour if it
 *   only read the container."*
 *
 * WHERE THE TWO HALVES DIVERGE FROM THE PHONE'S SUITE, and why:
 *
 *  - The phone renders BOTH schemes through `ForceColorScheme`. The demo has no theme context —
 *    `colors` is `palette[scheme]` with `scheme = 'dark'` at one site (plan §9 clause 12) — so
 *    the RENDER half can only observe dark. The LIGHT half is therefore held at the tokens, in
 *    the contrast and opacity blocks, which is the same shape `palette-contrast.test.ts` uses
 *    for every light row nothing renders yet. A light-half render pin arrives with the flip.
 *  - The contrast block lives here rather than in `palette-contrast.test.ts` for two reasons:
 *    it is where the phone keeps it, and that file is concurrently open to U3.2 this wave.
 *    It needs none of that file's compositing machinery *because the fill is opaque* — which is
 *    itself the thing the opacity block below proves, so the two are a pair.
 */

const SEVERITIES: BannerSeverity[] = ['info', 'warning', 'error', 'success']
const SCHEMES = ['light', 'dark'] as const

/** jsdom rewrites every inline colour to `rgb()`; pins compare against the TOKEN, never a retyped literal. */
const rgb = (hex: string): string => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/** WCAG 2.1 relative luminance — phone `Banner.test.tsx:16-28`, verbatim in behaviour. */
function luminance(hex: string): number {
  const linear = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const mount = (props: Partial<React.ComponentProps<typeof Banner>> = {}) => {
  const { container } = render(<Banner severity="info" message="Heads up" {...props} />)
  const box = container.firstElementChild as HTMLElement
  return { box, icon: box.querySelector('svg') as SVGElement, message: box.lastElementChild as HTMLElement }
}

describe('Banner — the token pairs (ruling D8a, phone Banner.test.tsx:41-55)', () => {
  it.each(SCHEMES)('every severity clears WCAG AA 4.5:1 in %s mode', (scheme) => {
    const c = palette[scheme]
    // Collected rather than asserted one at a time, so a failure names the offending severity
    // and its measured ratio in the diff (phone `:44-45`). A later re-tint of any status colour
    // fails HERE rather than silently shipping unreadable copy.
    const belowAA = SEVERITIES.map((severity) => ({
      severity,
      ratio: Number(contrastRatio(c[`${severity}OnLight`], c[`${severity}Light`]).toFixed(2)),
    })).filter(({ ratio }) => ratio < 4.5)

    expect(belowAA).toEqual([])
  })

  it('keeps every `*Light` fill OPAQUE, in both halves — the AA guarantee depends on it', () => {
    // Phone `Banner.tsx:11-16`: the `*OnLight` foregrounds are measured against the `*Light`
    // tones, and that only holds if the fill IS that tone. A translucent fill composites over an
    // unknown parent and the block above becomes unmeasurable — it would keep passing while the
    // shipped surface failed. So the ratio pin is only worth what this pin is worth.
    const translucent = SCHEMES.flatMap((scheme) =>
      SEVERITIES.map((severity) => ({ scheme, severity, fill: palette[scheme][`${severity}Light`] })).filter(
        // 6-digit hex only: no 8-digit `#rrggbbaa`, no `rgba()`, no `color-mix()`.
        ({ fill }) => !/^#[0-9a-f]{6}$/i.test(fill),
      ),
    )
    expect(translucent, 'a Banner fill gained an alpha channel — see Banner.tsx:11-16').toEqual([])
  })
})

describe('Banner — what it renders (phone Banner.tsx:45-99)', () => {
  it.each(SEVERITIES)('paints %s from its own three tokens', (severity) => {
    const { box, icon, message } = mount({ severity })

    // phone `:69` — fill and border are two different tokens on purpose. In DARK all four
    // `*OnLight` collapse to `#f0f4f8`, so the foreground carries no severity there and the
    // fill+border pair has to (phone CaseStatusBadge's `getStatusConfig` says the same).
    expect(box.style.backgroundColor).toBe(rgb(colors[`${severity}Light`]))
    expect(box.style.borderColor).toBe(rgb(colors[severity]))

    // phone `:79` — the half that has to be READ, asserted off the rendered node rather than
    // trusting the token pair alone. Rewiring Banner to the saturated accent — the exact defect
    // this component exists to eliminate — passes every container-only assertion above.
    expect(message.style.color).toBe(rgb(colors[`${severity}OnLight`]))
  })

  it.each(SEVERITIES)('gives %s an icon that takes the FOREGROUND, never the accent', (severity) => {
    const { icon } = mount({ severity })
    // phone `:49-51`, and this is a measured rule: as an icon the saturated accent drops to
    // 1.92-2.24:1 in three of the eight severity/scheme combinations. `stroke` is an SVG
    // attribute, so it reads back as the raw token rather than jsdom's `rgb()`.
    expect(icon.getAttribute('stroke')).toBe(colors[`${severity}OnLight`])
    expect(icon.getAttribute('stroke')).not.toBe(colors[severity])
  })

  it('draws a different glyph per severity — there is no `icon` prop to override it', () => {
    // phone `:30-35` + `1a17b33a` ("drop Banner's unused icon prop"). Four severities, four
    // shapes: a lookup that lost a branch and fell back to one glyph would leave the colour
    // pins above entirely green.
    const glyphs = SEVERITIES.map((severity) => mount({ severity }).icon.innerHTML)
    expect(new Set(glyphs).size).toBe(4)
  })

  it('lands the phone Banner.tsx:84-99 geometry', () => {
    const { box, icon, message } = mount()
    expect(box.style.display).toBe('flex')
    expect(box.style.alignItems).toBe('flex-start') // `:87`
    expect(box.style.gap).toBe('8px') // `:88` spacing.sm
    expect(box.style.borderRadius).toBe('8px') // `:90` borderRadius.md — the NESTED tier (D13)
    expect(box.style.borderWidth).toBe('1px') // `:91`
    expect(box.style.borderStyle).toBe('solid')
    expect(box.style.padding).toBe('12px') // `:92` spacing.base
    // `:95` — jsdom expands the `flex: 1` shorthand to its three longhands, so the pin reads
    // the expansion. `flexGrow` alone would pass over `flex: '1 1 auto'`, which is a different
    // box: `auto` sizes from the content, and a long message would then push the icon out.
    expect(message.style.flex).toBe('1 1 0%')
    expect(message.style.fontSize).toBe('14px') // `:96` fontSize.sm
    expect(message.style.lineHeight).toBe('21px') // `:97` 14 x lineHeight.normal
    expect(icon.getAttribute('width')).toBe('20') // `:73` iconSize.sm
    expect(icon.getAttribute('height')).toBe('20')
  })

  it('paints NO glass — the fill is one flat colour, not a gradient', () => {
    // A71's rule, restated as a pin: `backgroundImage` is where every glass fragment in this
    // repo puts its gradient, so an adopter "upgrading" a Banner to `glassCardNested` reds here.
    const { box } = mount()
    expect(box.style.backgroundImage).toBe('')
    expect(box.style.backgroundColor).not.toContain('rgba')
    expect(box.style.boxShadow).toBe('')
  })
})

describe('Banner — screen-reader semantics (phone Banner.tsx:55-77)', () => {
  it('is an alert whose accessible name carries the severity', () => {
    const { box } = mount({ severity: 'error', message: 'Import failed' })
    expect(box).toHaveAttribute('role', 'alert')
    // phone `:63`. Colour cannot carry severity to a screen reader, and in dark mode the
    // foreground is the same `#f0f4f8` for all four — so the label is the only carrier.
    expect(box).toHaveAttribute('aria-label', 'error: Import failed')
  })

  it.each([
    ['error', 'assertive'],
    ['warning', 'assertive'],
    ['info', 'polite'],
    ['success', 'polite'],
  ] as const)('announces %s as a %s live region', (severity, live) => {
    // phone `:64-68`. Urgent severities interrupt; the rest wait for a pause, so an info
    // note-box does not cut off whatever is being read. `role="alert"` IMPLIES assertive, so
    // dropping this attribute silently re-urgent-ifies info and success.
    expect(mount({ severity }).box).toHaveAttribute('aria-live', live)
  })

  it('hides the decorative icon from assistive tech and exposes the message text', () => {
    const { box, icon } = mount({ message: 'Codec selection is iOS only.' })
    expect(icon).toHaveAttribute('aria-hidden', 'true') // phone `:76-77`
    expect(within(box).getByText('Codec selection is iOS only.')).toBeInTheDocument()
  })
})

describe('Banner — the caller seams', () => {
  it('lets `style` add LAYOUT without displacing the recipe', () => {
    // phone `:69` composes `[styles.banner, {…tokens}, style]`, so a caller's margin lands and
    // the tokens still win over the stylesheet. Five phone call sites pass exactly a margin.
    const { box } = mount({ style: { marginBottom: 16 } })
    expect(box.style.marginBottom).toBe('16px')
    expect(box.style.padding).toBe('12px')
    expect(box.style.backgroundColor).toBe(rgb(colors.infoLight))
  })

  it('emits `testId` as `data-testid`, and omits the attribute otherwise', () => {
    expect(mount({ testId: 'import-picker-error' }).box).toHaveAttribute('data-testid', 'import-picker-error')
    expect(mount().box).not.toHaveAttribute('data-testid')
  })
})
