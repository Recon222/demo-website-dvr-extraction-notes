import { describe, it, expect } from 'vitest'
import {
  glassHeaderBar,
  glassWizardHeaderBar,
  glassHeaderFooterBar,
} from '@/features/demo/ui/controls/header-chrome'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { scheme } from '@/features/demo/ui/tokens/palette'

/**
 * The header tier's ONE recipe — matrix A37, package U1.4.
 *
 * Every expectation below composes its right-hand side from `GLASS_TIER[scheme].header`, never
 * from a retyped literal. That is the same device U1.1's derivation pin uses and it is here for
 * the same reason: a pin that restates the production string is green through exactly the edit
 * it exists to catch. What these assert is the RELATIONSHIP — that these three fragments read
 * the `header` tier, of the consumed scheme, in the right places — so sourcing a bar from
 * `card` or reading `GLASS_TIER.dark` directly reddens the file.
 */

const header = GLASS_TIER[scheme].header

/** `linear-gradient(<angle>,<stop>,<stop>)` → its parts. Throws rather than returning null: a
 *  fragment that stopped being a two-stop linear gradient must fail loudly, not compare against
 *  `undefined` and pass. */
function gradient(value: string | undefined): { angle: string; stops: [string, string] } {
  const m = /^linear-gradient\((\d+deg),(rgba?\([^)]*\)),(rgba?\([^)]*\))\)$/.exec(value ?? '')
  if (!m) throw new Error(`not a two-stop linear gradient: ${value}`)
  return { angle: m[1], stops: [m[2], m[3]] }
}

describe('the header tier recipe (A37 / U1.4)', () => {
  it('paints the header tier of the CONSUMED scheme, top to bottom', () => {
    expect(gradient(glassHeaderBar.background)).toEqual({
      angle: '180deg',
      stops: [header.gradient[0], header.gradient[1]],
    })
  })

  it('puts the tier border on the bottom edge alone, as a longhand', () => {
    expect(glassHeaderBar.borderBottom).toBe(`1px solid ${header.border}`)
    // A shorthand `border` after this would erase the single-edge hairline (§4.3), and a
    // `borderTop` would draw an edge the phone's bars do not have.
    expect(glassHeaderBar.border).toBeUndefined()
    expect(glassHeaderBar.borderTop).toBeUndefined()
  })

  it("carries the wizard header's lit top edge as an inset shadow, not a border-top-color", () => {
    // `borderTopColor` is A40's spelling for a CARD, which has four borders for the longhand to
    // override. On a one-edge bar it paints nothing — the phone builds a real 1px strip over
    // the gradient instead (`Header.tsx:113-117,168-175`), and `inset 0 1px 0` is that.
    expect(glassWizardHeaderBar.boxShadow).toBe(`inset 0 1px 0 ${header.highlightTop}`)
    expect(glassWizardHeaderBar.borderTopColor).toBeUndefined()
  })

  it('builds the wizard header FROM the shared bar, so a tier re-tint reaches both', () => {
    expect(glassWizardHeaderBar.background).toBe(glassHeaderBar.background)
    expect(glassWizardHeaderBar.borderBottom).toBe(glassHeaderBar.borderBottom)
  })

  it("renders no innerShadow anywhere — the phone's header consumers paint none", () => {
    // Not an omission: zero of the six phone components that read `GlassColors[…].header` touch
    // `innerShadow`. Painting one here would be invention. If the phone ever does, this line is
    // the one that has to change, deliberately.
    expect(glassHeaderBar.boxShadow).toBeUndefined()
    expect(glassHeaderFooterBar.boxShadow).toBeUndefined()
    expect(glassWizardHeaderBar.boxShadow).not.toContain(header.innerShadow)
  })

  it('flips the SAME two stops for a bar that sits below its content, and moves the hairline', () => {
    const bar = gradient(glassHeaderBar.background)
    const footer = gradient(glassHeaderFooterBar.background)
    // The phone reverses the array and keeps the direction (`CustomDrawerContent.tsx:437`);
    // `0deg` with the stops in source order is the same paint in CSS.
    expect(footer.stops).toEqual(bar.stops)
    expect([bar.angle, footer.angle]).toEqual(['180deg', '0deg'])
    expect(glassHeaderFooterBar.borderTop).toBe(`1px solid ${header.border}`)
    expect(glassHeaderFooterBar.borderBottom).toBeUndefined()
  })
})
