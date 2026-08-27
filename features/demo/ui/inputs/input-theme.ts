import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { touchTarget } from '@/features/demo/ui/tokens/scale'

/**
 * Shared inline-style tokens for the demo's custom pickers.
 *
 * The demo styles inline (no Tailwind — see features/demo/CLAUDE.md). This object keeps
 * the palette + key dimensions DRY across Dropdown, Calendar, DateField, TimeWheel, and
 * TimeField. Values match the demo's existing screen styling and the phone app's glass
 * aesthetic (deep navy + primary cyan). Accent gradient stops are sourced from the
 * UI-wide `glass-tokens` module so a restyle stays a one-file change.
 *
 * U0.1: the colour keys are now ALIASES of `tokens/palette.ts` (the phone's `Colors`,
 * ported name-for-name). `T` keeps its own short names because seven `inputs/` files spell
 * them, but the values live in exactly one place. New code outside `inputs/` reads
 * `colors.<phoneName>` directly — `T` is the picker library's local vocabulary, not the
 * palette.
 */
export const T = {
  // surfaces
  bg: colors.background,
  raised: colors.backgroundSecondary,
  border: colors.border,
  // text
  text: colors.text,
  // `textDim` was here and is DELETED, not re-pointed (A72/U6.4a) — the same treatment A22
  // gave `scrim` below, and for a sharper reason. It was the ONE key in `T` that was not an
  // alias of a palette token: a bare dark value with no light sibling, so every surface
  // reading it was invisible to `palette[scheme]` and the one-line light flip (plan §9
  // clause 12) would have left all of them on the dark half. Its two readers here and its six
  // hand-spelled copies elsewhere were all the SAME recipe — a form-field label — which now
  // lives once, as `fieldLabelStyle` in `tokens/field-input.ts`. Reach for that; a surface
  // that re-grows a private label tone is a compile error now rather than a review finding.
  textMute: colors.textSecondary,
  textFaint: colors.textTertiary,
  // accents
  primary: colors.primary,
  accentFrom: GLASS.accentFrom,
  accentTo: GLASS.accentTo,
  primarySoft: 'rgba(43,140,193,0.08)',
  primaryEdge: 'rgba(43,140,193,0.25)',
  // glass
  topHighlight: 'rgba(184,212,240,0.25)',
  // `scrim` was here and is DELETED, not re-pointed (A22/U4.4). It had ZERO readers
  // tree-wide — every site the matrix called a "`T.scrim` consumer" spelled the literal
  // `rgba(4,8,14,0.55)` itself — so re-pointing it would have created an alias to the new
  // token that nothing reads. `colors.scrim` is the one backdrop token; import it directly.
  // status
  error: colors.error,
  // dimensions
  // The phone's `Layout.touchTarget.min` (44). `as const` keeps the literal type, and the
  // drift guard reads `scale.ts` directly, so this hop costs the guard nothing.
  rowH: touchTarget.min,
} as const
