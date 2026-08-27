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
// So the top stop is the SAME hex as `colors.primaryDark`, held twice. `= colors.primaryDark`
// would blind the guard; `satisfies typeof colors.primaryDark` keeps the literal readable AND
// makes the duplication a type-level identity, so re-basing the palette without re-basing the
// stop stops compiling. Without it that mutation is green on any run where the phone repo is
// absent (ledger §91) — and the AA claim at `palette-contrast.test.ts:307-317` measures
// against `GLASS.accentFrom`, so it would move WITH the stale value. `ACCENT_TO` has no
// palette sibling and stays plain.
//
// Measured with `onPrimary` (#ffffff): 5.80:1 on the top stop, 8.32:1 on the bottom. The
// character INVERTS from the demo's old pair — light->mid becomes mid->dark. Do NOT lighten
// either stop and do NOT re-tokenise the light pair to [primaryLight, primaryDark]: the old
// dark recipe measured 2.94:1, and that light swap takes a passing 5.17 down to 3.68.
const ACCENT_FROM = '#1F6B99' satisfies typeof colors.primaryDark
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
} as const

/** The G6 card-surface triple: radius `lg` · soft hairline · vertical card gradient. */
export const glassCard = {
  borderRadius: radius.lg,
  border: GLASS.borderSoft,
  background: GLASS.gradientCard,
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
