import type { ImportLogLevel } from '@/features/demo/engine/logic/import-log'
import { palette, type ColorScheme } from '@/features/demo/ui/tokens/palette'

/**
 * SEAM(U7.1): the one console palette. Matrix A85 (the values), A86 (the type ramp),
 * A91 (why it is a NAMED CONSTANT BLOCK and not a theme token).
 *
 * Web port of the phone's `src/features/import/pdf-import/constants/terminal-palette.ts`
 * at `dd5551ec` (PR #117, `826ac10b`), whose own docblock is the source for everything
 * below. Three demo files used to own four parallel copies of these shades —
 * `ImportTerminalProgress`'s `TERM_CHROME` + `C`, `TerminalLine`'s `LEVEL_ACCENT` +
 * `TERM_ROW`, and `NotesScreen`'s `PANEL_BG`/`PANEL_BORDER` — which is the exact drift the
 * phone's module was created to end ("two features owned the same off-system palette and
 * had already drifted", phone `:10-12`). This module is the single owner.
 *
 * ## A91: this is a named constant block, NOT a theme token set
 *
 * The console GROUND is deliberately far darker than `colors.background`.
 * D6(a)'s rider is binding: **do not tokenise it to the app ground.** What CAN be a theme
 * token is one — but read through {@link TERMINAL_SCHEME}, never through `colors`.
 *
 * ## Why `palette[TERMINAL_SCHEME]` and not `colors`
 *
 * The phone wraps the terminal in `<ForceColorScheme scheme="dark">`
 * (`ImportTerminalProgress.tsx:343`) and then writes `Colors.dark.*` here, because reading
 * those tokens through `useTheme()` INSIDE the forced subtree returns exactly the dark
 * values (phone `:14-18`). The demo has no theme context, so the forced scheme is a
 * constant — and it is a SEPARATE constant from `tokens/palette.ts`'s `scheme` on purpose:
 * `colors` is the APP scheme, and plan §9 clause 12 makes flipping it a one-site change, so
 * a `colors.textSecondary` here would put light-theme grey (`#4b5563`) on a near-black
 * ground the day light opens. `palette.dark.*` would be the phone-literal spelling but is
 * banned by `glass-tokens.test.ts`'s scheme-half scan (review r1 F18 / r2 F24), which is
 * what makes the indexed form the only correct one as well as the only permitted one.
 *
 * ## Contrast (WCAG AA, 4.5:1 — the terminal type ramp is all sub-18.66px, so the
 * large-text allowance never applies). Phone `:20-35`, pinned in
 * `ui/__tests__/palette-contrast.test.ts`.
 *
 * | Foreground   | Ground        | Ratio   |
 * |--------------|---------------|---------|
 * | `titleText`  | `bar`         | 4.97:1  |
 * | `titleMeta`  | `bar`         | 5.22:1  |
 * | `time`       | `screen.dark` | 4.98:1  |
 * | `body`       | `screen.dark` | 12.91:1 |
 * | `blockText`  | `blockBg`     | 4.98:1  |
 * | `accent.*`   | `screen.dark` | 5.94 (error) to 14.38 (norm) |
 *
 * `titleText` (was `#55606b`, 2.99:1), `titleMeta` (was `#4a7c76`, 4.05:1) and `time` (was
 * `#3a475a`, 2.10:1) were raised on the phone; hue preserved, lightness lifted until each
 * cleared AA. The time gutter is evidentiary context on a forensic surface, not decoration.
 *
 * ## NOT in this module, deliberately
 *
 * The headline, the progress track and the outcome badge/CTA sit OUTSIDE the phone's
 * forced-dark subtree and read the APP theme — they take `colors.*`, not this palette.
 * `ImportTerminalProgress`'s jump pill, processing badge and CTA outcome colours carry
 * their own phone deltas that A85 does not list; see the U7.1 report's deferral proposal.
 */

/**
 * The demo's `<ForceColorScheme scheme="dark">`. Index the palette with THIS, never with
 * `tokens/palette.ts`'s app-level `scheme` — see the docblock.
 */
export const TERMINAL_SCHEME = 'dark' satisfies ColorScheme

const forced = palette[TERMINAL_SCHEME]

export const TERMINAL_PALETTE = {
  /**
   * The console ground, keyed by the APP scheme — the one thing here that is not forced
   * dark. `NotesScreen`'s inset lifts a few points on a light app so it does not read as a
   * hole punched in a white page; the import terminal always uses the dark arm. Phone `:57`.
   */
  // F45's shape, in a module written after F45 closed: a two-key record whose keys HAPPEN to
  // read `light`/`dark` names no `ColorScheme`, so a renamed or added scheme half is a silent
  // `undefined` at every `screen[scheme]` read rather than a compile error. `mapTokens.ts:96`
  // is the correct sibling. `satisfies` inside the `as const` keeps the literal types the
  // consumers rely on AND makes the key set a type-level obligation.
  screen: {
    light: '#0b1420',
    dark: '#060a12',
  } as const satisfies Record<ColorScheme, string>,
  /** Title bar / chrome strip above the log. Phone `:59`. */
  bar: '#0a0f18',
  /** Panel outline, and the divider under the title bar. Phone `:61`. */
  border: '#141c28',
  /** The three inert "window" dots. Decorative; carries no state. Phone `:63`. */
  dot: '#242a31',
  /** Title-bar label ("pdf-import · in-browser" here; the phone claims on-device). Phone `:65`. */
  titleText: '#78838f',
  /** Title-bar right meta (the trust line). Meaningful copy. Phone `:67`. */
  titleMeta: '#5b8f85',
  /** T+ offset gutter on each log row. Phone `:69`. */
  time: '#74818f',
  /** Default log-message text. Phone `:71`. */
  body: '#c6d2df',
  /** Detail-dump block: recessed ground, left rail, and its text. Phone `:73-75`. */
  blockBg: '#080b11',
  blockBorder: '#1c2733',
  blockText: '#6f8296',
  /** Blinking caret while the run is live — and the title bar's live dot. Phone `:77`. */
  cursor: forced.primaryLight,
  /** Message text for an ERR-level row. Phone `:79`. */
  error: forced.error,
  /**
   * Per-level syntax accents for the log tag and message. Keyed by the demo engine's
   * UPPERCASE `ImportLogLevel`; the phone's levels are lowercase and its keys follow.
   *
   * `FILE` is the one intentional off-system colour: the ten levels need ten
   * distinguishable hues and the palette has no warm mid-tone that is not already spoken
   * for by `warning` (NORM). Kept, named and measured (9.47:1). Phone `:80-101`.
   */
  accent: {
    INIT: forced.textSecondary,
    FILE: '#e0a878',
    PDF: forced.textSecondary,
    AI: forced.primaryLight,
    // Was the pre-recolor legacy teal (A89's purge). `textTertiary` is both a real
    // token and the semantically right one: verbose dumps should recede. Phone `:93-95`.
    VERB: forced.textTertiary,
    NORM: forced.warning,
    CASE: forced.primaryLight,
    OK: forced.success,
    DONE: forced.success,
    ERR: forced.error,
  } satisfies Record<ImportLogLevel, string>,
} as const

/**
 * The terminal's declared type ramp (matrix A86). Sub-`fontSize.xs` (12) on purpose — a log
 * pane trades character size for lines-on-screen, and the human-readable progress lives in
 * the headline and the live status region above it, both on the normal ramp. Every colour
 * above is measured at the STRICTER normal-text threshold precisely because the text is
 * small. Named so the four sizes stay in lockstep across `ImportTerminalProgress` and
 * `TerminalLine` instead of drifting as literals. Phone `:104-118`.
 *
 * §4.9: these are off-scale by design and stay commented literals — never snapped to the
 * `12/14/16/…` web step ramp.
 */
export const TERMINAL_FONT_SIZE = {
  /** Detail-dump body. */
  detail: 9,
  /** Title-bar meta. */
  meta: 9.5,
  /** Log rows: gutter, tag, message. Also the title-bar label and the jump pill. */
  row: 10,
  /** The live caret. */
  cursor: 11,
} as const
