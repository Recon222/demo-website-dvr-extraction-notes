import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Structural guard for the background scan illumination (Case-File ambient sweep).
// The effect is two keyframe animations whose transforms must be exact negations of
// each other: a masked "window" band sweeps down the viewport while its lit-grid
// child counter-translates, which pins the lit grid to the viewport so the brighter
// lines land exactly on the resting grid's lines. jsdom cannot observe compositing
// or animation, so — as with chrome-scope.test.tsx — the source IS the invariant.
// Values (duration, band height, alpha) are design-owned tuning knobs and are NOT
// pinned; only the relationships that keep the illusion working are.
const root = process.cwd()
const layout = readFileSync(join(root, 'app', '(default)', 'layout.tsx'), 'utf8')
const css = readFileSync(join(root, 'app', 'css', 'style.css'), 'utf8')

// Flat rule blocks (no nesting) — first `}` ends the block.
const rule = (selector: string) => {
  const m = css.match(new RegExp(`\\.${selector}\\s*\\{[^}]*\\}`))
  expect(m, `missing .${selector} rule in style.css`).not.toBeNull()
  return m![0]
}
// Keyframes blocks close at column 0.
const keyframes = (name: string) => {
  const m = css.match(new RegExp(`@keyframes ${name}\\s*\\{[\\s\\S]*?\\n\\}`))
  expect(m, `missing @keyframes ${name} in style.css`).not.toBeNull()
  return m![0]
}

describe('background scan illumination (Case-File ambient sweep)', () => {
  describe('layout (app/(default)/layout.tsx)', () => {
    it('mounts the scan layer as a decorative, hidden-from-AT element', () => {
      expect(layout).toMatch(/aria-hidden/)
      expect(layout).toMatch(/className="case-scan"/)
      expect(layout).toMatch(/case-scan-band/)
      expect(layout).toMatch(/case-scan-grid/)
      expect(layout).toMatch(/case-scan-line/)
    })

    it('anchors the resting grid to the viewport so the lit grid can register on the same lines', () => {
      // The sweep is viewport-fixed; if the resting grid scrolled with the page,
      // the lit lines would sit offset from the resting lines by scrollY % 46px.
      expect(layout).toContain('before:fixed')
      expect(layout).not.toContain('before:absolute')
    })
  })

  describe('scan styles (app/css/style.css)', () => {
    it('keeps the scan behind content and inert to interaction', () => {
      const scan = rule('case-scan')
      expect(scan).toMatch(/position:\s*fixed/)
      expect(scan).toMatch(/z-index:\s*-\d/)
      expect(scan).toMatch(/pointer-events:\s*none/)
    })

    it('paints the lit grid on the same lattice as the resting grid (46px carolina hairlines)', () => {
      // Registration: same line color, same 1px/46px period as the layout's before: grid.
      expect(layout).toMatch(/153,186,221/)
      expect(layout).toMatch(/1px_46px/)
      const grid = rule('case-scan-grid')
      expect(grid).toMatch(/153 186 221/)
      expect(grid).toMatch(/1px 46px/)
    })

    it('exposes the tuning knobs in one place', () => {
      const scan = rule('case-scan')
      for (const knob of [
        '--scan-duration:',
        '--scan-band-h:',
        '--scan-lit-alpha:',
        '--scan-line-alpha:',
      ]) {
        expect(scan, `missing knob ${knob}`).toContain(knob)
      }
    })

    it('draws the radar line in the phone mock’s visual language, riding the band center', () => {
      // The visible scan line is the motif relocated from the removed phone chrome
      // (469557b): cyan core, horizontally faded edges, soft glow. It rides at the
      // band's center (= the illumination mask's plateau) so line and halo can
      // never drift apart — same element tree, same single animation.
      const line = rule('case-scan-line')
      expect(line).toMatch(/top:\s*50%/)
      expect(line).toMatch(/linear-gradient\(\s*90deg\s*,\s*transparent/)
      expect(line).toMatch(/78 205 196/)
      expect(line).toMatch(/box-shadow/)
    })

    it('softens the band edges with a falloff mask (no hard bright bar)', () => {
      const band = rule('case-scan-band')
      expect(band).toMatch(/mask-image:\s*linear-gradient/)
      expect(band).toContain('transparent')
    })

    it('moves band and lit grid by exact counter-transforms (registration lock)', () => {
      const sweep = keyframes('scanSweep')
      const hold = keyframes('scanSweepHold')
      // Band enters from above (-band-h) and exits below the viewport (100vh)…
      expect(sweep).toMatch(/translateY\(calc\(-1 \* var\(--scan-band-h\)\)\)/)
      expect(sweep).toMatch(/translateY\(100vh\)/)
      // …while the grid counter-translates by the exact negation, summing to zero.
      expect(hold).toMatch(/translateY\(var\(--scan-band-h\)\)/)
      expect(hold).toMatch(/translateY\(-100vh\)/)
    })

    it('keeps both scan keyframes on identical offsets so they can never desync', () => {
      const offsetLines = (kf: string) =>
        (kf.match(/^\s*[\d.%,\s]+?\s*\{/gm) ?? []).map((line) => line.replace(/[\s{]+/g, ''))
      const sweepOffsets = offsetLines(keyframes('scanSweep'))
      expect(sweepOffsets.length).toBeGreaterThanOrEqual(2)
      expect(offsetLines(keyframes('scanSweepHold'))).toEqual(sweepOffsets)
    })

    it('drives both animations from the same duration knob with the same timing', () => {
      expect(rule('case-scan-band')).toMatch(
        /animation:\s*scanSweep var\(--scan-duration\) linear infinite/,
      )
      expect(rule('case-scan-grid')).toMatch(
        /animation:\s*scanSweepHold var\(--scan-duration\) linear infinite/,
      )
    })

  })

  describe('seamless chrome (one background surface — owner decision)', () => {
    const tabStrip = readFileSync(join(root, 'components', 'ui', 'manifest-tab-strip.tsx'), 'utf8')
    const homePage = readFileSync(join(root, 'app', '(default)', 'page.tsx'), 'utf8')

    it('drops the utility strip from the chrome entirely', () => {
      expect(layout).not.toMatch(/<UtilityStrip\b/)
      expect(layout).not.toMatch(/utility-strip/)
    })

    it('anchors the chrome glow at the very top of the page in the layout', () => {
      // The blue top glow left the home page (it could never reach above <main>'s
      // overflow clip) and now shines from the top of the page, down over the
      // header + tab strip into the content — the same light for every page.
      expect(layout).toMatch(/radial-gradient\(550px_260px_at_50%_0%,rgba\(43,140,193/)
      expect(layout.indexOf('43,140,193')).toBeLessThan(layout.indexOf('<Header'))
    })

    it('removes the hairline between the tab strip and the page', () => {
      // \b keeps this from matching the pills' own border-blue hover accents.
      expect(tabStrip).not.toMatch(/border-b\b|border-hairline/)
    })

    it('does not double the glow on the home page (it moved to the layout)', () => {
      expect(homePage).not.toMatch(/radial-gradient\(550px/)
    })
  })

  describe('reduced motion', () => {
    it('hides the scan layer entirely under prefers-reduced-motion', () => {
      // `animation: none` alone would freeze the band as a visible static stripe —
      // reduced-motion users must get the plain resting grid, so the layer is hidden.
      const rm = css.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\n\}/)
      expect(rm, 'missing prefers-reduced-motion block').not.toBeNull()
      expect(rm![0]).toMatch(/\.case-scan[^{]*\{[^}]*display:\s*none/)
    })
  })
})
