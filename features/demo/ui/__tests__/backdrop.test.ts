import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Structural guard for the demo's Case-File backdrop (M4). jsdom loads no CSS, so —
// exactly like the marketing background-scan tests — the source IS the invariant.
// Values are knobs (design-owned); only the relationships are pinned: the surface
// lives in demo.css (not inline), the glow sits off the phone column behind content,
// and the marketing token values are duplicated (never imported across the boundary).
const root = process.cwd()
const css = readFileSync(join(root, 'features', 'demo', 'ui', 'demo.css'), 'utf8')
const experience = readFileSync(join(root, 'features', 'demo', 'ui', 'DemoExperience.tsx'), 'utf8')

const rootRule = () => {
  const m = css.match(/\[data-demo-root\]\s*\{[^}]*\}/)
  expect(m, 'missing [data-demo-root] rule in demo.css').not.toBeNull()
  return m![0]
}
const glowRule = () => {
  const m = css.match(/\[data-demo-root\]::before\s*\{[^}]*\}/)
  expect(m, 'missing [data-demo-root]::before glow rule in demo.css').not.toBeNull()
  return m![0]
}

describe('demo backdrop (Case-File surface, M4)', () => {
  it('paints the ink base + 46px carolina grid in demo.css, not inline', () => {
    const rule = rootRule()
    expect(rule).toContain('#04070d') // = marketing --color-ink-900, duplicated by convention
    expect(rule).toMatch(/repeating-linear-gradient\(0deg,\s*rgba\(153,\s*186,\s*221/)
    expect(rule).toMatch(/repeating-linear-gradient\(90deg,\s*rgba\(153,\s*186,\s*221/)
    expect(rule).toMatch(/1px 46px/) // same lattice as the marketing grid
    // The inline background left the TSX with the move.
    expect(experience).not.toMatch(/backgroundImage/)
    expect(experience).not.toMatch(/background:\s*'#/)
  })

  it('shines the spotlight from the top, positioned off the phone column, behind content', () => {
    const glow = glowRule()
    expect(glow).toMatch(/pointer-events:\s*none/)
    expect(glow).toMatch(/z-index:\s*-\d/)
    expect(glow).toMatch(/left:\s*var\(--demo-glow-left\)/) // the placement knob
    expect(glow).toMatch(/radial-gradient\(550px 260px at 50% 0%,\s*rgba\(43,\s*140,\s*193/) // artboard 1a
  })

  it('isolates the root so the negative-z glow cannot vanish behind its own background', () => {
    const rule = rootRule()
    expect(rule).toMatch(/isolation:\s*isolate/)
    expect(rule).toMatch(/position:\s*relative/) // the ::before needs its containing block
  })

  it('exposes the backdrop knobs in one place', () => {
    const rule = rootRule()
    for (const knob of ['--demo-glow-alpha:', '--demo-glow-left:']) {
      expect(rule, `missing knob ${knob}`).toContain(knob)
    }
  })

  it('carries no scan markup — the demo surface is grid + glow only', () => {
    expect(experience).not.toMatch(/case-scan/)
    expect(css).not.toMatch(/case-scan/)
  })
})
