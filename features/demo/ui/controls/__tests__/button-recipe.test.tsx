import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { CSSProperties } from 'react'

import {
  buttonStyle,
  DangerFill,
  ElevatedEdges,
  PrimaryButtonGradient,
  SAMPLE_TINT,
  type ButtonSize,
  type ButtonVariant,
} from '@/features/demo/ui/controls/button-recipe'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors, palette, scheme } from '@/features/demo/ui/tokens/palette'
import { radius, withAlpha } from '@/features/demo/ui/tokens/scale'

afterEach(cleanup)

/**
 * SEAM(U2.2) — the button recipe.
 *
 * Every expectation below is the phone's `src/components/common/Button.tsx` at `dd5551ec`,
 * cited inline. The per-scheme CONSTANTS are pinned in BOTH halves, because D2 says the light
 * door stays open and a half that nobody reads is a half nobody notices going wrong.
 *
 * W4/F85: the RESOLVED-value assertions compose from the CONSUMED scheme — `colors.*`,
 * `ElevatedEdges[scheme]`, `PrimaryButtonGradient[scheme]` — never from a hand-spelled dark
 * literal. `buttonStyle` is scheme-relative end to end (`button-recipe.ts:156-217`), so a pin
 * that spells one half asserts the recipe renders the OTHER scheme's palette the moment
 * `palette.ts`'s one-line switch moves, which is the opposite of what it means to say.
 */

/** jsdom normalizes hex inline colours to `rgb(r, g, b)`. Same local helper as four sibling files. */
const hexToJsdomRgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/**
 * The primary CTA's two shadows, both halves.
 *
 * `button-recipe.ts:179-188` gates these inline on `activeScheme` rather than exporting a
 * `{light,dark}` record the way `SHEET_SHADOWS` / `DIALOG_SHADOWS` do, so there is no constant
 * to derive from. Spelled here with the phone's `file:line`, in both halves, so this pins the
 * VALUES and the GATE: a mutation to either arm reds, and so does a gate stuck on one arm.
 */
const CTA_BOX_SHADOWS = {
  dark: '0 6px 20px rgba(0, 0, 0, 0.45)', // Button.tsx:128-132 (dark arm)
  light: '0 6px 20px rgba(30, 58, 138, 0.22)', // Button.tsx:128-132 (light arm), 1 x 0.22
} as const
const CTA_TEXT_SHADOWS = {
  dark: '0 1px 1px rgba(255, 255, 255, 0.06)', // Button.tsx:205-207 (dark arm)
  light: '0 1px 1px rgba(0, 0, 0, 0.1)', // Button.tsx:205-207 (light arm)
} as const

describe('the three per-scheme button constants', () => {
  it('carries `PrimaryButtonGradient` in both halves, dark sourced from the guard-read consts', () => {
    // Phone `Colors.ts:471-474`: `light: ['#2563eb', '#1d3584']`, `dark: [Colors.dark.primaryDark,
    // '#17527A']`. The dark pair is NOT retyped here: `.design-sync/check-rn-parity.mjs:459-460`
    // reads `ACCENT_FROM` / `ACCENT_TO` out of `glass-tokens.ts` with `readConst`, which matches
    // LITERALS and not identifier references, so those two consts must stay literal over there and
    // this record has to point AT them. One source, two names.
    expect(PrimaryButtonGradient.dark).toEqual([GLASS.accentFrom, GLASS.accentTo])
    expect(PrimaryButtonGradient.dark).toEqual(['#1F6B99', '#17527A'])
    expect(PrimaryButtonGradient.light).toEqual(['#2563eb', '#1d3584'])
    // The top dark stop IS `primaryDark` on the phone. Held as an identity so a palette re-base
    // that misses the gradient is visible here rather than only in the drift guard's output.
    expect(PrimaryButtonGradient.dark[0]).toBe(palette.dark.primaryDark)
  })

  it('carries `ElevatedEdges` as white-and-black, not palette tokens (A51)', () => {
    // Phone `Colors.ts:487-490`, verbatim INCLUDING the spacing — specular highlight and cast
    // shadow, deliberately not theme colours (`Colors.ts:482-484`).
    expect(ElevatedEdges.dark).toEqual({
      top: 'rgba(255, 255, 255, 0.14)',
      bottom: 'rgba(0, 0, 0, 0.3)',
    })
    expect(ElevatedEdges.light).toEqual({
      top: 'rgba(255, 255, 255, 0.35)',
      bottom: 'rgba(0, 0, 0, 0.1)',
    })
  })

  it('maps `DangerFill` through the INVERTING `*Light` / `*Dark` names (A52)', () => {
    // Phone `Colors.ts:510-513`. This is the row-21 shape: pin the mapping at the CONSTANT.
    // A consumer-side pin cannot fail on it — the phone's `SwipeDeleteAction` suite compared the
    // rendered value against `DangerFill` itself and stayed 32/32 green through a mutation back
    // to the failing flat pair.
    expect(DangerFill.dark).toBe(palette.dark.errorLight)
    expect(DangerFill.light).toBe(palette.light.errorDark)
    // ...and the values, so "both point at the same wrong token" is also caught.
    expect(DangerFill.dark).toBe('#b72136')
    expect(DangerFill.light).toBe('#dc2626')
  })
})

describe('buttonStyle — the five variants, dark', () => {
  it('defaults to primary/medium/enabled, exactly as the phone does', () => {
    // Phone `Button.tsx:41-43`: `variant = 'primary'`, `size = 'medium'`, `disabled = false`.
    expect(buttonStyle()).toEqual(buttonStyle({ variant: 'primary', size: 'medium', disabled: false }))
  })

  it('paints primary as the gradient with lit/grounded edges and the CTA shadow (A50/A51/A64)', () => {
    expect(buttonStyle({ variant: 'primary' })).toEqual({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      borderRadius: 10,
      borderStyle: 'solid',
      borderWidth: 1,
      // Phone `:120-123`: top and bottom take the edges, left and right are transparent
      // UNCONDITIONALLY. Four longhands, never a `border` / `borderColor` shorthand — see the
      // shorthand-erasure describe below.
      borderTopColor: ElevatedEdges[scheme].top,
      borderRightColor: 'transparent',
      borderBottomColor: ElevatedEdges[scheme].bottom,
      borderLeftColor: 'transparent',
      padding: '16px 24px',
      minHeight: 48,
      fontSize: 16,
      fontWeight: 600,
      background: `linear-gradient(180deg,${PrimaryButtonGradient[scheme][0]},${PrimaryButtonGradient[scheme][1]})`,
      color: colors.onPrimary,
      cursor: 'pointer',
      // Phone `:128-132`: `#000000` / offset {0,6} / opacity 0.45 / radius 20 in dark.
      boxShadow: CTA_BOX_SHADOWS[scheme],
      // Phone `:205-207`.
      textShadow: CTA_TEXT_SHADOWS[scheme],
    })
  })

  it('paints secondary as backgroundSecondary/border/text — not the old #132236/#99badd (A65)', () => {
    const s = buttonStyle({ variant: 'secondary' })
    // Phone `:143-144` + `:216`. The demo's shipped `#132236` was literally the phone's OLD
    // `backgroundSecondary`, and its label was `textSecondary`, one rung too dim. The retired
    // literals are barred from `ui/` repo-wide by `tokens/__tests__/palette.test.ts`; what is
    // pinned HERE is which token the recipe reaches for.
    expect(s.background).toBe(colors.backgroundSecondary)
    expect(s.color).toBe(colors.text)
    expect(s.color).not.toBe(colors.textSecondary)
    expect([s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor]).toEqual([
      colors.border,
      colors.border,
      colors.border,
      colors.border,
    ])
    // `colors.border`, NOT the `borderLight` behind `GLASS.borderBtn` — the fragment this recipe
    // replaces had the wrong one of the two.
    expect(s.borderTopColor).not.toBe(colors.borderLight)
    expect(s.boxShadow).toBeUndefined()
    expect(s.textShadow).toBeUndefined()
  })

  it('labels and outlines `outline` with `link`, never `primary` (A66 / DEF-UI-018)', () => {
    const s = buttonStyle({ variant: 'outline' })
    // Phone `:147,:152` + `:228`. `primary` is a mid-tone FILL and measures 2.81:1 as 16px
    // semibold on the glass these sit on; `link` measures 6.86.
    expect(s.background).toBe('transparent')
    expect(s.color).toBe(colors.link)
    expect(s.borderTopColor).toBe(colors.link)
    expect(s.borderRightColor).toBe(colors.link)
    expect(s.borderBottomColor).toBe(colors.link)
    expect(s.borderLeftColor).toBe(colors.link)
    expect(s.color).not.toBe(colors.primary)
    // The two retired literals must not survive anywhere in the resolved recipe.
    expect(JSON.stringify(s).toLowerCase()).not.toContain('2b8cc1')
    expect(JSON.stringify(s).toLowerCase()).not.toContain('4ba3d4')
  })

  it('paints `ghost` as a bare link label with no boundary at all', () => {
    const s = buttonStyle({ variant: 'ghost' })
    // Phone `:155-156` + `:231`.
    expect(s.background).toBe('transparent')
    expect(s.color).toBe(colors.link)
    expect([s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor]).toEqual([
      'transparent',
      'transparent',
      'transparent',
      'transparent',
    ])
  })

  it('fills `danger` with DangerFill and labels it `onError` (A52/A67)', () => {
    const s = buttonStyle({ variant: 'danger' })
    // Phone `:159-160` + `:234`. The flat `error #ff4757` the demo ships measures 3.34:1 under
    // white; this deep red measures 6.39.
    expect(s.background).toBe(DangerFill[scheme])
    expect(s.color).toBe(colors.onError)
    expect(s.borderTopColor).toBe(DangerFill[scheme])
    expect(s.borderBottomColor).toBe(DangerFill[scheme])
    // The flat mid-tone is the value DangerFill exists to avoid, in both halves.
    expect(s.background).not.toBe(colors.error)
  })
})

describe('buttonStyle — the disabled half (D10)', () => {
  // D10: `colors.disabled` as fill+border and `disabledText` as label, ONLY where the phone
  // paints a fill. The phone's own arms are the spec, and they are NOT uniform.

  it('drops the gradient, the drop shadow and the text shadow from a disabled primary', () => {
    const s = buttonStyle({ variant: 'primary', disabled: true })
    // Phone `:279`: the `<LinearGradient>` renders only `&& !isDisabled`, and `:124-125` /
    // `:201-202` skip both shadows. The demo's shipped idiom — `opacity: 0.45` over the live
    // gradient — is what this replaces: a faded gradient is not a disabled fill.
    expect(s.background).toBe(colors.disabled)
    expect(s.color).toBe(colors.disabledText)
    expect(s.boxShadow).toBeUndefined()
    expect(s.textShadow).toBeUndefined()
    expect(s.cursor).toBe('not-allowed')
    // Phone `:120-123`: top/bottom take `disabled`; left/right stay transparent even here.
    expect(s.borderTopColor).toBe(colors.disabled)
    expect(s.borderBottomColor).toBe(colors.disabled)
    expect(s.borderLeftColor).toBe('transparent')
    expect(s.borderRightColor).toBe('transparent')
  })

  it('fills a disabled secondary and danger, but NOT a disabled outline or ghost', () => {
    // The half of D10 that a "swap every disabled control" reading gets wrong. Phone `:143`,
    // `:147`, `:155`, `:159`: only secondary, primary and danger take the fill; `outline` keeps
    // `backgroundColor: 'transparent'` and `ghost` has no disabled branch in its style at all.
    expect(buttonStyle({ variant: 'secondary', disabled: true }).background).toBe(colors.disabled)
    expect(buttonStyle({ variant: 'danger', disabled: true }).background).toBe(colors.disabled)
    expect(buttonStyle({ variant: 'outline', disabled: true }).background).toBe('transparent')
    expect(buttonStyle({ variant: 'ghost', disabled: true }).background).toBe('transparent')
  })

  it('takes the disabled BORDER on outline but leaves ghost transparent', () => {
    // Phone `:152` vs `:156`: `outline` swaps its border to `colors.disabled`; `ghost` is
    // `borderColor: 'transparent'` with no ternary.
    expect(buttonStyle({ variant: 'outline', disabled: true }).borderTopColor).toBe(colors.disabled)
    expect(buttonStyle({ variant: 'ghost', disabled: true }).borderTopColor).toBe('transparent')
  })

  it('labels every disabled variant with `disabledText`, including outline and ghost', () => {
    // Phone `:200`, `:216`, `:228`, `:231`, `:234` — the label token IS uniform even though the
    // fill is not. WCAG 1.4.3 exempts inactive controls and the phone declines to chase these
    // branches (`:225-226`); the demo inherits that ruling rather than inventing a brighter one.
    const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger']
    expect(variants.map((variant) => buttonStyle({ variant, disabled: true }).color)).toEqual(
      variants.map(() => colors.disabledText),
    )
  })
})

describe('buttonStyle — the three sizes (A68)', () => {
  it('lands the phone`s padding / min-height / label size per step', () => {
    // Phone `:96-110` through `Layout.spacing` (`Layout.ts:10-21`) and `Layout.touchTarget`
    // (`:54-59`), and `:180-189` through `Typography.fontSize` (`Typography.ts:17-26`).
    const measured = (['small', 'medium', 'large'] as ButtonSize[]).map((size) => {
      const s = buttonStyle({ size })
      return { size, padding: s.padding, minHeight: s.minHeight, fontSize: s.fontSize }
    })
    expect(measured).toEqual([
      { size: 'small', padding: '8px 16px', minHeight: 44, fontSize: 14 },
      { size: 'medium', padding: '16px 24px', minHeight: 48, fontSize: 16 },
      { size: 'large', padding: '24px 32px', minHeight: 56, fontSize: 18 },
    ])
  })

  it('keeps radius 10 across all five variants and all three sizes (A68 — radius is COMPLETE)', () => {
    // Phone `:90`, `Layout.borderRadius.control`. The demo's fragments already used 10; what was
    // drifting is everything else on this row.
    const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger']
    const sizes: ButtonSize[] = ['small', 'medium', 'large']
    // Collected rather than Set-ed: es5 target, no `--downlevelIteration`, and a filtered list
    // names the offending cell in the diff instead of just its value.
    expect(
      variants
        .flatMap((variant) =>
          sizes.map((size) => ({ variant, size, borderRadius: buttonStyle({ variant, size }).borderRadius })),
        )
        .filter((cell) => cell.borderRadius !== radius.control),
    ).toEqual([])
  })
})

describe('the shorthand-erasure hazard (§4.3, W1 web-lane finding)', () => {
  it('emits the four border-side LONGHANDS and no `border` / `borderColor` shorthand', () => {
    // The structural half. `border` and `border-color` are BOTH four-side shorthands, so either
    // one appearing in this object would make the key ORDER load-bearing — and object spread
    // keeps a re-assigned key at its ORIGINAL insertion position, which is precisely why the
    // documented escape hatch ("set `borderColor`, then re-set `borderTopColor`") does not work
    // through a spread. Emitting no shorthand at all removes the trap instead of documenting it.
    const variants: ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger']
    for (const variant of variants) {
      for (const disabled of [false, true]) {
        const keys = Object.keys(buttonStyle({ variant, disabled }))
        expect(keys, `${variant}/${disabled}`).not.toContain('border')
        expect(keys, `${variant}/${disabled}`).not.toContain('borderColor')
        expect(keys, `${variant}/${disabled}`).toEqual(
          expect.arrayContaining([
            'borderTopColor',
            'borderRightColor',
            'borderBottomColor',
            'borderLeftColor',
          ]),
        )
      }
    }
  })

  it('keeps the lit edge on FIRST PAINT and across an UPDATE, with no React shorthand warning', () => {
    // The behavioural half, and the reason the structural one is not enough: the failure this
    // guards renders correctly once and then either sticks or warns on the next commit.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const Btn = ({ disabled }: { disabled: boolean }) => (
        <button type="button" style={buttonStyle({ variant: 'primary', disabled })}>
          Go
        </button>
      )
      const { rerender } = render(<Btn disabled={false} />)
      const el = screen.getByRole('button')

      // First paint: the specular edge is on, the grounded edge is on, the sides are not.
      expect(el.style.borderTopColor).toBe(ElevatedEdges[scheme].top)
      expect(el.style.borderBottomColor).toBe(ElevatedEdges[scheme].bottom)
      expect(el.style.borderLeftColor).toBe('transparent')

      // Update: React diffs the two style objects key by key. A shorthand in either object makes
      // this the commit that goes wrong.
      rerender(<Btn disabled />)
      expect(el.style.borderTopColor).toBe(hexToJsdomRgb(colors.disabled)) // jsdom re-writes the hex
      expect(el.style.borderLeftColor).toBe('transparent')

      // ...and back, because a one-way transition can pass while the return trip strands a value.
      rerender(<Btn disabled={false} />)
      expect(el.style.borderTopColor).toBe(ElevatedEdges[scheme].top)

      expect(spy.mock.calls.map(String).join('\n')).not.toMatch(/shorthand/i)
    } finally {
      spy.mockRestore()
    }
  })

  it('survives a consumer overriding a NON-border key after the spread', () => {
    // The supported composition shape: spread the recipe LAST, then override only keys that are
    // not part of the border family. `width` before / `background` after both behave.
    const style: CSSProperties = {
      width: '100%',
      ...buttonStyle({ variant: 'outline', size: 'small' }),
      background: SAMPLE_TINT,
    }
    render(
      <button type="button" style={style}>
        Use sample DVR clock
      </button>,
    )
    const el = screen.getByRole('button')
    expect(el.style.width).toBe('100%')
    expect(el.style.backgroundColor).toBe(SAMPLE_TINT)
    expect(el.style.borderTopColor).toBe(hexToJsdomRgb(colors.link)) // `link`, still intact
    expect(el.style.borderBottomColor).toBe(hexToJsdomRgb(colors.link))
  })
})

describe('SAMPLE_TINT — the demo-only wash (D12: follow, inside the frame)', () => {
  it('is `primary` at 14%, derived rather than retyped', () => {
    // The three sample/fallback buttons the demo owns and the phone has no counterpart for
    // (`#9fd4ee` and this wash return ZERO hits in the phone's `src/` at `dd5551ec`). Kept as an
    // OVERRIDE on `outline`, not as a sixth variant: the phone's `Button` has exactly five.
    // Derived from the consumed `primary` through `withAlpha`, so a primary re-base carries it.
    // Kills a re-point (`colors.link`, `primaryLight`) and an alpha change alike; the value of
    // `primary` itself belongs to `tokens/__tests__/palette.test.ts`, not here.
    expect(SAMPLE_TINT).toBe(withAlpha(colors.primary, 0.14))
    // "derived rather than retyped", pinned: the wash it replaced was a hand-typed hex.
    expect(SAMPLE_TINT).not.toMatch(/#/)
  })
})
