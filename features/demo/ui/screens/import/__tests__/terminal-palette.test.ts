import { describe, it, expect, vi } from 'vitest'
import type { ImportLogLevel } from '@/features/demo/engine/logic/import-log'
import {
  TERMINAL_PALETTE,
  TERMINAL_FONT_SIZE,
  TERMINAL_SCHEME,
} from '@/features/demo/ui/screens/import/terminal-palette'
import { palette } from '@/features/demo/ui/tokens/palette'

/**
 * U7.1 / matrix A85, A86, A91 — the one console palette.
 *
 * The value pin below is a change-detector on purpose (a `toEqual` over thirteen off-system
 * console shades), but it is NOT the package's only teeth: the three AA raises are pinned by
 * RATIO in `ui/__tests__/palette-contrast.test.ts`, and each consumer's rendered colour is
 * pinned behaviourally in `ImportTerminalProgress.test.tsx` / `TerminalLine.test.tsx`. This
 * file's job is the module's SHAPE — that a member did not silently vanish, and that a new
 * `ImportLogLevel` cannot be added without giving it an accent.
 */
describe('TERMINAL_PALETTE (U7.1 / A85, A91)', () => {
  it('pins the console palette to the phone terminal-palette.ts values', () => {
    expect(TERMINAL_PALETTE).toEqual({
      // phone `terminal-palette.ts:57` — the one scheme-forked key; `light` exists solely
      // for the notes inset, which lifts its panel on a light app.
      screen: { light: '#0b1420', dark: '#060a12' },
      bar: '#0a0f18', // phone `:59`
      border: '#141c28', // phone `:61`
      dot: '#242a31', // phone `:63`
      titleText: '#78838f', // phone `:65` — RAISED from #55606b (2.99 -> 4.97)
      titleMeta: '#5b8f85', // phone `:67` — RAISED from #4a7c76 (4.05 -> 5.22)
      time: '#74818f', // phone `:69` — RAISED from #3a475a (2.10 -> 4.98)
      body: '#c6d2df', // phone `:71`
      blockBg: '#080b11', // phone `:73`
      blockBorder: '#1c2733', // phone `:74`
      blockText: '#6f8296', // phone `:75`
      cursor: '#4BA3D4', // phone `:77` Colors.dark.primaryLight
      error: '#ff4757', // phone `:79` Colors.dark.error
      accent: {
        INIT: '#99badd', // phone `:89` textSecondary
        FILE: '#e0a878', // phone `:90` — the one deliberate off-system colour, 9.47:1
        PDF: '#99badd', // phone `:91`
        AI: '#4BA3D4', // phone `:92` primaryLight
        VERB: '#7a9fc4', // phone `:95` textTertiary — was #4ECDC4, the pre-recolor teal
        NORM: '#ffd93d', // phone `:96` warning
        CASE: '#4BA3D4', // phone `:97`
        OK: '#10d177', // phone `:98` success
        DONE: '#10d177', // phone `:99`
        ERR: '#ff4757', // phone `:100`
      },
    })
  })

  it('sources every themeable member from the palette module, never a re-typed hex', () => {
    // The phone writes `Colors.dark.*` for exactly these; the demo writes
    // `palette[TERMINAL_SCHEME].*`. If someone re-inlines the hex the values still match —
    // so this asserts IDENTITY with the token, which a re-inline cannot fake once the token
    // moves. (It is the same guarantee `rn-token-parity` gives the app palette.)
    const forced = palette[TERMINAL_SCHEME]
    expect(TERMINAL_PALETTE.cursor).toBe(forced.primaryLight)
    expect(TERMINAL_PALETTE.error).toBe(forced.error)
    expect(TERMINAL_PALETTE.accent.INIT).toBe(forced.textSecondary)
    expect(TERMINAL_PALETTE.accent.PDF).toBe(forced.textSecondary)
    expect(TERMINAL_PALETTE.accent.AI).toBe(forced.primaryLight)
    expect(TERMINAL_PALETTE.accent.CASE).toBe(forced.primaryLight)
    expect(TERMINAL_PALETTE.accent.VERB).toBe(forced.textTertiary)
    expect(TERMINAL_PALETTE.accent.NORM).toBe(forced.warning)
    expect(TERMINAL_PALETTE.accent.OK).toBe(forced.success)
    expect(TERMINAL_PALETTE.accent.DONE).toBe(forced.success)
    expect(TERMINAL_PALETTE.accent.ERR).toBe(forced.error)
  })

  it('declares its own forced scheme, distinct from the app scheme it must not follow', () => {
    // The demo's expression of the phone's `<ForceColorScheme scheme="dark">`
    // (`ImportTerminalProgress.tsx:343`).
    expect(TERMINAL_SCHEME).toBe('dark')
    expect(TERMINAL_PALETTE.accent.INIT).toBe(palette.dark.textSecondary)
    expect(TERMINAL_PALETTE.accent.INIT).not.toBe(palette.light.textSecondary)
  })

  it('does NOT follow the app scheme: flipping it to light leaves the console dark (plan §9 clause 12)', async () => {
    // THE pin for this module's one non-obvious design decision, and it exists because a
    // mutation probe proved the assertion above cannot carry it. Swapping
    // `palette[TERMINAL_SCHEME]` for `palette[scheme]` in the module SURVIVED every
    // behavioural pin in this package — of course it did: both resolve to 'dark' while the
    // demo renders dark. That is the F18 class `glass-tokens.test.ts` documents ("no
    // behavioural pin can ever see it"), and F18 settled for a source scan.
    //
    // A source scan is not needed here. The distinction IS observable — just not at the
    // demo's current scheme. Mock the app scheme to 'light' and re-import: a module reading
    // the FORCED scheme is unmoved, a module reading the APP scheme goes light-grey on a
    // near-black ground. That is precisely the regression clause 12 defers to a U8-exit
    // scratch-worktree flip; for this module it is checked every run instead.
    vi.resetModules()
    try {
      vi.doMock('@/features/demo/ui/tokens/palette', async () => {
        const actual = await vi.importActual<typeof import('@/features/demo/ui/tokens/palette')>(
          '@/features/demo/ui/tokens/palette',
        )
        // A coherent light app: both the scheme switch and the record derived from it.
        return { ...actual, scheme: 'light', colors: actual.palette.light }
      })
      const flipped = await import('@/features/demo/ui/screens/import/terminal-palette')
      expect(flipped.TERMINAL_PALETTE.accent.INIT).toBe(palette.dark.textSecondary)
      expect(flipped.TERMINAL_PALETTE.cursor).toBe(palette.dark.primaryLight)
      expect(flipped.TERMINAL_PALETTE.error).toBe(palette.dark.error)
      // The one key that SHOULD have a light arm still has both, untouched — `screen` is
      // keyed by the APP scheme by the phone's own design, and its consumer indexes it.
      expect(flipped.TERMINAL_PALETTE.screen.light).toBe('#0b1420')
    } finally {
      vi.doUnmock('@/features/demo/ui/tokens/palette')
      vi.resetModules()
    }
  })

  it('names the sub-xs type ramp instead of four loose literals (A86)', () => {
    // phone `terminal-palette.ts:109-118`. Deliberately below Typography.fontSize.xs (12):
    // "a log pane trades character size for lines-on-screen".
    expect(TERMINAL_FONT_SIZE).toEqual({ detail: 9, meta: 9.5, row: 10, cursor: 11 })
  })

  it('gives every ImportLogLevel an accent (a new level is a compile error, and this proves the runtime set)', () => {
    // The compile-time half is `satisfies Record<ImportLogLevel, string>` in the module; this
    // is the runtime half, so a widened level with a hand-added accent still has to be listed.
    const levels: ImportLogLevel[] = ['INIT', 'FILE', 'PDF', 'AI', 'VERB', 'NORM', 'CASE', 'OK', 'DONE', 'ERR']
    expect(Object.keys(TERMINAL_PALETTE.accent).sort()).toEqual([...levels].sort())
  })
})
