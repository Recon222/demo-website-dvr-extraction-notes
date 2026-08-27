import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { palette, colors, type PaletteToken } from '@/features/demo/ui/tokens/palette'
import { T } from '@/features/demo/ui/inputs/input-theme'

// Guards for the U0.1 palette port (matrix A1-A9, A19, A27, A28).
//
// 1. Shape pin, both halves. Every value is lifted verbatim from the phone's
//    src/constants/Colors.ts at `main`; an edit here silently re-bases the whole demo, so
//    it fails loudly. The drift guard (U0.4) is what proves them against the PHONE — this
//    file proves they have not moved under us in between.
// 2. Key-set parity at RUNTIME. The type constraint on `light` already makes a one-sided
//    key a compile error; this catches the case where someone widens the type to make a
//    one-sided key compile.
// 3. Retired-hex sweep. The old `#0d1b2a` navy ramp is gone from the product, not merely
//    gone from the token module.
// 4. `T`'s aliases resolve to their phone-named source, so re-pointing one is caught.

const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')

/**
 * The design-sync preview sources (D7 / U8.4).
 *
 * They live OUTSIDE `UI_ROOT`, so the sweep below has never seen them — and that is exactly the
 * hazard D7 names: the previews are what the uploaded design bundle RENDERS, so a stale hex here
 * ships the retired palette to the design agent and *nothing flags it*. `#0d1b2a` appeared in all
 * 33 of them (each preview's `<div data-demo-root>` backdrop, which `demo.css` requires because
 * every rule — `box-sizing` included — is scoped to that attribute), and `PickerSheet`/`ModalShell`
 * additionally hand-rolled option-row and input chrome from `#1e3a5f` / `#35A0D6` / `#2580AD`.
 *
 * NO EXEMPTIONS, and the directory is swept whole rather than filtered to the demo's 33: it also
 * holds `config.marketing.json`'s previews, and the Case-File palette contains no member of
 * `RETIRED`, so a hit on that side is drift either way.
 *
 * Previews cannot import the token modules — they resolve `'open-pro-next'`, the bundle global,
 * which exports only the components pinned in `componentSrcMap`. So their hexes are literals by
 * construction and this sweep is the only thing standing behind them.
 */
const PREVIEWS_ROOT = join(process.cwd(), '.design-sync', 'previews')

/** Non-null `componentSrcMap` keys — the components the design bundle actually ships. */
const pinnedComponents = (): string[] =>
  Object.entries(
    JSON.parse(readFileSync(join(process.cwd(), '.design-sync', 'config.json'), 'utf8'))
      .componentSrcMap as Record<string, string | null>,
  )
    .filter(([, src]) => src !== null)
    .map(([name]) => name)

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sourceFiles(full))
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

/**
 * Both sides of the sweep go through this — lower-cased (§4.7) and whitespace-STRIPPED, the
 * same treatment `glass-tokens.test.ts`'s BANNED scan and the drift guard's `norm` apply.
 *
 * Review r1 F3: the needle used to be compared RAW, so the list below worked only by author
 * discipline — an entry written `'#35A0D6'` matched nothing, silently, and every later
 * package is instructed to append to this list. The whitespace strip is for the entries that
 * are coming: a retired `rgba(19,34,54,0.85)` must also catch `rgba(19, 34, 54, 0.85)`.
 */
const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')

/**
 * Hexes the phone RETIRED in its P0 re-base. No file under ui/ may carry one — including
 * the token modules, because there is nothing left for them to define. Matched
 * case-insensitively: the demo mixes spellings for the same colour, and a case-sensitive
 * sweep silently leaves live drift behind.
 */
const RETIRED: ReadonlyArray<[name: string, hex: string, replacement: string]> = [
  ['background', '#0d1b2a', 'colors.background (#002853)'],
  ['border', '#1e3a5f', 'colors.border (#1c4e84)'],
  ['borderLight', '#2a4a6f', 'colors.borderLight (#2e5f97)'],
  // Added by U0.5, closing the rest of the set U0.1/U0.3 replaced (A2, A50). `#132236` and
  // `#0f2035` were the demo's two spellings of the raised navy that became `#0e3965`;
  // `#35A0D6`/`#2580AD` were the accent stops that became `#1F6B99`/`#17527A`.
  ['backgroundSecondary', '#132236', 'colors.backgroundSecondary (#0e3965)'],
  ['backgroundSecondary (T.raised)', '#0f2035', 'colors.backgroundSecondary (#0e3965)'],
  ['accent top stop', '#35a0d6', 'GLASS.accentFrom (#1F6B99)'],
  ['accent bottom stop', '#2580ad', 'GLASS.accentTo (#17527A)'],
]

describe('palette (U0.1 / A1-A9, A19, A27, A28)', () => {
  it('pins the dark scheme to the phone Colors.dark values', () => {
    expect(palette.dark).toEqual({
      primary: '#2B8CC1',
      primaryLight: '#4BA3D4',
      primaryDark: '#1F6B99',
      background: '#002853',
      backgroundSecondary: '#0e3965',
      backgroundTertiary: '#17416e',
      text: '#f0f4f8',
      textSecondary: '#99badd',
      textTertiary: '#7a9fc4',
      textInverse: '#002853',
      border: '#1c4e84',
      borderLight: '#2e5f97',
      borderDark: '#063d72',
      // U8.2 (A10). The ONE grid token the demo has a consumer for; `grid`/`gridLight`
      // (A11/A12) are deliberately not ported — see `palette.ts`'s note.
      gridSubtle: 'rgba(153, 186, 221, 0.11)',
      success: '#10d177',
      successLight: '#0f6b42',
      successDark: '#0faa5e',
      error: '#ff4757',
      errorLight: '#b72136',
      errorDark: '#ee2f44',
      warning: '#ffd93d',
      warningLight: '#7d5f10',
      warningDark: '#ffc62b',
      warningAccent: '#ffc62b',
      info: '#99badd',
      infoLight: '#2e5f97',
      infoDark: '#7a9fc4',
      infoOnLight: '#f0f4f8',
      warningOnLight: '#f0f4f8',
      successOnLight: '#f0f4f8',
      errorOnLight: '#f0f4f8',
      onPrimary: '#ffffff',
      onError: '#ffffff',
      link: '#b8d4f0',
      linkHover: '#d0e4f7',
      card: '#0e3965',
      modal: '#17416e',
      overlay: 'rgba(0, 40, 83, 0.9)',
      overlayLight: 'rgba(0, 40, 83, 0.7)',
      scrim: 'rgba(0, 40, 83, 0.32)',
      disabled: '#2e5f97',
      disabledText: '#6b7f95',
    })
  })

  it('pins the light scheme to the phone Colors.light values (D2 amended — both halves ship)', () => {
    expect(palette.light).toEqual({
      primary: '#1e3a8a',
      primaryLight: '#3b82f6',
      primaryDark: '#1e40af',
      background: '#ffffff',
      backgroundSecondary: '#f9fafb',
      backgroundTertiary: '#f3f4f6',
      text: '#111827',
      textSecondary: '#4b5563',
      textTertiary: '#6b7280',
      textInverse: '#ffffff',
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      borderDark: '#d1d5db',
      gridSubtle: 'rgba(30, 58, 138, 0.06)', // U8.2 (A10) — the light half, per D2
      success: '#10b981',
      successLight: '#d1fae5',
      successDark: '#059669',
      error: '#ef4444',
      errorLight: '#fee2e2',
      errorDark: '#dc2626',
      warning: '#f59e0b',
      warningLight: '#fef3c7',
      warningDark: '#d97706',
      warningAccent: '#b45309',
      info: '#3b82f6',
      infoLight: '#dbeafe',
      infoDark: '#2563eb',
      infoOnLight: '#1e40af',
      warningOnLight: '#78350f',
      successOnLight: '#065f46',
      errorOnLight: '#991b1b',
      onPrimary: '#ffffff',
      onError: '#ffffff',
      link: '#1e40af',
      linkHover: '#1e3a8a',
      card: '#ffffff',
      modal: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
      overlayLight: 'rgba(0, 0, 0, 0.25)',
      scrim: 'rgba(0, 0, 0, 0.5)',
      disabled: '#d1d5db',
      disabledText: '#9ca3af',
    })
  })

  it('carries ONE key set across both halves', () => {
    expect(Object.keys(palette.light).sort()).toEqual(Object.keys(palette.dark).sort())
  })

  it('exposes the consumed scheme as a single switchable site', () => {
    // Consumers read `colors.<phoneName>`; flipping the demo to light is this one binding.
    expect(colors).toBe(palette.dark)
  })

  it('keeps the retired navy ramp out of every UI source file', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(UI_ROOT)) {
      const text = norm(readFileSync(file, 'utf8'))
      for (const [name, hex, replacement] of RETIRED) {
        if (text.includes(norm(hex))) {
          offenders.push(`${relative(UI_ROOT, file).split(sep).join('/')} still carries the retired ${name} ${hex} — use ${replacement}`)
        }
      }
    }
    expect(offenders, `the phone retired these in its P0 re-base:\n${offenders.join('\n')}`).toEqual([])
  })

  describe('the design-sync previews (D7 / U8.4)', () => {
    const scanPreviews = (needle: string): string[] =>
      sourceFiles(PREVIEWS_ROOT)
        .filter((file) => norm(readFileSync(file, 'utf8')).includes(norm(needle)))
        .map((file) => relative(PREVIEWS_ROOT, file).split(sep).join('/'))

    it('every pinned component has a preview painting the PORTED navy', () => {
      // The anti-vacuity control, and a real guard in its own right. An empty offender list below
      // is worth nothing until this walk is shown to bite: a moved root, a renamed directory or a
      // `.jsx` extension would all leave the sweep silently green over 33 stale files. Asserting
      // the exact SET rather than a count also catches the other half of D7 — a component added to
      // `componentSrcMap` with no preview authored, which renders as a floor card in the bundle.
      expect(scanPreviews('#002853').sort()).toEqual(pinnedComponents().map((n) => `${n}.tsx`).sort())
    })

    it('carries no retired hex — no file exempt', () => {
      const offenders = RETIRED.flatMap(([name, hex, replacement]) =>
        scanPreviews(hex).map((f) => `${f} still carries the retired ${name} ${hex} — use ${replacement}`),
      )
      expect(offenders, `the design bundle would ship the retired palette:\n${offenders.join('\n')}`).toEqual([])
    })
  })

  describe('the boot-gate darknesses U8.1 retired (D8, deferred §111)', () => {
    /**
     * Both families are matched on a COMMENT-STRIPPED file, unlike `RETIRED` above.
     *
     * The scrim family's own history is written into four docblocks that quote the literal
     * ("Was `rgba(4,8,14,0.55)`" — `sheet-chrome.ts`, `input-theme.ts`, `CentredDialog.tsx`,
     * `ExportModal.tsx`), and those sentences are the record of why the value moved. Matching
     * raw text would force either their deletion or a five-entry exemption list in which the
     * two real exemptions stopped being visible.
     */
    const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

    /**
     * Needles run against `norm()`ed source, so they see one lower-cased, whitespace-free
     * spelling of each family — which is what lets one alternation stand in for the hex and the
     * functional forms at once. `spellings` is the control that proves it: ledger §120 records
     * this suite's other sweep passing green over a retired colour merely re-spelled, so an
     * empty offender list is worth nothing until the needle is shown to bite.
     */
    const FAMILIES = [
      {
        name: 'the boot ground',
        replacement: 'SCANNER_GROUND (palette[scheme].background, #002853)',
        needle: /#000314|rgba?\(0,3,20/,
        // `#000314` has no letters, so upper- and lower-case are the same string — the
        // case-insensitivity `norm` provides is real but untestable here, and saying so beats a
        // control that only looks like two spellings.
        spellings: ['#000314', 'rgb(0, 3, 20)', 'rgba(0, 3, 20, 0.55)'],
        exempt: [] as readonly string[],
      },
      {
        name: 'the scrim family',
        replacement: 'palette[scheme].scrim, or .overlay for chrome over media',
        needle: /#04080e|rgba?\(4,8,14/,
        spellings: ['#04080e', '#04080E', 'rgb(4, 8, 14)', 'rgba(4, 8, 14, 0.55)'],
        /**
         * The two permanent exemptions §111 ruled, and no others — an unlisted file is an
         * offender by default.
         *
         * `_shared.modalScrim` is a demo-only stand-in (the phone's page sheets are native
         * `pageSheet` presentations with an OS dim, so there is no phone token to port), and
         * `ExitDialog` is D12-frozen: it sits outside the phone frame and is not a phone
         * surface at all. `BootSequence.tsx` was the third and is why the ban could not land
         * until this package.
         */
        exempt: ['screens/_shared.tsx', 'controls/ExitDialog.tsx'] as readonly string[],
      },
    ] as const

    const scan = (needle: RegExp): string[] =>
      sourceFiles(UI_ROOT)
        .filter((file) => needle.test(norm(stripComments(readFileSync(file, 'utf8')))))
        .map((file) => relative(UI_ROOT, file).split(sep).join('/'))

    it.each(FAMILIES)('$name: the needle matches every spelling of the colour', (family) => {
      for (const spelling of family.spellings) {
        expect(family.needle.test(norm(spelling)), `${family.name} misses ${spelling}`).toBe(true)
      }
    })

    it.each(FAMILIES)('$name: no file outside the ruled exemptions carries it', (family) => {
      expect(
        scan(family.needle).filter((f) => !family.exempt.includes(f)),
        `use ${family.replacement}`,
      ).toEqual([])
    })

    it.each(FAMILIES)('$name: every exemption is still a real one', (family) => {
      // The anti-vacuity half. An exemption that no longer spells the value is a hole nobody
      // notices, because the scan it widens has no way to report that it was widened for
      // nothing — so the list shrinks in the commit that removes the last spelling, or reds.
      // Sorted on both sides: `scan` walks the tree in directory order, which is not the order
      // a human lists exemptions in, and an order-sensitive compare would red for that alone.
      expect(scan(family.needle).filter((f) => family.exempt.includes(f)).sort()).toEqual(
        [...family.exempt].sort(),
      )
    })
  })

  it("resolves every T alias to its phone-named palette source", () => {
    const ALIASES = {
      bg: 'background',
      raised: 'backgroundSecondary',
      border: 'border',
      text: 'text',
      textMute: 'textSecondary',
      textFaint: 'textTertiary',
      primary: 'primary',
      error: 'error',
    } as const satisfies Record<string, PaletteToken>

    // Review r1 F5: `toBe(colors[key])` compares two STRINGS, so it cannot tell an alias from
    // a re-typed literal — de-aliasing `input-theme.ts`'s `textMute` to '#99badd' passed all
    // 20 cases across the three token suites. The control de-alias on `bg` only died because
    // `#002853` is BANNED, and the five keys below (`text`, `textMute`, `textFaint`, `primary`,
    // `error`) are exactly the unchanged high-frequency hexes U0.5 left deliberately un-banned,
    // so nothing at all caught those. Pin the SOURCE structurally as well as the value — the
    // repo's sanctioned idiom where the source text IS the invariant.
    // Line comments are STRIPPED first, and that is not tidiness: without it a leftover
    // `// was textMute: colors.textSecondary` above a re-typed literal satisfies the regex
    // and the pin passes over the exact edit it exists to catch (probed: SURVIVED). Same
    // defect class as review r1 F4 on the drift guard's `region()`, same one-line remedy.
    const themeSrc = readFileSync(join(UI_ROOT, 'inputs', 'input-theme.ts'), 'utf8').replace(
      /\/\/[^\n]*/g,
      '',
    )

    for (const [tKey, paletteKey] of Object.entries(ALIASES) as [keyof typeof ALIASES, PaletteToken][]) {
      expect(T[tKey], `T.${tKey} must alias palette.${paletteKey}`).toBe(colors[paletteKey])
      expect(
        new RegExp(`\\b${tKey}:\\s*colors\\.${paletteKey}\\b`).test(themeSrc),
        `input-theme.ts must SOURCE ${tKey} from colors.${paletteKey}, not re-type its value`,
      ).toBe(true)
    }
  })
})
