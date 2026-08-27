import { describe, it, expect } from 'vitest'
import { spacing, radius, touchTarget, iconSize, withAlpha, flattenOver } from '@/features/demo/ui/tokens/scale'
import { glassCard, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'

// Guards for the U0.2 scale seam (matrix A41, A42, A49, A53).
//
// The scales are transcriptions of the phone's `Layout` (`src/constants/Layout.ts:10-74`);
// the two colour helpers are the port of `src/lib/utils/with-alpha.ts`, widened to n-deep
// because U0.5's contrast test composites a whole ground STACK, not one pair.

/** jsdom normalizes inline colours; it re-spaces rgba() rather than echoing the input. */
function jsdomColor(css: string): string {
  const el = document.createElement('div')
  el.style.background = css
  return el.style.background
}

describe('scale (U0.2 / A41, A42, A49, A53)', () => {
  it('pins the spacing scale to the phone Layout.spacing', () => {
    expect(spacing).toEqual({ xxs: 2, xs: 4, xsm: 6, sm: 8, base: 12, md: 16, mdlg: 20, lg: 24, xl: 32, xxl: 48 })
  })

  it('pins the radius ladder to the phone Layout.borderRadius', () => {
    expect(radius).toEqual({ none: 0, sm: 4, md: 8, control: 10, lg: 12, xl: 16, sheet: 22, full: 9999 })
  })

  it('pins the touch-target and icon scales', () => {
    expect(touchTarget).toEqual({ min: 44, medium: 46, comfortable: 48, large: 56 })
    expect(iconSize).toEqual({ xs: 16, sm: 20, md: 24, lg: 32, xl: 40 })
  })

  it('routes the glass fragments through the radius ladder (A42/A43 depth rule)', () => {
    // Cards are `lg`; buttons, pills and other small tap targets are `control`.
    expect(glassCard.borderRadius).toBe(radius.lg)
    expect(glassBtnPrimary.borderRadius).toBe(radius.control)
    expect(glassBtnSecondary.borderRadius).toBe(radius.control)
  })

  describe('withAlpha', () => {
    it('returns a literal rgba() string computed in TypeScript, never color-mix()', () => {
      // A53: inside features/demo/** every alpha is a literal rgba() so `flattenOver` can
      // composite it and jsdom can read it. A color-mix() string carries no channels.
      expect(withAlpha('#2B8CC1', 0.08)).toBe('rgba(43, 140, 193, 0.08)')
      expect(withAlpha('#2B8CC1', 0.08)).not.toContain('color-mix')
    })

    it('RE-alphas an rgba() input instead of passing it through', () => {
      // The phone's four private copies all got this wrong: they returned the rgba string
      // untouched, so the requested alpha was silently ignored (with-alpha.ts:11-16).
      expect(withAlpha('rgba(0, 40, 83, 0.9)', 0.32)).toBe('rgba(0, 40, 83, 0.32)')
      expect(withAlpha('rgb(14, 57, 101)', 0.5)).toBe('rgba(14, 57, 101, 0.5)')
    })

    it('expands 3-digit hex (the copies read it as NaN)', () => {
      expect(withAlpha('#fff', 0.2)).toBe('rgba(255, 255, 255, 0.2)')
    })

    it('returns anything unparseable unchanged, so named colours are safe to pass', () => {
      expect(withAlpha('transparent', 0.5)).toBe('transparent')
      expect(withAlpha('currentColor', 0.5)).toBe('currentColor')
    })

    it('round-trips through jsdom (assert through the helper — jsdom RE-SPACES)', () => {
      expect(jsdomColor(withAlpha('#2B8CC1', 0.08))).toBe('rgba(43, 140, 193, 0.08)')
    })
  })

  describe('flattenOver', () => {
    it('composites source-over and returns an opaque rgb()', () => {
      // 50% white over black is mid grey; the phone returns rgb(), not rgba().
      expect(flattenOver('rgba(255, 255, 255, 0.5)', '#000000')).toBe('rgb(128, 128, 128)')
    })

    it('is n-deep: three layers equal the same pair applied twice', () => {
      const stack = ['rgba(23, 65, 110, 0.7)', 'rgba(14, 57, 101, 0.85)', '#002853']
      const [top, mid, ground] = stack
      expect(flattenOver(top, mid, ground)).toBe(flattenOver(top, flattenOver(mid, ground)))
      expect(flattenOver(top, mid, ground)).toBe('rgb(20, 62, 106)')
    })

    it('treats the LAST ground as opaque, and ignores its alpha (phone semantics)', () => {
      // "Pass the colour that is actually painted, not a wash with something showing
      // through it" — with-alpha.ts:67-69.
      expect(flattenOver('rgba(255, 255, 255, 0.5)', 'rgba(0, 0, 0, 0.25)')).toBe('rgb(128, 128, 128)')
    })

    it('with no grounds, and with an unparseable layer, returns the top unchanged', () => {
      expect(flattenOver('#002853')).toBe('#002853')
      expect(flattenOver('rgba(255, 255, 255, 0.5)', 'transparent')).toBe('rgba(255, 255, 255, 0.5)')
    })

    it('does NOT discard alpha the way withAlpha(token, 1) would', () => {
      // The trap this helper exists to close: `withAlpha(x, 1)` hands back the raw triple,
      // a colour the token was never meant to render at (with-alpha.ts:56-65).
      const wash = 'rgba(0, 24, 50, 0.6)'
      expect(withAlpha(wash, 1)).toBe('rgba(0, 24, 50, 1)')
      expect(flattenOver(wash, '#002853')).toBe('rgb(0, 30, 63)')
    })
  })
})
