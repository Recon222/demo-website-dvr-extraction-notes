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

/**
 * The files allowed to hold the raw literals: the token modules themselves, which is where a
 * banned literal has to exist exactly once.
 *
 * ADDING A PATH HERE IS A REVIEWABLE ACT — every entry carries a line saying why that file is
 * a token module, and a later package appends its own as the closing act of creating it
 * (`tokens/glass-tiers.ts` U1.1, `tokens/status.ts` U3.2, `controls/sheet-chrome.ts` U4.1,
 * `screens/import/terminal-palette.ts` U7.1). Do NOT relax this into a predicate over the
 * `tokens/` directory or a "contains the word token" test: that quietly removes the
 * anti-re-drift teeth A97 exists for, and the U0.5 row forbids it by name.
 *
 * Paths are `/`-joined relative to UI_ROOT — the same idiom the offender message uses. That
 * also closes a latent hole in what this replaced: the old check skipped by BASENAME, so ANY
 * file called `glass-tokens.ts` at any depth under `ui/` was exempt.
 */
const TOKEN_MODULES: ReadonlySet<string> = new Set([
  'glass-tokens.ts', // P0.5 extraction — the original owner of the gradients and borders
  'tokens/palette.ts', // U0.1 (SEAM) — the two-scheme phone palette; every bare hex below lives here
  'tokens/glass-tiers.ts', // U1.1 (SEAM) — the six glass tiers; the twelve tier stops banned below live here, once
  'tokens/scale.ts', // U0.2 (SEAM) — the numeric scales plus `withAlpha`/`flattenOver`
])

/** Every .ts/.tsx source file under ui/, minus __tests__ dirs and the token modules. */
function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sourceFiles(full))
    } else if (
      /\.tsx?$/.test(entry.name) &&
      !TOKEN_MODULES.has(relative(UI_ROOT, full).split(sep).join('/'))
    ) {
      out.push(full)
    }
  }
  return out
}

/**
 * The exact literals the tokens replaced (closing parens kept so 0.5 ≠ 0.55 etc.).
 *
 * EVERY ENTRY IS A CURRENT LIVE VALUE, never a retired one. The ban means "use the token",
 * not "this value is gone" — so when a token's value changes, the matching entry is REWRITTEN
 * IN PLACE in the same commit, never deleted. A list of values that no longer exist anywhere
 * is green and dead, which is worse than red. (The complementary "this value is gone"
 * invariant lives in `ui/tokens/__tests__/palette.test.ts`'s `RETIRED` — different list,
 * different name, different scope, on purpose: a reviewer reading a red must be able to tell
 * which of the two fired.)
 */
const BANNED: ReadonlyArray<[name: string, literal: string]> = [
  // --- glass composites: reach for GLASS / the spreadable fragments -------------------
  ['card gradient', 'linear-gradient(180deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))'],
  ['diagonal card gradient', 'linear-gradient(135deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))'],
  ['panel gradient', 'linear-gradient(180deg,rgba(23,65,110,0.88),rgba(14,57,101,0.95))'],
  ['accent gradient', 'linear-gradient(180deg,#1F6B99,#17527A)'],
  ['grid overlay', 'repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)'],
  ['hard border', '1px solid #1c4e84'],
  ['soft border', '1px solid rgba(28,78,132,0.5)'],
  ['button border', '1px solid #2e5f97'],
  ['accent border', '1px solid rgba(43,140,193,0.3)'],
  ['error border', '1px solid rgba(255,71,87,0.3)'],
  // --- glass TIER stops (U1.1): reach for `GLASS_TIER[scheme].<tier>.gradient` ----------
  // The twelve dark stops `tokens/glass-tiers.ts` now owns, banned BARE rather than only as the
  // composed `linear-gradient(...)` above. That distinction is not theoretical: the demo today
  // re-derives near-miss gradients from the OLD card stops at five call sites (A33 — the
  // `rgba(19,34,54,*)` / `rgba(26,45,68,*)` family in `ImportResultBody`, `ImportModal`,
  // `CaseActionsSheet`, `DvrInfoScreen`, `ExportModal`), and the composed-string bans sailed
  // straight over every one of them because the alphas differ. Banning the stop itself is what
  // stops U1.3/U1.4/U2.4/U4.1 pasting the NEW values back in the same way.
  // Measured before landing: all twelve have ZERO occurrences under `ui/`, so this costs no sweep.
  // KNOWN LIMIT, not this package's to fix: the scan below is WHITESPACE-sensitive, so these
  // twelve catch `rgba(23,65,110,0.7)` and miss `rgba(23, 65, 110, 0.7)` — which is the spelling
  // `Colors.ts` uses and therefore the one a paste out of the phone arrives in. W0's review
  // raised it as a HIGH against `:132-134` with a SURVIVED probe; the fix is one `replace(/\s+/g,'')`
  // on both sides of the comparison and it belongs to that round, not here. Until it lands these
  // entries bite only on the unspaced form.
  // `border` / `highlightTop` / `innerShadow` are deliberately NOT here — see the report; they
  // become re-inlinable CSS values only when U1.2/U1.3/U1.4/U2.4/U4.1 wire them into a recipe,
  // and this list's own rule is that ENTRIES ARE CURRENT LIVE VALUES of a live token.
  ['card gradient top stop', 'rgba(14,57,101,0.85)'],
  ['card gradient bottom stop', 'rgba(23,65,110,0.92)'],
  ['nestedCard gradient top stop', 'rgba(23,65,110,0.7)'],
  ['nestedCard gradient bottom stop', 'rgba(14,57,101,0.6)'],
  ['elevated gradient top stop', 'rgba(23,65,110,0.88)'],
  ['elevated gradient bottom stop', 'rgba(14,57,101,0.95)'],
  ['header gradient top stop', 'rgba(0,38,80,0.95)'],
  ['header gradient bottom stop', 'rgba(2,46,89,0.98)'],
  ['sheet gradient top stop', 'rgba(0,40,83,0.98)'],
  ['sheet gradient bottom stop', 'rgba(14,57,101,1)'],
  ['recessed gradient top stop', 'rgba(0,24,50,0.6)'],
  ['recessed gradient bottom stop', 'rgba(0,32,64,0.5)'],
  // --- bare palette hexes (A97, U0.5): reach for `colors.<phoneName>` -----------------
  // Exactly the fifteen values U0.1/U0.3 CREATED. Measured before landing: all fifteen have
  // ZERO bare occurrences under `ui/` outside the token modules, so this ban costs no sweep.
  // The unchanged tokens (`#2B8CC1` 26 files, `#f0f4f8` 50, `#7a9fc4` 44, `#99badd` 25,
  // `#ff4757` 16, `#10d177` 15, `#ffd93d` 15, `#4BA3D4` 20) are deliberately NOT here: banning
  // them is the full 1,144-literal sweep D3 ruled against, and they carry no re-drift risk
  // because their value did not move. Each later package that CREATES a token appends it here
  // as its closing act — U1.1's tier stops, U3.1's status family, U4.4's scrim.
  ['background', '#002853'],
  ['backgroundSecondary / card', '#0e3965'],
  ['backgroundTertiary / modal', '#17416e'],
  ['border', '#1c4e84'],
  ['borderLight / disabled', '#2e5f97'],
  ['borderDark', '#063d72'],
  ['errorLight', '#b72136'],
  ['errorDark', '#ee2f44'],
  ['successDark', '#0faa5e'],
  ['warningDark', '#ffc62b'],
  ['link', '#b8d4f0'],
  ['linkHover', '#d0e4f7'],
  ['disabledText', '#6b7f95'],
  ['primaryDark / accent top stop', '#1F6B99'],
  ['accent bottom stop', '#17527A'],
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

  it('keeps the raw tokenized literals out of UI source (import the token instead)', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(UI_ROOT)) {
      // Case-INSENSITIVE on both sides (§4.7): the demo mixes spellings for the same colour,
      // and a case-sensitive `includes` let `linear-gradient(180deg,#1f6b99,#17527a)` through
      // an entry written `#1F6B99`. Lowering the needle too is what keeps the mixed-case
      // entries above matching at all.
      const text = readFileSync(file, 'utf8').toLowerCase()
      for (const [name, literal] of BANNED) {
        if (text.includes(literal.toLowerCase())) {
          offenders.push(`${relative(UI_ROOT, file).split(sep).join('/')} re-inlines the ${name} (${literal})`)
        }
      }
    }
    expect(
      offenders,
      `import the token instead — GLASS / the fragments from ui/glass-tokens.ts, colours from ui/tokens/palette.ts:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('pins the GLASS token values (an edit here restyles ~60 call sites)', () => {
    expect(GLASS).toEqual({
      accentFrom: '#1F6B99',
      accentTo: '#17527A',
      gradientCard: 'linear-gradient(180deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))',
      gradientCardDiag: 'linear-gradient(135deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))',
      gradientPanel: 'linear-gradient(180deg,rgba(23,65,110,0.88),rgba(14,57,101,0.95))',
      gradientAccent: 'linear-gradient(180deg,#1F6B99,#17527A)',
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
      background: 'linear-gradient(180deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))',
    })
    expect(glassBtnPrimary).toEqual({
      borderRadius: 10,
      border: 'none',
      background: 'linear-gradient(180deg,#1F6B99,#17527A)',
      color: '#fff',
    })
    expect(glassBtnSecondary).toEqual({
      borderRadius: 10,
      border: '1px solid #2e5f97',
      background: '#0e3965',
      color: '#99badd',
    })
  })

  it('keeps the four legacy composites DERIVED from GLASS_TIER (U1.1)', async () => {
    const { GLASS_TIER } = await import('@/features/demo/ui/tokens/glass-tiers')
    const { scheme } = await import('@/features/demo/ui/tokens/palette')
    const t = GLASS_TIER[scheme]
    // The same device as the `gradientAccent` line below, for the same reason: a RELATIONAL pin
    // survives a legitimate re-tint and fails on a broken relationship.
    //
    // What it is really for, stated plainly because a probe cannot show it in one mutation:
    // severing a derivation back to its own literal is INVISIBLE to the byte-exact shape pin
    // above (measured — probe P4b, SURVIVED, exit 0), and the drift guard reads
    // `tokens/glass-tiers.ts`, not this file. So a severed key plus a later phone-side re-tint
    // would leave BOTH of those gates green while `/demo` renders the old gradient. This line
    // is what fails in that second step.
    expect(GLASS.gradientCard).toBe(`linear-gradient(180deg,${t.card.gradient[0]},${t.card.gradient[1]})`)
    expect(GLASS.gradientCardDiag).toBe(`linear-gradient(135deg,${t.card.gradient[0]},${t.card.gradient[1]})`)
    expect(GLASS.gradientPanel).toBe(
      `linear-gradient(180deg,${t.elevated.gradient[0]},${t.elevated.gradient[1]})`,
    )
    expect(GLASS.borderSoft).toBe(`1px solid ${t.card.border}`)
    expect(glassCard.background, 'the card fragment paints the card tier').toBe(GLASS.gradientCard)
    // NOT `borderAccent`: it is still the demo's near-miss `rgba(43,140,193,0.3)` and
    // `elevated.border` is `0.25`. U1.3 owns that value change and adds the fifth line here.
    expect(GLASS.borderAccent).not.toBe(`1px solid ${t.elevated.border}`)
  })

  it("keeps input-theme's accent stops aliased to GLASS (single-source restyle)", async () => {
    const { T } = await import('@/features/demo/ui/inputs/input-theme')
    expect(T.accentFrom).toBe(GLASS.accentFrom)
    expect(T.accentTo).toBe(GLASS.accentTo)
    expect(GLASS.gradientAccent).toBe(`linear-gradient(180deg,${GLASS.accentFrom},${GLASS.accentTo})`)
  })
})
