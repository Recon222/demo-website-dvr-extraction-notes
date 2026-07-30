import type { CSSProperties } from 'react'

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

const ACCENT_FROM = '#35A0D6'
const ACCENT_TO = '#2580AD'

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
  border: '1px solid #1e3a5f',
  borderSoft: '1px solid rgba(30,58,95,0.5)',
  borderBtn: '1px solid #2a4a6f',
  borderAccent: '1px solid rgba(43,140,193,0.3)',
  borderError: '1px solid rgba(255,71,87,0.3)',
} as const

/** The G6 card-surface triple: radius 12 · soft hairline · vertical card gradient. */
export const glassCard = {
  borderRadius: 12,
  border: GLASS.borderSoft,
  background: GLASS.gradientCard,
} as const satisfies CSSProperties

/** Primary CTA base: radius 10 · borderless · accent gradient · white text. */
export const glassBtnPrimary = {
  borderRadius: 10,
  border: 'none',
  background: GLASS.gradientAccent,
  color: '#fff',
} as const satisfies CSSProperties

/** Secondary button base: radius 10 · button border · raised navy fill · muted text. */
export const glassBtnSecondary = {
  borderRadius: 10,
  border: GLASS.borderBtn,
  background: '#132236',
  color: '#99badd',
} as const satisfies CSSProperties
