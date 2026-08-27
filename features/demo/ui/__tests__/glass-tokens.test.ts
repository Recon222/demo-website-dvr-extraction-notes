import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { GLASS, glassCard, glassCardNested } from '@/features/demo/ui/glass-tokens'

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
/**
 * Both sides of every literal scan go through this. Lower-case because §4.7 says every hex
 * sweep is case-insensitive and the demo mixes spellings for one colour; whitespace-STRIPPED
 * because the demo and the phone spell `rgba()` differently (`rgba(28,78,132,0.5)` here,
 * `rgba(28, 78, 132, 0.5)` there) and the ban has to survive the round trip. Same treatment
 * the drift guard's own `norm` applies for the same reason.
 *
 * Review r1 F3: without the whitespace strip, re-inlining `'1px solid rgba(28, 78, 132, 0.5)'`
 * walked straight past this guard while the unspaced spelling was caught, and U1.1's 24 tier
 * values are all spaced rgba transcribed from `Colors.ts`. Do NOT "fix" that by re-spacing
 * the demo's literals instead: several are pinned byte-exactly below.
 */
const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')

const TOKEN_MODULES: ReadonlySet<string> = new Set([
  'glass-tokens.ts', // P0.5 extraction — the original owner of the gradients and borders
  'tokens/palette.ts', // U0.1 (SEAM) — the two-scheme phone palette; every bare hex below lives here
  'tokens/glass-tiers.ts', // U1.1 (SEAM) — the six glass tiers; the twelve tier stops banned below live here, once
  'tokens/scale.ts', // U0.2 (SEAM) — the numeric scales plus `withAlpha`/`flattenOver`
  // U7.1 (SEAM) — the always-dark console palette (A85/A91). It is a token module in the sense
  // this list means (a value has to live exactly once, and this is that once) but NOT a theme
  // token set: A91/D6(a) forbid resolving the console ground to the app palette, so its
  // thirteen shades are owned here rather than in `tokens/`, beside the only feature that
  // paints them. It is the only entry that is not under `tokens/`, and that is the reason.
  'screens/import/terminal-palette.ts',
])

/**
/**
 * Every .ts/.tsx source file under ui/, minus __tests__ dirs and `skip`.
 *
 * `skip` defaults to `TOKEN_MODULES` (the banned-literal scan's exemption: a banned literal has
 * to live exactly once, and that once is a token module). The scheme-half scan passes an EMPTY
 * set — it exempts nothing at all. "May hold a raw literal" and "may name a scheme half" are
 * different permissions over different files, and the second turns out to be a permission no
 * file needs.
 */
function sourceFiles(dir: string, skip: ReadonlySet<string> = TOKEN_MODULES): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sourceFiles(full, skip))
    } else if (
      /\.tsx?$/.test(entry.name) &&
      !skip.has(relative(UI_ROOT, full).split(sep).join('/'))
    ) {
      out.push(full)
    }
  }
  return out
}

/**
 * Comments are not code, and here that is load-bearing rather than tidy: `glass-tokens.ts:59`
 * and `tokens/palette.ts:11,177,181` spell `GLASS_TIER.dark` / `palette.dark` in prose
 * precisely in order to FORBID them. A raw-text scan reds on its own documentation.
 *
 * `//` inside a string literal would truncate that line early. Accepted: the cost is coverage
 * of one line, never a false red, and no scheme half is spelled inside a string anywhere.
 */
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

/**
 * A scheme half reached for by name in a VALUE position. Plan §9 clause 12: flipping the demo
 * to light is a ONE-SITE change, and the one site is `tokens/palette.ts`'s `export const
 * scheme`. Consumers resolve `GLASS_TIER[scheme]` / `SHADOW_CARD[scheme]` / `colors`;
 * `GLASS_TIER.dark` is the same object today, so no behavioural pin can ever see it (review r1
 * F18, two SURVIVED probes) and a source scan is the only mechanism that can.
 *
 * ## NO LIST OF RECORD NAMES, deliberately — that is the whole of review r1 F23
 *
 * The first shape of this scan named `GLASS_TIER` and `palette` and matched the dot form only,
 * so `SHADOW_CARD.dark` (a two-half record created in the SAME round), `GLASS_TIER['dark']` and
 * `const { dark } = GLASS_TIER` all walked past it — four lanes, four SURVIVED probes. A
 * hand-typed roster of record names is the third recurrence of one class in this campaign
 * (W0 F2 `PALETTE_KEYS`, W1 F16 `TIER_KEYS`, F23 here); enrolling records BY NAME — typed out,
 * or derived from a `satisfies Record<ColorScheme, …>` grep — would be the fourth, and it fails
 * the same way, because the record that forgets to enrol is exactly the one that drifts.
 *
 * So the identifier is a WILDCARD — and since review r2 F24, so is the file: the scan exempts
 * NOTHING. There is no list of records to keep honest and no list of files either. A two-half
 * record added next wave is covered on the day it is written, by an author who never heard of
 * this test.
 *
 * F24 is why the file exemption went too. It had two entries, and one of them was
 * `tokens/palette.ts` — the home of `export const scheme`, the SINGLE SITE plan §9 clause 12
 * rests on. Exempting the declaring file to let it declare meant the one line whose regression
 * breaks the clause outright (`export const colors = palette[scheme]` -> `palette.dark`) was the
 * one line nothing watched. Measured, and the reason the deletion is free: NEITHER declaring
 * file names a half in a VALUE position — they declare halves as object KEYS (`light: {`,
 * `dark: {`) and as shorthand in an object literal (`{ light, dark }`), and the brace form the
 * destructure pattern matches requires `{ … } = ident`, which is the other way round. Zero
 * offenders across every non-test file under `ui/`, exemptions included: the widening costs no
 * false red, which is what makes the lazy shape also the correct one.
 *
 * Three forms, because the MANDATED idiom is `GLASS_TIER[scheme]` and a developer hard-coding a
 * half by copying that shape reaches for `['dark']` sooner than `.dark`:
 *   `X.dark`  ·  `X['dark']` / `X["light"]`  ·  `const { dark } = X`
 *
 * `typeof` is excluded because a TYPE position is the opposite of a violation: review r1 F15
 * requires `satisfies typeof palette.dark.primaryDark` in `glass-tokens.ts`, a deliberately
 * scheme-INDEPENDENT reference that must keep compiling after the flip. A regex cannot parse a
 * type position; `typeof` is the one marker that reliably identifies it here.
 */
const SCHEME_HALF: readonly RegExp[] = [
  // member access, dot or bracket
  /(?<!\btypeof\s+)\b[A-Za-z_$][\w$]*\s*(?:\.\s*|\[\s*['"])(?:dark|light)\b/,
  // destructure: `const { dark } = X`, `const { dark: tier } = X`
  /\{[^}]*\b(?:dark|light)\b[^}]*\}\s*=\s*[A-Za-z_$][\w$]*/,
]

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
  // REWRITTEN IN PLACE by U1.3 (A36): `borderAccent` is now the `elevated` tier's border,
  // `rgba(43,140,193,0.25)`. The old `0.3` was the demo's near-miss and is gone, so the entry
  // moves with the token rather than being deleted — the list's own rule.
  //
  // This is §4.4 trap 1 live ("glass-tokens.test.ts fails TWICE on a token change"): the new
  // value was ALREADY spelled at `screens/ExtractedScopeScreen.tsx:23`, which the rewrite
  // turned into an offender. That site is re-pointed at `GLASS.borderAccent` in the same
  // commit — value unchanged, owner corrected.
  ['accent border', '1px solid rgba(43,140,193,0.25)'],
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
  // The whitespace limit this block used to record is CLOSED, and the note is corrected here
  // rather than left to mislead a later package (U2.4): `norm()` above strips whitespace on
  // BOTH sides of the comparison since review r1 F3, so these twelve catch the spaced
  // `rgba(23, 65, 110, 0.7)` a paste out of `Colors.ts` arrives in as well as the unspaced form.
  // `border` / `highlightTop` / `innerShadow` are deliberately NOT here — see the report; they
  // become re-inlinable CSS values only when U1.2/U1.3/U1.4/U2.4/U4.1 wire them into a recipe,
  // and this list's own rule is that ENTRIES ARE CURRENT LIVE VALUES of a live token.
  // U1.2 is the first of those, and appends the `card` tier's other two parts below.
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
  // --- the card recipe's other two parts (U1.2): reach for `glassCard` -----------------
  // A31/A32/A44 wire `card.highlightTop`, `card.innerShadow` and `Layout.shadow.card.dark`
  // into `glassCard`, which is what makes them re-inlinable CSS for the first time — the
  // condition the block above names for adding an entry. All three measured ZERO live
  // occurrences under `ui/` once `export/ExportCaseCard.tsx:133`'s hand-rolled copy of the
  // card shadow was re-pointed at `GLASS.shadowCard` in the same commit.
  //
  // The inner shadow is banned as the COMPOSED declaration, not as the bare
  // `rgba(0,0,0,0.2)`. U1.1 measured the reason and it still holds: the five `innerShadow`
  // blacks are indistinguishable from ordinary drop shadows, so a bare ban would misfile the
  // next generic 20%-black shadow as tier re-drift. `inset 0 1px 0 rgba(0,0,0,0.2)` can only
  // be the card tier's inset.
  //
  // `0 4px 8px rgba(0,0,0,0.15)` is banned WHOLE for the same reason in the other direction:
  // `SettingsCategoryList.tsx:30` carries `padding: '0 4px 8px'`, which a fragment-level ban
  // on the offsets would have flagged as a colour re-inline.
  ['card highlight edge', 'rgba(184,212,240,0.08)'],
  ['card inner shadow', 'inset 0 1px 0 rgba(0,0,0,0.2)'],
  ['card shadow', '0 4px 8px rgba(0,0,0,0.15)'],
  // --- the nested tier's other two parts (U1.3): reach for `glassCardNested` -------------
  // Same rule, same package-appends-its-own discipline. Both measured ZERO live occurrences.
  //
  // `nestedCard.border` (`rgba(43,140,193,0.45)`) is deliberately ABSENT in BOTH forms, and
  // the measurement is why: bare, it is live at three sites that are not tier re-inlines
  // (`AudioRecorderScreen.tsx:127`, `BootSequence.tsx:36`, and `input-theme.ts` at the
  // neighbouring 0.25); composed as `1px solid rgba(43,140,193,0.45)` it is live at
  // `BootSequence.tsx:36`, which belongs to U8.1. Banning it here would either redden on
  // landing or drag a sweep into another package's file. U8.1 can add it for free.
  ['nestedCard highlight edge', 'rgba(184,212,240,0.2)'],
  ['nestedCard inner shadow', 'inset 0 1px 0 rgba(0,0,0,0.15)'],
  // --- the recessed tier's other two parts (U2.4): reach for `glassWell` ------------------
  // The condition the U1.1 block above names, met: A39/A59 wire `recessed.border`,
  // `recessed.highlightTop` and `recessed.innerShadow` into `glassWell`, which is what makes
  // them re-inlinable CSS for the first time. All three measured ZERO live occurrences under
  // `ui/` before landing, in BOTH spacings.
  //
  // `border` and `highlightTop` are banned BARE, unlike the card tier's, because neither is a
  // generic value a future site could reach for innocently: `rgba(0,14,30,0.75)` and
  // `rgba(0,12,26,0.55)` are near-black navies that exist nowhere else in the palette. The
  // inner shadow follows the card/nested precedent and is banned COMPOSED — bare
  // `rgba(0,0,0,0.45)` is an ordinary 45% drop shadow and banning it would misfile the next
  // one as tier re-drift.
  ['recessed well border', 'rgba(0,14,30,0.75)'],
  ['recessed well lip', 'rgba(0,12,26,0.55)'],
  ['recessed well inner shadow', 'inset 0 1px 0 rgba(0,0,0,0.45)'],
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
  // U3.1's closing act (the docblock above names it). Only the two hexes the status family
  // CREATED are added: `infoLight` is `#2e5f97`, already banned two lines up as
  // `borderLight / disabled`, and `warningAccent` is `#ffc62b`, already banned as
  // `warningDark` — a second entry for either would report one file twice. The four dark
  // `*OnLight` are `#f0f4f8` (= `text`), which is live in 50 files and deliberately unbanned
  // for the reason the docblock gives. Measured before landing: both have ZERO occurrences
  // under `ui/` outside the token modules, so this costs no sweep.
  ['successLight', '#0f6b42'],
  ['warningLight', '#7d5f10'],
  ['link', '#b8d4f0'],
  ['linkHover', '#d0e4f7'],
  ['disabledText', '#6b7f95'],
  ['primaryDark / accent top stop', '#1F6B99'],
  ['accent bottom stop', '#17527A'],
  // --- U1.4's header tier, banned on the day it entered a recipe (review r1 F22) ----------
  // The list's own rule: the package that first writes a tier value into a recipe bans it.
  // U1.4 wrote both into `controls/header-chrome.ts` and deferred the entries only because
  // `glass-tokens.test.ts` belonged to the U1.2 seat in that window; the window is closed.
  // NOTE the first is ONE literal serving TWO tiers — `header.border` and `sheet.border` are
  // both `rgba(28,78,132,0.6)` (`Colors.ts:393` / `:402`), so U4.1 inherits this entry rather
  // than adding a second. Reach for `GLASS_TIER[scheme].<tier>`, or the header recipe.
  ['header/sheet border', 'rgba(28,78,132,0.6)'],
  ['header highlightTop', 'rgba(153,186,221,0.1)'],
  // --- U7.1's console palette: reach for `TERMINAL_PALETTE` --------------------------------
  // The thirteen off-system console shades `screens/import/terminal-palette.ts` now owns.
  // These are NOT app-palette hexes and A91 forbids tokenising them to one — but they are
  // exactly the kind that re-drifts, and this repo had already PROVEN it: `#060a12` and
  // `#141c28` were live in BOTH `screens/import/ImportTerminalProgress.tsx` and
  // `screens/NotesScreen.tsx` before U7.1, which is the same duplication the phone's own
  // module docblock records ("two features owned the same off-system palette and had already
  // drifted", phone `terminal-palette.ts:10-12`). So unlike U1.1's twelve tier stops, two of
  // these thirteen are a MEASURED second owner, not a precaution.
  //
  // Every one is a near-black navy or a console grey that exists nowhere else in the palette,
  // so none can be reached for innocently — the same test the recessed-well entries above
  // pass. Measured after the three consumers were re-pointed: all thirteen have ZERO
  // occurrences under `ui/` outside `terminal-palette.ts` itself, which is why that file joins
  // TOKEN_MODULES in this same commit (U0.5's rule: the allow-list lands WITH the bans).
  //
  // `#4ba3d4` (cursor / three accents), `#99badd`, `#ffd93d`, `#10d177` and `#ff4757` are
  // deliberately absent: the module reads them from `palette[TERMINAL_SCHEME]`, they are live
  // in 15-44 files each, and banning them is the full sweep D3 ruled against.
  ['terminal screen, light', '#0b1420'],
  ['terminal screen, dark', '#060a12'],
  ['terminal bar', '#0a0f18'],
  ['terminal border', '#141c28'],
  ['terminal dot', '#242a31'],
  ['terminal titleText', '#78838f'],
  ['terminal titleMeta', '#5b8f85'],
  ['terminal time gutter', '#74818f'],
  ['terminal body', '#c6d2df'],
  ['terminal blockBg', '#080b11'],
  ['terminal blockBorder', '#1c2733'],
  ['terminal blockText', '#6f8296'],
  ['terminal accent.FILE', '#e0a878'],
]

describe('glass tokens (P0.5 / G6)', () => {
  // Review r1 F18. The trigger U1.4's D-2 named ("the next commit that touches this scan
  // block") fired inside the same PR, so the deferral became a finding and this is the gate it
  // asked for. It is not a string-presence pin standing in for a behaviour: while the demo
  // renders dark, `GLASS_TIER.dark` and `GLASS_TIER[scheme]` ARE the same object, so there is
  // no behaviour to observe — the source text is the whole invariant, exactly as the
  // anti-re-drift scan above it.
  it('no production module hard-codes a scheme half (plan §9 clause 12)', () => {
    // An EMPTY skip set: nothing is exempt, including the two files that declare the halves
    // (review r2 F24 — `tokens/palette.ts` holds the one-site switch itself).
    const offenders = sourceFiles(UI_ROOT, new Set())
      .filter((full) => {
        // A `light:` / `dark:` RECORD ARM is skipped, for the SAME reason `typeof` is excluded
        // above: it is the opposite of a violation. `{ light: …, dark: … } as const` indexed by
        // `[scheme]` is the shape clause 12 WANTS, and naming both halves is the only way to
        // write one. `DangerFill` (`controls/button-recipe.ts:99`) must, because the
        // `*Light`/`*Dark` names invert between schemes; `PrimaryButtonGradient` and
        // `ElevatedEdges` beside it escape only by holding literals, which is luck, not rigour.
        //
        // The ARM is skipped, never the file. A record built this way is inert until something
        // READS a half, and `X.dark` is a member access on its own line — still an offender.
        // Found at merge (W1 -> U2): review r2 F24 emptied the skip set on a tree where no
        // production module declared both halves; U2.2 then added the first one that does.
        const src = stripComments(readFileSync(full, 'utf8'))
          .split(/\r?\n/)
          .filter((line) => !/^\s*(?:light|dark)\s*:/.test(line))
          .join('\n')
        return SCHEME_HALF.some((form) => form.test(src))
      })
      .map((full) => relative(UI_ROOT, full).split(sep).join('/'))
    expect(offenders).toEqual([])
  })

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
      const text = norm(readFileSync(file, 'utf8'))
      for (const [name, literal] of BANNED) {
        if (text.includes(norm(literal))) {
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
      borderAccent: '1px solid rgba(43,140,193,0.25)',
      borderError: '1px solid rgba(255,71,87,0.3)',
      shadowCard: '0 4px 8px rgba(0,0,0,0.15)',
    })
  })

  it('pins the spreadable fragments to the exact clusters they replaced', () => {
    // `glassCard` is no longer "the cluster it replaced" — U1.2 gave it the two parts A31/A32
    // say the demo never rendered, plus A44's elevation, and U1.3 added `glassCardNested`
    // beside it. Both carry ONLY LONGHANDS since the lit-edge ruling: a `border` or
    // `borderColor` key in a fragment is the trap, not the ordering
    // (`partner-lit-edge-ruling.md` §3-§4). The absence of those keys is pinned in
    // `__tests__/glass-card-recipe.test.tsx`, because `toEqual` reads as a value list and a
    // reviewer will not notice a key that is not there.
    expect(glassCard).toEqual({
      borderRadius: 12,
      borderStyle: 'solid',
      borderWidth: 1,
      borderRightColor: 'rgba(28,78,132,0.5)',
      borderBottomColor: 'rgba(28,78,132,0.5)',
      borderLeftColor: 'rgba(28,78,132,0.5)',
      borderTopColor: 'rgba(184,212,240,0.08)',
      background: 'linear-gradient(180deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))',
      boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)',
    })
    expect(glassCardNested).toEqual({
      borderRadius: 12,
      borderStyle: 'solid',
      borderWidth: 1,
      borderRightColor: 'rgba(43,140,193,0.45)',
      borderBottomColor: 'rgba(43,140,193,0.45)',
      borderLeftColor: 'rgba(43,140,193,0.45)',
      borderTopColor: 'rgba(184,212,240,0.2)',
      background: 'linear-gradient(180deg,rgba(23,65,110,0.7),rgba(14,57,101,0.6))',
      boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.15)',
    })
    // `glassBtnPrimary` / `glassBtnSecondary` were pinned here until U2.2 deleted them
    // (A64/A65/A68). Their replacement is pinned as a whole recipe in
    // `ui/controls/__tests__/button-recipe.test.tsx`, which asserts far more than these four
    // keys ever could — the two that mattered here were both WRONG against the phone anyway:
    // the secondary border read `borderLight` where `Button.tsx:144` reads `colors.border`, and
    // its label read `textSecondary` where `:216` reads `colors.text`.
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
    // U1.2's two new parts, read back off the tier for the same reason as the four above: a
    // spelled literal here plus a later phone-side re-tint leaves the drift guard green
    // (it reads `tokens/glass-tiers.ts`) while `/demo` renders the old edge.
    expect(glassCard.borderTopColor, 'the lit edge is the card tier’s highlightTop').toBe(
      t.card.highlightTop,
    )
    expect(glassCard.boxShadow, 'the inset is the card tier’s innerShadow').toBe(
      `inset 0 1px 0 ${t.card.innerShadow}, ${GLASS.shadowCard}`,
    )
    // U1.3 turned U1.1's NEGATIVE into this line: `borderAccent` was the demo's near-miss
    // `rgba(43,140,193,0.3)` while `elevated.border` was `0.25`, and U1.1 pinned the gap so
    // this package could not land `gradientPanel`'s tier without landing its border too.
    expect(GLASS.borderAccent).toBe(`1px solid ${t.elevated.border}`)
    // The nested fragment, same contract as `glassCard` above (A33/A34/A35).
    expect(glassCardNested.background, 'the nested fragment paints the nestedCard tier').toBe(
      `linear-gradient(180deg,${t.nestedCard.gradient[0]},${t.nestedCard.gradient[1]})`,
    )
    for (const side of ['borderRightColor', 'borderBottomColor', 'borderLeftColor'] as const) {
      expect(glassCardNested[side], `${side} is the nestedCard tier's border`).toBe(t.nestedCard.border)
    }
    expect(glassCardNested.borderTopColor).toBe(t.nestedCard.highlightTop)
    expect(glassCardNested.boxShadow).toBe(`inset 0 1px 0 ${t.nestedCard.innerShadow}`)
    // A33's whole point: the nested stops are the SWAP of the card's, so a "fix" that made
    // them a fresh darker pair would pass every value pin above and lose the tier's meaning.
    expect([t.nestedCard.gradient[0], t.nestedCard.gradient[1]]).not.toEqual([
      t.card.gradient[0],
      t.card.gradient[1],
    ])
  })

  it("keeps input-theme's accent stops aliased to GLASS (single-source restyle)", async () => {
    const { T } = await import('@/features/demo/ui/inputs/input-theme')
    expect(T.accentFrom).toBe(GLASS.accentFrom)
    expect(T.accentTo).toBe(GLASS.accentTo)
    expect(GLASS.gradientAccent).toBe(`linear-gradient(180deg,${GLASS.accentFrom},${GLASS.accentTo})`)
  })
})
