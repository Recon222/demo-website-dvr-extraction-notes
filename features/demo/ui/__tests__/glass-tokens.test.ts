import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { GLASS, glassCard, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'

// Guards for the P0.5 glass-token extraction (matrix G6).
//
// 1. Anti-re-drift: the tokenized gradient/border literals must never reappear in UI source
//    outside `glass-tokens.ts` — new code reaches for GLASS/the fragments instead of pasting
//    the raw strings back in. Like the backdrop test, the source IS the invariant (jsdom
//    renders no CSS). Tests are excluded: asserting literal values in a test is a pixel pin,
//    not duplication.
// 2. Shape pin: the token values are byte-for-byte what the ~60 replaced call sites shipped
//    with — an accidental edit here would silently restyle half the demo, so it fails loudly.

const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')

/** Every .ts/.tsx source file under ui/, minus __tests__ dirs and the token module itself. */
function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sourceFiles(full))
    } else if (/\.tsx?$/.test(entry.name) && entry.name !== 'glass-tokens.ts') {
      out.push(full)
    }
  }
  return out
}

/** The exact literals the tokens replaced (closing parens kept so 0.5 ≠ 0.55 etc.). */
const BANNED: ReadonlyArray<[name: string, literal: string]> = [
  ['card gradient', 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))'],
  ['diagonal card gradient', 'linear-gradient(135deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))'],
  ['panel gradient', 'linear-gradient(180deg,rgba(26,45,68,0.88),rgba(19,34,54,0.95))'],
  ['accent gradient', 'linear-gradient(180deg,#35A0D6,#2580AD)'],
  ['grid overlay', 'repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)'],
  ['hard border', '1px solid #1c4e84'],
  ['soft border', '1px solid rgba(28,78,132,0.5)'],
  ['button border', '1px solid #2e5f97'],
  ['accent border', '1px solid rgba(43,140,193,0.3)'],
  ['error border', '1px solid rgba(255,71,87,0.3)'],
]

describe('glass tokens (P0.5 / G6)', () => {
  // R-34: the /demo error page's colours live as @theme MIRRORS in app/css/style.css —
  // outside this suite's scan root and in Tailwind arbitrary-value syntax the error-page
  // guard can't value-check. Pin the mirror VALUES here, against the tokens that will
  // drift: a GLASS accent/error restyle must fail this line until the mirror follows
  // (probe: drifting --color-demo-accent-from AND renaming --color-demo-error previously
  // left the whole suite green while the error page silently lost its palette).
  it('the @theme demo-token mirrors in app/css/style.css equal the GLASS values (R-25/R-34)', () => {
    const css = readFileSync(join(process.cwd(), 'app', 'css', 'style.css'), 'utf8')
    const mirror = (name: string): string => {
      const m = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css)
      expect(m, `@theme token --color-${name} missing from app/css/style.css`).not.toBeNull()
      return (m as RegExpExecArray)[1].toLowerCase()
    }
    expect(mirror('demo-accent-from')).toBe(GLASS.accentFrom.toLowerCase())
    expect(mirror('demo-accent-to')).toBe(GLASS.accentTo.toLowerCase())
    // borderError is '1px solid rgba(255,71,87,0.3)' — the mirror carries its rgb as hex.
    expect(mirror('demo-error')).toBe('#ff4757')
    expect(GLASS.borderError).toContain('rgba(255,71,87')
  })

  it('keeps the raw glass literals out of UI source (use GLASS / the fragments instead)', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(UI_ROOT)) {
      const text = readFileSync(file, 'utf8')
      for (const [name, literal] of BANNED) {
        if (text.includes(literal)) {
          offenders.push(`${relative(UI_ROOT, file).split(sep).join('/')} re-inlines the ${name} (${literal})`)
        }
      }
    }
    expect(offenders, `import from ui/glass-tokens.ts instead:\n${offenders.join('\n')}`).toEqual([])
  })

  it('pins the GLASS token values (an edit here restyles ~60 call sites)', () => {
    expect(GLASS).toEqual({
      accentFrom: '#35A0D6',
      accentTo: '#2580AD',
      gradientCard: 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))',
      gradientCardDiag: 'linear-gradient(135deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))',
      gradientPanel: 'linear-gradient(180deg,rgba(26,45,68,0.88),rgba(19,34,54,0.95))',
      gradientAccent: 'linear-gradient(180deg,#35A0D6,#2580AD)',
      gridOverlay:
        'repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)',
      border: '1px solid #1c4e84',
      borderSoft: '1px solid rgba(28,78,132,0.5)',
      borderBtn: '1px solid #2e5f97',
      borderAccent: '1px solid rgba(43,140,193,0.3)',
      borderError: '1px solid rgba(255,71,87,0.3)',
    })
  })

  it('pins the spreadable fragments to the exact clusters they replaced', () => {
    expect(glassCard).toEqual({
      borderRadius: 12,
      border: '1px solid rgba(28,78,132,0.5)',
      background: 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))',
    })
    expect(glassBtnPrimary).toEqual({
      borderRadius: 10,
      border: 'none',
      background: 'linear-gradient(180deg,#35A0D6,#2580AD)',
      color: '#fff',
    })
    expect(glassBtnSecondary).toEqual({
      borderRadius: 10,
      border: '1px solid #2e5f97',
      background: '#0e3965',
      color: '#99badd',
    })
  })

  it("keeps input-theme's accent stops aliased to GLASS (single-source restyle)", async () => {
    const { T } = await import('@/features/demo/ui/inputs/input-theme')
    expect(T.accentFrom).toBe(GLASS.accentFrom)
    expect(T.accentTo).toBe(GLASS.accentTo)
    expect(GLASS.gradientAccent).toBe(`linear-gradient(180deg,${GLASS.accentFrom},${GLASS.accentTo})`)
  })
})
