import type { CSSProperties } from 'react'

import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { radius } from '@/features/demo/ui/tokens/scale'

/**
 * Shared glass-aesthetic tokens for the demo UI (parity P0.5 / matrix G6).
 *
 * The demo styles inline (no Tailwind — see features/demo/CLAUDE.md). Before this module the
 * same gradient/border/radius literals were copy-pasted across ~25 files; they are extracted
 * here so a future restyle is a one-file change. This is DEDUPLICATION, not restyling — every
 * value below is byte-identical to the literals it replaced.
 *
 * SINCE U1.1 THIS MODULE IS A PROJECTION, NOT A SOURCE. The card/diagonal/panel gradients
 * and the soft border are DERIVED from `tokens/glass-tiers.ts` (`SEAM(U1.1)`) at module init,
 * so the phone's six-tier system is the single source and these four keys cannot drift from it
 * by hand. The ~54 files that import `GLASS` keep working unchanged. New code should reach for
 * `GLASS_TIER[scheme].<tier>` directly; these four survive for the call sites that predate it.
 *
 * Conventions:
 * - `GLASS.*` string tokens are full CSS values (border shorthands include `1px solid`).
 * - `glassCard` / `glassBtnPrimary` / `glassBtnSecondary` are spreadable style fragments for
 *   the exact repeated clusters; call sites override/extend around them.
 * - Sibling token modules stay scoped: `inputs/input-theme.ts` (`T`, the picker theme — its
 *   accent stops are sourced from here) and `screens/map/mapTokens.ts` (map sheet colours).
 * - MIRROR (review R-25): `app/css/style.css` `@theme` re-declares `accentFrom`/`accentTo`
 *   and the `borderError` red as `--color-demo-accent-from/-to` / `--color-demo-error` for
 *   the `/demo` route error page (`app/demo/error.tsx`), which styles with Tailwind and
 *   sits outside this module's guard-test scan root. Restyle both together.
 */

// The phone's `PrimaryButtonGradient.dark` (`Colors.ts:471-474`): `[Colors.dark.primaryDark,
// '#17527A']`. Kept as module CONSTS spelled as literals — the drift guard's anchors 7/8
// read them with `readConst`, which matches literals, not identifier references.
//
// Measured with `onPrimary` (#ffffff): 5.80:1 on the top stop, 8.32:1 on the bottom. The
// character INVERTS from the demo's old pair — light->mid becomes mid->dark. Do NOT lighten
// either stop and do NOT re-tokenise the light pair to [primaryLight, primaryDark]: the old
// dark recipe measured 2.94:1, and that light swap takes a passing 5.17 down to 3.68.
const ACCENT_FROM = '#1F6B99'
const ACCENT_TO = '#17527A'

/**
 * The glass tiers for the scheme the demo renders (`SEAM(U1.1)`).
 *
 * `scheme` comes from `tokens/palette.ts`, which owns the ONE consumed-scheme site (§9
 * clause 12). Resolving it here rather than writing `GLASS_TIER.dark` is what keeps flipping
 * the demo to light a one-line change.
 */
const tier = GLASS_TIER[scheme]

export const GLASS = {
  // accent gradient stops (single source — input-theme's T re-exports these)
  accentFrom: ACCENT_FROM,
  accentTo: ACCENT_TO,
  // gradients
  // A29 - the `card` tier, vertical. Derived, so a phone-side re-base moves both of these.
  gradientCard: `linear-gradient(180deg,${tier.card.gradient[0]},${tier.card.gradient[1]})`,
  // D11 - a 135° variant of the SAME stops. The phone has no diagonal gradient anywhere; the
  // owner ratified keeping it, re-based, so it re-bases with `card` by construction.
  gradientCardDiag: `linear-gradient(135deg,${tier.card.gradient[0]},${tier.card.gradient[1]})`,
  // A36 - `gradientPanel` IS the `elevated` tier's gradient; the two were the same recipe under
  // two names. `GLASS.borderAccent` below is the other half of that tier and is NOT derived yet
  // - see its comment.
  gradientPanel: `linear-gradient(180deg,${tier.elevated.gradient[0]},${tier.elevated.gradient[1]})`,
  gradientAccent: `linear-gradient(180deg,${ACCENT_FROM},${ACCENT_TO})`,
  /** Faint blueprint grid backgroundImage (phone screen + modal sheets). */
  gridOverlay:
    'repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)',
  // border shorthands
  border: `1px solid ${colors.border}`,
  // A30 - `card.border`. U0.1 already landed the VALUE (`colors.border` at 50%, which CSS
  // cannot express as alpha-on-hex); U1.1 only re-points it at the tier that owns it, so this
  // line is a refactor with a byte-identical result and no pin moved.
  borderSoft: `1px solid ${tier.card.border}`,
  borderBtn: `1px solid ${colors.borderLight}`,
  // A36/U1.3 - NOT derived, deliberately. `tier.elevated.border` is `rgba(43,140,193,0.25)`
  // and this is still the demo's near-miss `0.3`; deriving it now would silently ship U1.3's
  // value change inside U1.1 and redden two pins that package owns (the shape pin and the
  // `accent border` ban). U1.3 changes the value and re-points this line in the same commit.
  borderAccent: '1px solid rgba(43,140,193,0.3)',
  borderError: '1px solid rgba(255,71,87,0.3)',
  // A44 (U1.2) - `Layout.shadow.card.dark`, phone `Layout.ts:130-136`: `shadowColor '#000'`,
  // `shadowOffset {0,4}`, `shadowOpacity 0.15`, `shadowRadius 8`. RN spends five props on
  // what CSS spends one on. The MISSING-SEAM the row names is the demo's 22 distinct
  // box-shadows across 26 occurrences (demo inventory §2.5), almost every one a one-off;
  // this is the raised-surface recipe they were all approximating.
  //
  // NOT derivable from `GLASS_TIER`: `innerShadow` is the tier's INSET, a different value on
  // a different axis. `Layout.shadow` is one of the three things the phone's design-sync
  // generator deliberately does not emit (phone §1.Y.3), so it is a hand-port either way.
  shadowCard: '0 4px 8px rgba(0,0,0,0.15)',
} as const

/**
 * The card surface — the phone's FOUR-part glass composition plus the card elevation shadow
 * (matrix A31, A32, A44, A54; the composition is A40 / phone §1.8 `conventions.md`).
 *
 * ```css
 * background:       <card.gradient>       A29
 * border:           1px solid <border>    A30
 * border-top-color: <highlightTop>        A31 - the lit top edge
 * box-shadow:       inset 0 1px 0 <innerShadow>,   A32
 *                   0 4px 8px rgba(0,0,0,0.15)     A44
 * border-radius:    lg (12)               A43 - the depth tier
 * ```
 *
 * WHY `borderTopColor` AND NOT A CHILD ELEMENT. The phone paints the highlight as a 1px
 * absolutely-positioned `<View>` at `top:0, zIndex:1` inside an `overflow:'hidden'` wrapper
 * (`Card.tsx:170-174,229-236`) because RN has no per-side border colour. On the web the
 * published recipe is the longhand, and it is what `conventions.md` itself prescribes.
 *
 * KEY ORDER IS LOAD-BEARING (§4.3). `borderTopColor` must come AFTER `border`: React replays
 * an inline style object in insertion order, and a shorthand written after a longhand erases
 * it. The same rule binds every CONSUMER — `{ ...glassCard, border: '1px solid X' }` and
 * `{ ...glassCard, borderColor: 'X' }` BOTH wipe the lit edge, because `border-color` is
 * itself a four-side shorthand. A consumer that must re-tint the sides sets `borderColor`
 * and then re-sets `borderTopColor`. Pinned across all nine consumers in
 * `ui/__tests__/glass-card-recipe.test.tsx`, which is where that failure is observable.
 *
 * `padding` is deliberately NOT here even though `conventions.md` lists it: the demo's ten
 * card sites carry six different paddings lifted from the prototype, and demo §0.4 forbids
 * tidying lifted pixel values.
 */
export const glassCard = {
  borderRadius: radius.lg,
  border: GLASS.borderSoft,
  borderTopColor: tier.card.highlightTop,
  background: GLASS.gradientCard,
  boxShadow: `inset 0 1px 0 ${tier.card.innerShadow}, ${GLASS.shadowCard}`,
} as const satisfies CSSProperties

/** Primary CTA base: radius `control` · borderless · accent gradient · white text. */
export const glassBtnPrimary = {
  borderRadius: radius.control,
  border: 'none',
  background: GLASS.gradientAccent,
  color: '#fff',
} as const satisfies CSSProperties

/** Secondary button base: radius `control` · button border · raised fill · muted text. */
export const glassBtnSecondary = {
  borderRadius: radius.control,
  border: GLASS.borderBtn,
  background: colors.backgroundSecondary,
  color: colors.textSecondary,
} as const satisfies CSSProperties
