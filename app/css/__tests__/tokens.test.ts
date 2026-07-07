import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// The Case-File design tokens live in app/css/style.css via Tailwind v4's CSS-first
// `@theme` (no tailwind.config.js in this repo). Components consume them as utilities
// (`bg-ink-900`, `text-gold`, `animate-[blinkDot_…]`), so a missing/renamed token fails
// silently at runtime — this test pins the namespace as a build-time contract.
// Values themselves are design-owned (handoff README §Design Tokens); we assert presence,
// not exact hex, except the four accents that gate the whole visual language.
const css = readFileSync(join(process.cwd(), 'app', 'css', 'style.css'), 'utf8')

describe('Case-File design tokens (style.css @theme)', () => {
  it('defines the Case-File color namespace', () => {
    for (const token of [
      '--color-ink-950',
      '--color-ink-900',
      '--color-panel-800',
      '--color-chip',
      '--color-hairline',
      '--color-heading',
      '--color-body',
      '--color-muted',
    ]) {
      expect(css, `missing token ${token}`).toContain(token)
    }
  })

  it('defines the four accent colors with their design values', () => {
    expect(css).toMatch(/--color-carolina:\s*#99badd/i)
    expect(css).toMatch(/--color-blue:\s*#2B8CC1/i)
    expect(css).toMatch(/--color-cyan:\s*#4ecdc4/i)
    expect(css).toMatch(/--color-gold:\s*#ffd93d/i)
  })

  it('registers the technical mono font variables', () => {
    expect(css).toContain('--font-stmono')
    expect(css).toContain('--font-jbmono')
  })

  it('defines the four Case-File keyframes', () => {
    for (const name of ['scanSweep', 'blinkDot', 'glowPulse', 'flicker']) {
      expect(css, `missing @keyframes ${name}`).toMatch(new RegExp(`@keyframes ${name}`))
    }
  })

  it('pauses the ambient animations under prefers-reduced-motion', () => {
    const reducedMotionBlock = css.match(/@media \(prefers-reduced-motion: reduce\)[^@]*/)
    expect(reducedMotionBlock, 'missing prefers-reduced-motion block').not.toBeNull()
    expect(reducedMotionBlock![0]).toContain('animation: none')
  })
})
