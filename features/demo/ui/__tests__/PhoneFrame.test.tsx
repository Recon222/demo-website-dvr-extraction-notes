import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, act } from '@testing-library/react'
import { PhoneFrame } from '@/features/demo/ui/PhoneFrame'
import { PHONE_COLUMN_PADDING_Y, PHONE_FRAME_H } from '@/features/demo/ui/usePhoneScale'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * The scan line, found by its ANIMATION rather than by a test hook.
 *
 * That is deliberate and load-bearing twice over: it needs no `data-` attribute added to
 * production for a test's benefit, and it asserts the `scanSweep` keyframe NAME survives every
 * edit here. D9 freezes all 17 keyframes in `demo.css`, so a rename would leave this element
 * animating nothing — silently, since `vitest.config.mts` sets `css: false` and no stylesheet
 * is ever parsed. (`app/css/style.css`'s `prefers-reduced-motion` block is MARKETING's and
 * matches `[class*='scanSweep']` — class-based only, per its own comment at `:246-247`. This
 * element is inline-styled and carries no class, so it is out of that block's reach by design;
 * the demo gates its motion through `useReducedMotion` instead.)
 */
const scanLine = (): HTMLElement => {
  const el = Array.from(document.querySelectorAll<HTMLElement>('div')).find((d) =>
    d.style.animation.includes('scanSweep'),
  )
  expect(el, 'the scan sweep element is gone, or its keyframe was renamed').toBeTruthy()
  return el as HTMLElement
}

describe('PhoneFrame', () => {
  it('renders its children inside the frame', () => {
    render(
      <PhoneFrame>
        <div>SCREEN CONTENT</div>
      </PhoneFrame>,
    )
    expect(screen.getByText('SCREEN CONTENT')).toBeInTheDocument()
    expect(document.querySelector('[data-phone="frame"]')).toBeTruthy()
  })

  // A88/A89 (U8.2). `teal-purge.test.ts` proves the teal is GONE from the source; this proves
  // what replaced it is the palette and not some other colour that merely is not teal — the
  // half a source ban cannot assert. Read off the rendered inline style, which jsdom does
  // parse (unlike class names and `demo.css`, which it does not).
  it('paints the scan sweep from colors.primary, not the purged teal', () => {
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    const line = scanLine()
    // Compared against the SAME derivation the component uses, not a spelled `rgba(43,140,193,
    // 0.3)`: a relational pin survives a legitimate phone-side re-tint of `primary` and fails
    // on a severed derivation, which is the failure that matters here.
    expect(line.style.backgroundImage).toContain(withAlpha(colors.primary, 0.3))
    expect(line.style.backgroundImage).not.toContain('205, 196')
    // The glow carries the phone's `shadowOpacity: 0.8` (`GridBackground.tsx:145-155`) IN THE
    // COLOUR, because CSS has one colour where RN has a colour and an opacity. Shipped at an
    // implicit 1.0 until the W4 capture round flagged it (`_captures/w4/DIFF.md`) — invisible
    // today (the composite measured DIMMER, 81.9 -> 64.8) and wrong by construction, which is
    // the pair of facts that makes a pin the right answer rather than a re-measure.
    //
    // The 12px BLUR is not `shadowRadius: 10` re-expressed and must not be "corrected" to it:
    // RN's five shadow props do not carry to CSS at a fixed ratio (this repo's own ruling, at
    // `glass-tokens.ts`'s `glassWell` docblock), 12px is the demo's lifted value, and the plan's
    // U8.2 row spells `0 0 12px`. Only the colour is derived.
    expect(line.style.boxShadow).toBe(`0 0 12px ${withAlpha(colors.primary, 0.8)}`)
  })

  // A10/D9. The grid is the frame's other ambient layer and its alpha moved with `gridSubtle`;
  // pinned here because `PhoneFrame` is one of only two consumers and neither had a render pin.
  it('lays the blueprint grid from GLASS.gridOverlay', () => {
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    const gridEl = Array.from(document.querySelectorAll<HTMLElement>('div')).find((d) =>
      d.style.backgroundImage.includes('repeating-linear-gradient'),
    )
    // Whitespace-stripped on both sides: jsdom re-spaces a gradient's argument list (`0deg,` ->
    // `0deg, `), so a byte-exact compare here would be asserting jsdom's formatter rather than
    // the token. The token's own byte-exact pin lives in `glass-tokens.test.ts`, which reads the
    // string and never renders it.
    const strip = (s: string) => s.replace(/\s+/g, '')
    expect(strip(gridEl?.style.backgroundImage ?? '')).toBe(strip(GLASS.gridOverlay))
    // The value that actually moved (A10): the phone's `gridSubtle` alpha, not the demo's 0.05.
    expect(strip(gridEl?.style.backgroundImage ?? '')).toContain(strip(colors.gridSubtle))
  })

  it('applies a scale transform sized to the viewport height', () => {
    // 600 − 56 = 544 → 544/812 ≈ 0.670. The reserve is the sticky column's FULL vertical
    // padding (28 top + 28 bottom), not half of it — DP-8: at the old 28 the sticky box came out
    // taller than a short viewport and the frame could not stay fully in view.
    window.innerHeight = 600
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    const frame = document.querySelector('[data-phone="frame"]') as HTMLElement
    expect(frame.style.transform).toContain('scale(0.669')
    expect(frame.style.transformOrigin).toBe('top center')
  })

  /**
   * DP-8. A CSS transform scales the PAINT and leaves the LAYOUT box unscaled, so the frame used
   * to occupy 812px of the sticky column however small it was drawn. That made the column's box
   * taller than a short viewport, and `position: sticky` could not hold the phone fully in view at
   * the foot of the page (measured in Chromium at 700px: 80% visible, top −129).
   *
   * jsdom computes no layout, so it cannot see the scroll behaviour itself — the Chromium
   * evidence is in the DP-8 row of the device-pass findings. What jsdom CAN see, and what this
   * pins, is the mechanism: the wrapper's height tracks the scale rather than staying 812.
   */
  it('shrinks the frame LAYOUT box with the scale, not just its paint (DP-8)', () => {
    window.innerHeight = 600 // scale ≈ 0.6699 (see the arithmetic above)
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    const frame = document.querySelector('[data-phone="frame"]') as HTMLElement
    const wrapper = frame.parentElement as HTMLElement
    const scale = Number(/scale\(([\d.]+)\)/.exec(frame.style.transform)![1])
    expect(scale).toBeLessThan(1)
    // The wrapper reserves the SCALED height. At scale 1 this is 812; here it must not be.
    expect(wrapper.style.height).toBe(`${PHONE_FRAME_H * scale}px`)
    expect(wrapper.style.height).not.toBe(`${PHONE_FRAME_H}px`)

    /**
     * The height above is only safe because the flex default is overridden. `align-items`
     * defaults to `stretch`, which resolves a flex child's cross-size to the container's — so
     * the height squashed the titanium shell from its natural 812 to `812 * scale` while the
     * screen inside kept its hard `height: 786`, and the app rendered past the bezel's rounded
     * corner at every scale below 1 (33px of spill at an 820px viewport, 183px at 560px).
     *
     * jsdom computes no layout and cannot see that spill; the Chromium matrix in the DP-8 doc
     * row is the behavioural evidence. This pins the one property that prevents it.
     */
    expect(wrapper.style.alignItems).toBe('flex-start')
  })

  /**
   * The reserve and the padding are one number in two files. `usePhoneScale` subtracts
   * `PHONE_COLUMN_PADDING_Y` from the viewport; `DemoExperience`'s sticky column spends exactly
   * that much on padding. If they drift, the box stops fitting and DP-8 comes back silently.
   */
  it('reserves exactly the sticky column’s vertical padding (DP-8)', () => {
    const src = readFileSync(
      join(process.cwd(), 'features', 'demo', 'ui', 'DemoExperience.tsx'),
      'utf8',
    )
    const decl = /position: 'sticky', top: 0, alignSelf: 'flex-start', padding: '(\d+)px [^']*? (\d+)px [^']*?'/.exec(src)
    expect(decl, 'the sticky phone column’s padding declaration moved — re-point this pin').not.toBeNull()
    const [, top, bottom] = decl!
    expect(Number(top) + Number(bottom)).toBe(PHONE_COLUMN_PADDING_Y)
  })

  it('never locks pointer-events on the screen subtree (the phone is always interactive)', () => {
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    const screenEl = document.querySelector('[data-phone-screen]') as HTMLElement
    expect(screenEl.style.pointerEvents).not.toBe('none')
  })

  it('caps the scale at 1:1 on a tall viewport', () => {
    window.innerHeight = 2000
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    expect((document.querySelector('[data-phone="frame"]') as HTMLElement).style.transform).toBe('scale(1)')
  })

  it('rescales on window resize', () => {
    window.innerHeight = 2000
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    const frame = document.querySelector('[data-phone="frame"]') as HTMLElement
    expect(frame.style.transform).toBe('scale(1)')
    act(() => {
      window.innerHeight = 600
      window.dispatchEvent(new Event('resize'))
    })
    expect(frame.style.transform).toContain('scale(0.669')
  })
})
