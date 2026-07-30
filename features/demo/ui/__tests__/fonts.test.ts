import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Structural guard for the demo's font loading (P1.1, matrix G10). jsdom loads no CSS,
// so — like backdrop.test.ts — the source IS the invariant. Share Tech Mono + JetBrains
// Mono are self-hosted by next/font in app/layout.tsx (vars --font-stmono / --font-jbmono
// on <body>); nothing in the demo may re-fetch them from Google at runtime, and every
// inline fontFamily must consume the vars — a bare "'JetBrains Mono'" stack would silently
// render system monospace now that no runtime @import loads the family.
const root = process.cwd()
const uiDir = join(root, 'features', 'demo', 'ui')
const css = readFileSync(join(uiDir, 'demo.css'), 'utf8')

const uiSources = (): Array<{ file: string; text: string }> =>
  readdirSync(uiDir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.tsx') && !f.includes('__tests__'))
    .map((f) => ({ file: f, text: readFileSync(join(uiDir, f), 'utf8') }))

/** Every quoted occurrence of `family` must be immediately preceded by `var(<varName>),`. */
const bareOccurrences = (text: string, family: string, varName: string): number => {
  const quoted = `'${family}'`
  const prefix = `var(${varName}),`
  let count = 0
  let i = text.indexOf(quoted)
  while (i !== -1) {
    if (!text.slice(0, i).endsWith(prefix)) count += 1
    i = text.indexOf(quoted, i + quoted.length)
  }
  return count
}

describe('demo fonts (next/font variables, P1.1 / G10)', () => {
  it('demo.css performs no runtime @import — fonts come from next/font', () => {
    expect(css).not.toContain('@import url(')
    expect(css).not.toContain('fonts.googleapis.com')
  })

  it('every inline Share Tech Mono / JetBrains Mono stack consumes the next/font vars', () => {
    for (const { file, text } of uiSources()) {
      expect(
        bareOccurrences(text, 'Share Tech Mono', '--font-stmono'),
        `${file}: 'Share Tech Mono' used without var(--font-stmono) prefix`,
      ).toBe(0)
      expect(
        bareOccurrences(text, 'JetBrains Mono', '--font-jbmono'),
        `${file}: 'JetBrains Mono' used without var(--font-jbmono) prefix`,
      ).toBe(0)
    }
  })

  it('the root layout still supplies both vars (the demo inherits them from <body>)', () => {
    const layout = readFileSync(join(root, 'app', 'layout.tsx'), 'utf8')
    expect(layout).toContain('Share_Tech_Mono(')
    expect(layout).toContain('JetBrains_Mono(')
    expect(layout).toContain('--font-stmono')
    expect(layout).toContain('--font-jbmono')
  })
})
