import type { CSSProperties } from 'react'

import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors, palette, scheme } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget, withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U2.2): the demo's ONE button recipe — five variants x three sizes x enabled/disabled,
 * in both scheme halves.
 *
 * Source of truth: the phone's `src/components/common/Button.tsx` at `main` (`dd5551ec`), plus
 * the three per-scheme records it imports from `src/constants/Colors.ts` and the two scales it
 * reads from `Layout.ts` / `Typography.ts`. Matrix rows A50, A51, A52, A64, A65, A66, A67, A68,
 * A19, A23; decisions D2 (both halves), D10 (disabled), D12 (the demo-only wash below).
 *
 * ## Why a FUNCTION and not a spreadable const
 *
 * The state space is 5 x 3 x 2 = thirty style objects. The two fragments this replaces
 * (`glassBtnPrimary` / `glassBtnSecondary`) covered two of the thirty and left every call site to
 * re-derive padding, label size, min-height and the disabled treatment by hand — which is exactly
 * what happened: forty-odd sites, each with its own `padding: 13 | 14 | 15` and
 * `fontSize: 13 | 14 | 14.5 | 15`, and a disabled idiom (`opacity: 0.45` over the LIVE gradient)
 * that the phone does not have. Same reasoning as U2.1's `fieldInputStyle`.
 *
 * ## The border family is FOUR LONGHANDS, deliberately, and there is no shorthand anywhere
 *
 * `border` and `border-color` are both four-side shorthands, so in an inline style object either
 * one erases every side longhand written BEFORE it (§4.3). `glass-tokens.ts` documents an escape
 * hatch for its card fragments — "override `borderColor`, then re-set `borderTopColor`" — and
 * W1's web lane proved that hatch BROKEN through a spread: object spread keeps a re-assigned key
 * at its ORIGINAL insertion position, so `{ ...frag, borderColor: X, borderTopColor: frag.top }`
 * still emits `borderTopColor` before `borderColor` and the shorthand wins anyway.
 *
 * This recipe therefore emits `borderStyle` + `borderWidth` + the four `border*Color` longhands
 * and NO shorthand at all, which removes the trap rather than documenting it. Consumers spread it
 * LAST and override only keys outside the border family. A consumer that genuinely must re-tint a
 * side sets that side's longhand — which now works, because there is no shorthand left to lose to.
 *
 * ## What is deliberately NOT ported from `Button.tsx`
 *
 * - **`overflow: 'hidden'`** (`:118`) — RN needs it to clip an absolutely-positioned
 *   `<LinearGradient>` child. On the web the gradient IS the background; there is nothing to clip.
 * - **The 500ms delayed spinner and the `opacity: 0`-held label** (`:64-77`, `:287-296`) — that is
 *   component-local state and a timer, i.e. behaviour. §2 puts behaviour out of scope and D20's
 *   carve-out names six packages; U2.2 is not one of them. No demo button has a `loading` prop
 *   today, so there is no consumer for it either. Proposed as a deferral in the U2.2 report.
 * - **`safeImpactAsync()` / `activeOpacity`** (`:265`, `:270`) — haptics and RN press feedback,
 *   both on §2's phone-only-mechanics list.
 * - **`accessibilityRole` / `accessibilityState`** (`:276-277`) — a native `<button>` carries the
 *   role, and the demo's house rule is `aria-disabled` over `disabled` so keyboard focus is never
 *   stranded. Call sites keep owning that; a style recipe must not.
 */

/**
 * The CTA fill. Phone `Colors.ts:471-474`.
 *
 * The dark pair points AT `glass-tokens.ts`'s `ACCENT_FROM` / `ACCENT_TO` rather than restating
 * them, because `.design-sync/check-rn-parity.mjs:459-460` reads those two with `readConst`, which
 * matches LITERALS and not identifier references — they must stay spelled over there, so the
 * literal lives there once and this record is the derived name. `linear-gradient(180deg,dark[0],
 * dark[1])` is therefore byte-identical to `GLASS.gradientAccent`.
 *
 * The light pair had no demo counterpart and no owning package before U2.2 (U0.3 re-based the dark
 * stops only); it lands here so `palette-contrast.test.ts`'s light CTA rows can stop being
 * `it.todo`. Do NOT lighten either dark stop and do NOT re-tokenise light to
 * `[primaryLight, primaryDark]`: the old dark recipe measured 2.94:1 under `onPrimary` and that
 * light swap takes a passing 5.17 down to 3.68 (`Colors.ts:461-469`).
 */
export const PrimaryButtonGradient = {
  light: ['#2563eb', '#1d3584'],
  dark: [GLASS.accentFrom, GLASS.accentTo],
} as const satisfies Record<'light' | 'dark', readonly [string, string]>

/**
 * The lit-top / grounded-bottom edge pair that turns a flat gradient into a raised, pressable
 * surface (matrix A51). Phone `Colors.ts:487-490`, transcribed with its spacing.
 *
 * White and black rather than theme tokens on purpose: specular highlight and cast shadow are the
 * light source and its absence, not palette colours (`Colors.ts:482-484`). The demo's one existing
 * hand-rolled copy of the dark pair is `MediaLibrarySheet.tsx:723-724` — byte-identical apart from
 * `rgba()` spacing, and left to U7.2, which opens that file whole.
 */
export const ElevatedEdges = {
  light: { top: 'rgba(255, 255, 255, 0.35)', bottom: 'rgba(0, 0, 0, 0.1)' },
  dark: { top: 'rgba(255, 255, 255, 0.14)', bottom: 'rgba(0, 0, 0, 0.3)' },
} as const

/**
 * The DEEP red a filled destructive control paints, so `onError` (`#ffffff` in both schemes) can
 * clear AA on it (matrix A52). Phone `Colors.ts:510-513`.
 *
 * A LOOKUP and not two literals because the `*Light` / `*Dark` names INVERT between schemes: the
 * deep red is `errorDark` in light and `errorLight` in dark. Measured with `onError` — flat
 * `error` 3.34 dark / 3.76 light FAIL; `errorDark` in both 4.10 / 4.83 (dark fails); this pair
 * 6.39 / 4.83 PASS. `palette-contrast.test.ts` pins the mapping at THIS constant, not at a
 * consumer: the phone's `SwipeDeleteAction` suite compared the rendered value against `DangerFill`
 * itself and stayed 32/32 green through a mutation back to the failing pair.
 */
export const DangerFill = {
  light: palette.light.errorDark,
  dark: palette.dark.errorLight,
} as const

/**
 * The demo-only tint under the three sample/fallback buttons (D12: *follow* — they are inside the
 * frame). `primary` at 14%, derived so a palette re-base carries it.
 *
 * It is an OVERRIDE on `outline`, never a sixth variant: the phone's `Button` has exactly five,
 * and neither this wash nor the `#9fd4ee` label it replaces returns a single hit anywhere in the
 * phone's `src/` at `dd5551ec` (measured). Matrix A66 counted these among its "six outline sites";
 * they are not outline sites, and the difference is a whole recipe.
 */
export const SAMPLE_TINT = withAlpha(colors.primary, 0.14)

/** Phone `Button.tsx:21`. */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
/** Phone `Button.tsx:22`. */
export type ButtonSize = 'small' | 'medium' | 'large'

export interface ButtonRecipeOptions {
  /** Phone default `primary` (`Button.tsx:41`). */
  variant?: ButtonVariant
  /** Phone default `medium` (`Button.tsx:42`). No `large` in the map view — A68, PR #127. */
  size?: ButtonSize
  /**
   * Phone `isDisabled = disabled || loading` (`Button.tsx:54`). The demo has no `loading`, so this
   * is the whole of it. D10: this paints `colors.disabled` only on the variants the PHONE fills,
   * and `disabledText` on every label.
   */
  disabled?: boolean
}

/** Phone `:96-110` through `Layout.spacing:10-21` / `Layout.touchTarget:54-59`, and `:180-189`
 *  through `Typography.fontSize:17-26`. The three label sizes are on §4.9's ladder as-is. */
const SIZES: Record<ButtonSize, Pick<CSSProperties, 'padding' | 'minHeight' | 'fontSize'>> = {
  small: { padding: `${spacing.sm}px ${spacing.md}px`, minHeight: touchTarget.min, fontSize: 14 },
  medium: { padding: `${spacing.md}px ${spacing.lg}px`, minHeight: touchTarget.comfortable, fontSize: 16 },
  large: { padding: `${spacing.lg}px ${spacing.xl}px`, minHeight: touchTarget.large, fontSize: 18 },
}

/** The four border sides, in one place, so no caller ever spells a shorthand. */
type Edges = { top: string; right: string; bottom: string; left: string }
const uniform = (color: string): Edges => ({ top: color, right: color, bottom: color, left: color })

/** Fill + label + edges + the two primary-only shadows, per variant. Phone `:114-162` / `:193-236`. */
function paint(variant: ButtonVariant, disabled: boolean) {
  const edges = ElevatedEdges[scheme]
  const gradient = PrimaryButtonGradient[scheme]
  // Phone `:200`, `:216`, `:228`, `:231`, `:234` — the label token is uniform across all five
  // variants even though the FILL is not. WCAG 1.4.3 exempts inactive controls and the phone
  // declines to chase these branches (`:225-226`); the demo inherits that, it does not "fix" it.
  const color = disabled ? colors.disabledText : undefined

  switch (variant) {
    case 'primary':
      // Phone `:115-141` + `:194-213` + `:279-286`. The gradient is a CHILD on RN and the
      // background here; both are absent when disabled. Left/right are transparent regardless.
      return {
        background: disabled ? colors.disabled : `linear-gradient(180deg,${gradient[0]},${gradient[1]})`,
        color: color ?? colors.onPrimary,
        edges: {
          top: disabled ? colors.disabled : edges.top,
          right: 'transparent',
          bottom: disabled ? colors.disabled : edges.bottom,
          left: 'transparent',
        },
        // RN spends five props (`shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`) on
        // what CSS spends one on; A64 fixes the dark mapping and light follows the same rule,
        // folding `shadowColor`'s own alpha into `shadowOpacity` (1 x 0.22).
        boxShadow: disabled
          ? undefined
          : scheme === 'dark'
            ? '0 6px 20px rgba(0, 0, 0, 0.45)'
            : '0 6px 20px rgba(30, 58, 138, 0.22)',
        textShadow: disabled
          ? undefined
          : scheme === 'dark'
            ? '0 1px 1px rgba(255, 255, 255, 0.06)'
            : '0 1px 1px rgba(0, 0, 0, 0.1)',
      }
    case 'secondary':
      // Phone `:142-145` + `:215-217`. `colors.border`, not `borderLight`; `colors.text`, not
      // `textSecondary` — both of which the fragment this replaces had one rung off.
      return {
        background: disabled ? colors.disabled : colors.backgroundSecondary,
        color: color ?? colors.text,
        edges: uniform(disabled ? colors.disabled : colors.border),
      }
    case 'outline':
      // Phone `:146-153` + `:227-229`. `link` and not `primary`: the 1px outline is the ONLY mark
      // of a control here, so 1.4.11's 3:1 bites, and `primary` measured 2.81 on the glass these
      // sit on. The FILL stays transparent even disabled — D10's "only where the phone fills".
      return {
        background: 'transparent',
        color: color ?? colors.link,
        edges: uniform(disabled ? colors.disabled : colors.link),
      }
    case 'ghost':
      // Phone `:154-157` + `:230-232`. No disabled branch in the style at all — only the label
      // moves.
      return { background: 'transparent', color: color ?? colors.link, edges: uniform('transparent') }
    case 'danger':
      // Phone `:158-161` + `:233-235`.
      return {
        background: disabled ? colors.disabled : DangerFill[scheme],
        color: color ?? colors.onError,
        edges: uniform(disabled ? colors.disabled : DangerFill[scheme]),
      }
  }
}

/**
 * The whole button, as one inline style object.
 *
 * RN splits this across `buttonStyle` (the box) and `textStyle` (the label) because a `<Text>` is
 * a separate node; a web `<button>` carries both and inherits `color` / `fontSize` / `textShadow`
 * to its children, so one object is the port, not a simplification.
 *
 * Spread it LAST at the call site, then override only keys outside the border family.
 */
export function buttonStyle({
  variant = 'primary',
  size = 'medium',
  disabled = false,
}: ButtonRecipeOptions = {}): CSSProperties {
  const { background, color, edges, boxShadow, textShadow } = {
    boxShadow: undefined as string | undefined,
    textShadow: undefined as string | undefined,
    ...paint(variant, disabled),
  }

  return {
    // Phone `:82-84` + `:176`.
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    // Phone `:90`: `Layout.borderRadius.control` — all five variants, one corner (A68: COMPLETE).
    borderRadius: radius.control,
    // Phone `:91`: `borderWidth: 1` on the BASE, so `ghost` has a 1px transparent border too and
    // every variant is the same painted height. `borderStyle` is CSS's default-none problem, not
    // RN's — without it a `borderWidth` renders nothing.
    borderStyle: 'solid',
    borderWidth: 1,
    borderTopColor: edges.top,
    borderRightColor: edges.right,
    borderBottomColor: edges.bottom,
    borderLeftColor: edges.left,
    ...SIZES[size],
    // Phone `:175`: `Typography.fontWeight.semibold`.
    fontWeight: 600,
    background,
    color,
    // Web-only affordance; RN has no cursor. `not-allowed` matches the demo's existing idiom on
    // every `aria-disabled` control.
    cursor: disabled ? 'not-allowed' : 'pointer',
    ...(boxShadow ? { boxShadow } : {}),
    ...(textShadow ? { textShadow } : {}),
  }
}
