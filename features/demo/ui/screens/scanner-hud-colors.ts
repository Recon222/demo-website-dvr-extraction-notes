import type { BootHudState } from '@/features/demo/engine/logic/boot'
import { palette, type ColorScheme } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U8.1): the boot gate's palette. Matrix A87 (the values), A91 (why it is a NAMED
 * CONSTANT BLOCK and not a theme token), decision D8 (the ground).
 *
 * Web port of the COLOURS half of the phone's
 * `src/components/layout/scanner-hud-constants.ts` at `dd5551ec`. Before this module
 * `SplashScreen.tsx` was the demo's one full outlier — zero shared tokens, `#2B8CC1` bare
 * twelve times, and `#30D158`, a fifth green that existed nowhere else in the product
 * (demo-ui-inventory §3.2).
 *
 * ## What does NOT port, deliberately
 *
 * `FRAME_SIZE` / `CORNER_SIZE` / `ICON_SIZE` and the whole timing, typography and spacing
 * half of the phone's file (`:81-227`). The phone's own docblock at `:166-179` refuses to
 * tokenise its type scale because it is "a bespoke scale for a 280px scanner frame"; the
 * demo's frame is a 378px-wide phone shell with a 220px HUD, so importing 280's proportions
 * would be importing the wrong bespoke scale. Plan §5 U8.1 states the same rule from the
 * other side: dimensions and timing are the demo's own.
 *
 * ## A91: a named constant block, NOT a theme token set
 *
 * The gate paints itself full-bleed before any app chrome is visible, on both hosts, so the
 * phone pins this palette to `Colors.dark` rather than following the active scheme
 * (phone `:8-14`). The demo has no theme context, so the forced scheme is a constant — and a
 * SEPARATE constant from `tokens/palette.ts`'s app-level `scheme`, for the reason
 * `terminal-palette.ts:22-33` gives at length: `colors.textSecondary` here would put
 * light-theme grey on a navy gate the day light opens. `palette.dark.*` would be the
 * phone-literal spelling but is banned by `glass-tokens.test.ts`'s scheme-half scan, which
 * makes the indexed form the only correct one as well as the only permitted one.
 *
 * ## The phone's `failed` trio is absent because the state is
 *
 * The phone has four scanner states; the demo's `BootHudState` has three
 * (`engine/logic/boot.ts:48`). There is no `failed` arm and no retry hint here — the scan is
 * simulated and cannot fail, which is the same honesty the disclosure line states out loud.
 * A dead fourth key would be a trio no code can reach and no `Record` can protect, so the
 * phone's `failed` (`error` / `withAlpha(error, 0.3)` / `errorOnLight`, phone `:69-73`) is
 * recorded here in prose and lands the day a failure arm does.
 *
 * ## Contrast, measured on {@link SCANNER_GROUND}. Pinned in `ui/__tests__/palette-contrast.test.ts`.
 *
 * | Role                    | Value                     | Ratio | Floor |
 * |-------------------------|---------------------------|-------|-------|
 * | `idle/scanning.text`    | `#99badd`                 | 7.30  | 4.5   |
 * | `authorized.text`       | `#10d177`                 | 7.29  | 4.5   |
 * | `idle/scanning.primary` | `#2B8CC1` (marks only)    | 3.94  | 3.0   |
 * | `authorized.primary`    | `#10d177` (marks only)    | 7.29  | 3.0   |
 * | {@link SCANNER_DISCLOSURE_TEXT} | `textSecondary` @0.8 | 5.19 | 4.5  |
 *
 * **`primary` is a MARK colour on this surface, never a text colour** — deferred.md §89 and
 * its W3 successor F52. The phone spends `primary` on its 26px status line and clears the
 * WCAG large-text 3:1 allowance at 3.94 (phone `:40-41`); the demo's status line is 23px, so
 * the large-text allowance does not apply and the same value would ship a 3.94 AA failure on
 * the one screen a visitor cannot skip past without finding the control. The severity is
 * carried by the brackets, the glow and the sweep line, all of which are still `primary` —
 * matrix §C.3 rule 1, the campaign's most portable recipe.
 */

/**
 * The gate's `<ForceColorScheme scheme="dark">`. Index the palette with THIS, never with
 * `tokens/palette.ts`'s app-level `scheme` — see the docblock.
 */
export const SCANNER_SCHEME = 'dark' satisfies ColorScheme

const forced = palette[SCANNER_SCHEME]

/** Phone `:34-37`: `primary` paints the frame, the corner brackets and the sweep line;
 *  `glow` is the diffuse halo behind them; `text` is every string the state renders. */
export interface ScannerStateColors {
  readonly primary: string
  readonly glow: string
  readonly text: string
}

/**
 * One trio per HUD state, TOTAL over `BootHudState` — the same obligation `SplashScreen`'s
 * `statusBody` carries, so a fourth state is a compile error in both places rather than an
 * unstyled branch in one.
 *
 * `idle` takes the phone's `initializing` trio (phone `:59-63`): same beat, different copy
 * (the phone auto-triggers and says INITIALIZING; the demo waits for a tap and says TAP TO
 * SCAN).
 */
export const SCANNER_COLORS = {
  idle: {
    primary: forced.primary,
    glow: withAlpha(forced.primary, 0.25),
    text: forced.textSecondary,
  },
  scanning: {
    primary: forced.primary,
    glow: withAlpha(forced.primary, 0.35),
    text: forced.textSecondary,
  },
  authorized: {
    primary: forced.success,
    glow: withAlpha(forced.success, 0.35),
    text: forced.success,
  },
} as const satisfies Record<BootHudState, ScannerStateColors>

/**
 * The gate's full-bleed ground — decision **D8**.
 *
 * Was `#000314`, a one-off in no token, lifted when the phone's
 * `AuthenticatedSplashScreen` still hardcoded it to match its native launch screen. At
 * `main` there is **zero live `#000314` anywhere in the phone**: ruling D5(a) moved all six
 * sites to `Colors.dark.background`. `src/DOCUMENTATION-PLAN.md:934` still claims the old
 * value and is a doc-mining hazard (plan §8 F7) — this port very nearly inherited it.
 *
 * The new ground is LIGHTER, so every ratio measured over the old one falls. That is not a
 * side effect to note afterwards; it is the reason the disclosure's alpha moved below.
 */
export const SCANNER_GROUND = forced.background

/**
 * The standing "simulated scan" disclosure.
 *
 * The alpha is load-bearing, not taste, and this is the second time it has had to move. It
 * shipped at 0.55 (3.59:1 over the old ground) — the one string carrying the surface's
 * honesty claim was the least readable text on a screen full of decoration, so a low-vision
 * visitor was shown a convincing biometric gate and could not read the caption saying it was
 * fake. P8 review R-6 took it to 0.70 for 5.27:1.
 *
 * On {@link SCANNER_GROUND} that same 0.70 measures **4.31 — under the 4.5 floor again**.
 * 0.80 measures 5.19: clear of AA, and still subordinate to the 7.30 the HUD's own strings
 * now carry, which is the whole point of holding it below full opacity.
 */
export const SCANNER_DISCLOSURE_TEXT = withAlpha(forced.textSecondary, 0.8)

/**
 * The SKIP pill — a demo-only escape hatch (deferred §87: the phone's splash cannot be
 * skipped, because its dwell is an OS biometric prompt the visitor is actively answering).
 * No phone value to port; these are the demo's, expressed in tokens.
 *
 * ## `fill` is `overlay`, NOT `scrim` — a deliberate deviation from plan §5's U8.1 row
 *
 * The row says "the skip pill's `rgba(4,8,14,0.55)` → the scrim token". `scrim` is a
 * BACKDROP alpha (0.32) tuned for a sheet over the app's own ground; this pill floats over
 * an arbitrary intro video at `zIndex: 2` (`BootSequence.tsx`), which is the case U4.4
 * carved `MEDIA_CLOSE_CHIP` and `PDF_LOADING_SCRIM` out of `scrim` for, at `overlay`'s
 * exact value. Measured, {@link SCANNER_SKIP_PILL.label} over the fill over a white frame:
 *
 *   `scrim` 0.32 → **1.02** · the shipped `rgba(4,8,14,0.55)` → 2.07 · `overlay` 0.9 → **4.80**
 *
 * `overlay` is the only one of the three that keeps the pill's label legible over any frame,
 * and it is a token, not a fourth darkness. Ledger §111's exemption list is unaffected: the
 * `rgba(4,8,14,*)` family leaves this file either way.
 */
export const SCANNER_SKIP_PILL = {
  fill: forced.overlay,
  /** 1.87 on the ground — a decorative edge on a control whose label carries 6.17, the
   *  §118 input-boundary family (it measured 1.91 before D8 lightened the ground). */
  border: withAlpha(forced.primary, 0.45),
  label: withAlpha(forced.textSecondary, 0.9),
} as const
