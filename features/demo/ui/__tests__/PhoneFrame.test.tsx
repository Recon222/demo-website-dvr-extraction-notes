import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PhoneFrame } from '@/features/demo/ui/PhoneFrame'
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
    // MEASURED on this repo's jsdom (29.1.1): `box-shadow` keeps an inline hex verbatim — it is
    // `background-color` that gets rewritten to `rgb(...)`. So the glow compares as written.
    expect(line.style.boxShadow).toBe(`0 0 12px ${colors.primary}`)
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
    window.innerHeight = 600 // 600 − 28 = 572 → 572/812 ≈ 0.704
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    const frame = document.querySelector('[data-phone="frame"]') as HTMLElement
    expect(frame.style.transform).toContain('scale(0.70')
    expect(frame.style.transformOrigin).toBe('top center')
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
    expect(frame.style.transform).toContain('scale(0.70')
  })
})
