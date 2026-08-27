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
      success: '#10d177',
      successDark: '#0faa5e',
      error: '#ff4757',
      errorLight: '#b72136',
      errorDark: '#ee2f44',
      warning: '#ffd93d',
      warningDark: '#ffc62b',
      info: '#99badd',
      infoDark: '#7a9fc4',
      onPrimary: '#ffffff',
      onError: '#ffffff',
      link: '#b8d4f0',
      linkHover: '#d0e4f7',
      card: '#0e3965',
      modal: '#17416e',
      overlay: 'rgba(0, 40, 83, 0.9)',
      overlayLight: 'rgba(0, 40, 83, 0.7)',
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
      success: '#10b981',
      successDark: '#059669',
      error: '#ef4444',
      errorLight: '#fee2e2',
      errorDark: '#dc2626',
      warning: '#f59e0b',
      warningDark: '#d97706',
      info: '#3b82f6',
      infoDark: '#2563eb',
      onPrimary: '#ffffff',
      onError: '#ffffff',
      link: '#1e40af',
      linkHover: '#1e3a8a',
      card: '#ffffff',
      modal: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
      overlayLight: 'rgba(0, 0, 0, 0.25)',
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
