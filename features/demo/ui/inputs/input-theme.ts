import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'

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
  textDim: '#cdd9e6',
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
  scrim: 'rgba(4,8,14,0.55)',
  // status
  error: colors.error,
  // dimensions
  rowH: 44,
} as const
