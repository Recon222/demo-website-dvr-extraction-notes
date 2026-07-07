import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Structural guard for the Case-File chrome relocation (implementation plan Slice 3).
// The marketing chrome (header / tab strip / footer) must render from the (default)
// route group — NOT the root layout — because /demo lives outside the group and the
// design requires it chrome-free. This asserts on layout *sources*: the bug this
// prevents is a structural one (chrome mounted on /demo's ancestor), which renders
// identically in jsdom either way — source placement IS the invariant.
const root = process.cwd()
const rootLayout = readFileSync(join(root, 'app', 'layout.tsx'), 'utf8')
const defaultLayout = readFileSync(join(root, 'app', '(default)', 'layout.tsx'), 'utf8')

describe('marketing chrome scope (guards /demo)', () => {
  it('keeps all marketing chrome out of the root layout, so /demo inherits none', () => {
    expect(rootLayout).not.toMatch(/Header/)
    expect(rootLayout).not.toMatch(/FeatureNav|ManifestTabStrip/)
    expect(rootLayout).not.toMatch(/Footer/)
  })

  it('renders the chrome from the (default) group layout', () => {
    expect(defaultLayout).toMatch(/Header/)
    expect(defaultLayout).toMatch(/FeatureNav|ManifestTabStrip/)
    expect(defaultLayout).toMatch(/Footer/)
  })

  it('makes the (default) layout a server component with no AOS', () => {
    expect(defaultLayout).not.toContain("'use client'")
    expect(defaultLayout).not.toContain('"use client"')
    expect(defaultLayout).not.toMatch(/from ['"]aos/)
    expect(defaultLayout).not.toContain('AOS.init')
  })
})
