import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spacing, radius, touchTarget, iconSize, withAlpha, flattenOver } from '@/features/demo/ui/tokens/scale'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { glassCard } from '@/features/demo/ui/glass-tokens'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'

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

  it('routes the picker row height through the touch floor, in SOURCE and in value (W0-F9)', () => {
    // Value alone cannot tell an alias from a re-typed `44`, and a source match alone stays
    // green over a wrong import — so both. (The drift guard reads `scale.ts` directly for
    // `touchFloor`, so nothing here duplicates it; this pins the DEMO-side hop.)
    const src = readFileSync(join(process.cwd(), 'features', 'demo', 'ui', 'inputs', 'input-theme.ts'), 'utf8')
    expect(src, 'T.rowH must alias touchTarget.min, not re-type 44').toMatch(/\browH:\s*touchTarget\.min\b/)
    expect(T.rowH).toBe(touchTarget.min)
  })

  it('routes the glass fragments through the radius ladder (A42/A43 depth rule)', () => {
    // Cards are `lg`; buttons, pills and other small tap targets are `control`.
    expect(glassCard.borderRadius).toBe(radius.lg)
    // The two button fragments this used to read were deleted by U2.2; `buttonStyle()` is the
    // one recipe now, and A68 makes `control` the corner for ALL FIVE variants and all three
    // sizes (phone `Button.tsx:90`). Two cells stand in here for the grid that
    // `controls/__tests__/button-recipe.test.tsx` walks exhaustively.
    expect(buttonStyle().borderRadius).toBe(radius.control)
    expect(buttonStyle({ variant: 'ghost', size: 'large' }).borderRadius).toBe(radius.control)
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

    it('parses 8-digit hex and lets the REQUESTED alpha win (W0-F6)', () => {
      // The demo already renders four #rrggbbaa values (map/LocationDetailCard.tsx:43,
      // map/LocationRow.tsx:22,23,26) that U5.4 routes through here. Before this fix the
      // input came back unchanged, i.e. at ITS OWN alpha (0x25/255 = 0.145) — the exact
      // "requested alpha silently ignored" class the docblock claims the port fixed.
      expect(withAlpha('#2B8CC125', 0.5)).toBe('rgba(43, 140, 193, 0.5)')
      expect(withAlpha('#fff8', 0.2)).toBe('rgba(255, 255, 255, 0.2)')
    })

    it('does not read a colour out of a longer string (the rgb regex is anchored)', () => {
      expect(withAlpha('rgb(1, 2, 3) and then some', 0.5)).toBe('rgb(1, 2, 3) and then some')
    })

    it('dev-warns instead of silently returning a colour-shaped input unchanged (W0-F6)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        expect(withAlpha('#12345', 0.5)).toBe('#12345')
        expect(warn).toHaveBeenCalledTimes(1)
        expect(String(warn.mock.calls[0][0])).toContain('withAlpha')
        // Named colours are a DOCUMENTED safe input — warning on them is the noise that
        // gets a warning muted, and then the real one is missed.
        warn.mockClear()
        for (const safe of ['transparent', 'currentColor', 'inherit', 'none']) {
          withAlpha(safe, 0.5)
        }
        expect(warn).not.toHaveBeenCalled()
      } finally {
        warn.mockRestore()
      }
    })

    it('dev-warns for EVERY function notation, color-mix() above all (W0-F13)', () => {
      // None of these is a documented-safe input: each returns unchanged with the requested
      // alpha silently dropped. `color-mix()` is the one form this module's docblock BANS
      // inside features/demo/** — warning on the malformed hex while staying quiet on the
      // banned value is exactly backwards.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        for (const css of ['color-mix(in srgb, red 50%, blue)', 'hsl(210, 50%, 40%)', 'hsla(210, 50%, 40%, 0.5)', 'linear-gradient(180deg,#1F6B99,#17527A)']) {
          warn.mockClear()
          expect(withAlpha(css, 0.5), `${css} must come back unchanged`).toBe(css)
          expect(warn, `${css} must dev-warn`).toHaveBeenCalledTimes(1)
          expect(String(warn.mock.calls[0][0])).toContain('withAlpha')
        }
      } finally {
        warn.mockRestore()
      }
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

    it('with an unparseable layer, returns the top unchanged AND dev-warns (W0-F6)', () => {
      // `flattenOver()` with no grounds at all is a COMPILE error now — the second parameter
      // is required — so the arm that used to hand back an uncomposited colour cannot be
      // reached from TypeScript at all. Nothing is a safe layer here, unlike `withAlpha`:
      // every argument must be a real colour, so this arm warns unconditionally.
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        expect(flattenOver('rgba(255, 255, 255, 0.5)', 'transparent')).toBe('rgba(255, 255, 255, 0.5)')
        expect(warn).toHaveBeenCalledTimes(1)
        expect(String(warn.mock.calls[0][0])).toContain('flattenOver')
      } finally {
        warn.mockRestore()
      }
    })

    it('composites an 8-digit hex top the same as its rgba() spelling', () => {
      expect(flattenOver('#ffffff80', '#000000')).toBe(flattenOver('rgba(255, 255, 255, 0.50196)', '#000000'))
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
