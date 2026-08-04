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
// The PDF templates inject their own <style> into the print iframe (a separate document —
// it inherits nothing from the page), so they are the natural place a Google @import could
// sneak back in. Scanned alongside demo.css (R-28).
const pdfDir = join(root, 'features', 'demo', 'engine', 'logic', 'pdf')
const css = readFileSync(join(uiDir, 'demo.css'), 'utf8')

const sources = (dir: string): Array<{ file: string; text: string }> =>
  readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !f.includes('__tests__'))
    .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf8') }))

/** Every quoted occurrence of `family` must be preceded by `var(<varName>),` (spaces ok). */
const bareOccurrences = (text: string, family: string, varName: string): number => {
  const quoted = `'${family}'`
  const prefixRe = new RegExp(`var\\(${varName}\\),\\s*$`)
  let count = 0
  let i = text.indexOf(quoted)
  while (i !== -1) {
    if (!prefixRe.test(text.slice(0, i))) count += 1
    i = text.indexOf(quoted, i + quoted.length)
  }
  return count
}

describe('demo fonts (next/font variables, P1.1 / G10)', () => {
  it('no runtime @import — demo.css and the PDF print-iframe templates stay Google-free', () => {
    for (const { file, text } of [{ file: 'demo.css', text: css }, ...sources(pdfDir)]) {
      expect(text, `${file}: runtime @import`).not.toContain('@import url(')
      expect(text, `${file}: Google Fonts reference`).not.toContain('fonts.googleapis.com')
    }
  })

  it('every inline Share Tech Mono / JetBrains Mono stack consumes the next/font vars', () => {
    for (const { file, text } of sources(uiDir)) {
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
