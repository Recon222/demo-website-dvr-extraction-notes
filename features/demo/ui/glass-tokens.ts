import type { CSSProperties } from 'react'

import { colors } from '@/features/demo/ui/tokens/palette'
import { radius } from '@/features/demo/ui/tokens/scale'

/**
 * Shared glass-aesthetic tokens for the demo UI (parity P0.5 / matrix G6).
 *
 * The demo styles inline (no Tailwind — see features/demo/CLAUDE.md). Before this module the
 * same gradient/border/radius literals were copy-pasted across ~25 files; they are extracted
 * here so a future restyle is a one-file change. This is DEDUPLICATION, not restyling — every
 * value below is byte-identical to the literals it replaced.
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

export const GLASS = {
  // accent gradient stops (single source — input-theme's T re-exports these)
  accentFrom: ACCENT_FROM,
  accentTo: ACCENT_TO,
  // gradients
  gradientCard: 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))',
  gradientCardDiag: 'linear-gradient(135deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))',
  gradientPanel: 'linear-gradient(180deg,rgba(26,45,68,0.88),rgba(19,34,54,0.95))',
  gradientAccent: `linear-gradient(180deg,${ACCENT_FROM},${ACCENT_TO})`,
  /** Faint blueprint grid backgroundImage (phone screen + modal sheets). */
  gridOverlay:
    'repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)',
  // border shorthands
  border: `1px solid ${colors.border}`,
  // `colors.border` at 50% (A7/A30) — kept as a literal because CSS has no alpha-on-hex.
  borderSoft: '1px solid rgba(28,78,132,0.5)',
  borderBtn: `1px solid ${colors.borderLight}`,
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
