import type { CSSProperties } from 'react'

import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import { palette, scheme, type ColorScheme, type PaletteToken } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U3.2): the demo's ONE status severity recipe, and the ONE status pill built on it.
 *
 * Source of truth: the phone's `src/features/location/map-view/utils/status-severity.ts`
 * (`STATUS_SEVERITY` `:27-33`, `STATUS_ACCENT` `:66-72`) and
 * `src/features/case-management/components/CaseStatusBadge.tsx` (the badge, `:30-88`,
 * `severityConfig` `:117-128`, `neutralConfig` `:130-138`), both at `main` `dd5551ec`.
 *
 * ## The one sentence every consumer gets wrong once
 *
 * There are TWO status colour vocabularies and they are not interchangeable:
 *
 * | You are painting | Take | Because |
 * |---|---|---|
 * | a badge, chip or banner — it has a FILL and TEXT | `severityTone()` | the text needs AA 4.5:1 against the fill it sits on |
 * | a bare dot, or a 1px selection edge — no fill, no text | `.accent` | WCAG 1.4.11's 3:1 applies to the MARK itself, and the `*Light` tones are far too pale to carry it |
 *
 * Spending the accent as a foreground is the specific defect the phone's `Banner` docblock
 * records: it measures **1.92-2.24:1** on its own tone in three of the four severities.
 * Spending a `*Light` fill as a dot is the mirror of it.
 *
 * ## What is deliberately NOT here
 *
 * - **`MAP_PIN_COLORS` (`screens/map/mapTokens.ts:26-31`) stays exactly as it is.** It paints
 *   marks ONTO satellite tiles, which never follow a theme, so it is pinned to the dark values
 *   on purpose (phone ruling D8a). Reading it for anything inside a theme-aware surface is what
 *   measured `started` at 1.26:1 — the reason this module exists.
 * - **A `primary` severity.** D8(a) created the `*Light` / `*OnLight` pair for the four
 *   severities only, which is why `working` maps to `info` and not to `primary`
 *   (phone `CaseStatusBadge.tsx:154-160`). `SEVERITIES` is closed at four for that reason: the
 *   template reads below are what make a fifth member a COMPILE ERROR rather than a runtime
 *   `undefined`.
 */

/** The four severities that own a `*Light` fill and a measured `*OnLight` foreground. */
export type StatusSeverity = 'info' | 'warning' | 'success' | 'error'

/** The four, enumerable. A pin loops this rather than re-typing the union. */
export const SEVERITIES = ['info', 'warning', 'success', 'error'] as const satisfies readonly StatusSeverity[]

/**
 * `LocationMapStatus` (plus the case-level `incident`) -> the severity whose `*Light` /
 * `*OnLight` pair a badge is painted from. Phone `status-severity.ts:27-33`.
 *
 * `as const satisfies` in both directions: a new `LocationMapStatus` member that nobody rules on
 * here is a compile error, and so is a severity that has no token trio.
 */
export const STATUS_SEVERITY = {
  started: 'warning',
  working: 'info',
  complete: 'success',
  /** Case-level incident rows and chips. */
  incident: 'error',
} as const satisfies Record<LocationMapStatus | 'incident', StatusSeverity>

/**
 * Severity -> the token a BARE MARK is painted from. Phone `status-severity.ts:66-72`, whose
 * measured figures (worst stop of `card` and `sheet`, both themes) are:
 *
 *   started   warningAccent   6.82 dark / 4.58 light
 *   working   infoDark        3.87 dark / 4.72 light
 *   complete  successDark     3.54 dark / 3.44 light
 *   incident  error           3.21 dark / 3.44 light
 *
 * Four distinct hues, which is half the acceptance bar (DEF-UI-017) — pinned as contrast rows
 * 22-25 and row 30 in `ui/__tests__/palette-contrast.test.ts`.
 *
 * NOT the severity's own name: `warningAccent` is a separate token from `warningDark` even
 * where dark spells them the same hex, and `infoDark`/`successDark` are not `info`/`success`.
 */
const SEVERITY_ACCENT = {
  info: 'infoDark',
  warning: 'warningAccent',
  success: 'successDark',
  error: 'error',
} as const satisfies Record<StatusSeverity, PaletteToken>

/**
 * The phone's `STATUS_ACCENT` (`:66-72`), status-keyed. Written out rather than composed from
 * the two tables above, exactly as the phone writes it: a derived table agrees with its own
 * generator however the generator is wrong. `status.test.ts` pins the two against each other.
 */
export const STATUS_ACCENT = {
  started: 'warningAccent',
  working: 'infoDark',
  complete: 'successDark',
  /** Case-level incident rows and chips. */
  incident: 'error',
} as const satisfies Record<LocationMapStatus | 'incident', PaletteToken>

/** One severity, resolved against one scheme. The badge, the note and the dot all read this. */
export interface SeverityTone {
  /** The OPAQUE `*Light` fill. Never a glass gradient: a translucent fill composites over an
   *  unknown parent and the ratio stops being measurable. */
  background: string
  /** The saturated severity, as a 1px border. A SECOND carrier, not decoration — in dark all
   *  four `*OnLight` tokens are `#f0f4f8`, so the foreground carries no status there and the
   *  fill+border pair has to (phone `CaseStatusBadge.tsx:110-116`). */
  borderColor: string
  /** The measured `*OnLight` foreground — text AND icon. */
  color: string
  /** The bare-mark token. A dot or a 1px selection edge, never the text. */
  accent: string
}

/**
 * THE severity recipe. Every badge, chip, pill, note and banner in the demo resolves here.
 *
 * The scheme defaults to the one the demo renders, so a consumer never spells a half by name
 * (D2: flipping the demo to light stays a one-site change in `palette.ts`).
 */
export function severityTone(severity: StatusSeverity, s: ColorScheme = scheme): SeverityTone {
  const c = palette[s]
  return {
    background: c[`${severity}Light`],
    borderColor: c[severity],
    color: c[`${severity}OnLight`],
    accent: c[SEVERITY_ACCENT[severity]],
  }
}

/** Phone `CaseStatusBadge.tsx:30` — the one tint left, and the only one that carries no hue. */
export const NEUTRAL_TINT_ALPHA = 0.15

/**
 * The ABSENCE of a severity — Archived, Unknown, "saved". Phone `neutralConfig`
 * (`CaseStatusBadge.tsx:130-138`). Deliberately grey: this used to tint all six statuses, which
 * is what collapsed the colour code.
 */
export function neutralTone(s: ColorScheme = scheme): SeverityTone {
  const c = palette[s]
  return {
    background: withAlpha(c.textSecondary, NEUTRAL_TINT_ALPHA),
    borderColor: c.border,
    color: c.text,
    accent: c.textSecondary,
  }
}

export type StatusBadgeSize = 'small' | 'medium' | 'large'

/** Phone `PADDING_VERTICAL` / `PADDING_HORIZONTAL` (`CaseStatusBadge.tsx:32-42`). */
const BADGE_PADDING = {
  small: `${spacing.xxs}px ${spacing.xsm}px`,
  medium: `${spacing.xs}px ${spacing.sm}px`,
  large: `${spacing.xsm}px ${spacing.base}px`,
} as const satisfies Record<StatusBadgeSize, string>

/**
 * Phone `CaseStatusBadge.tsx:70-82` — `Typography.fontSize` `xs` / `sm` / `base`. Commented
 * literals on plan §4.9's ladder (12/14/16); the demo exports no type scale yet (U3.4's R-6).
 */
const BADGE_FONT_SIZE = { small: 12, medium: 14, large: 16 } as const satisfies Record<StatusBadgeSize, number>

/**
 * THE one status pill (matrix A69) — six demo call sites, one recipe.
 *
 * `borderWidth` / `borderStyle` / `borderColor` and never the `border` shorthand: a shorthand
 * written after a longhand erases it, and React writes only CHANGED keys on update, so the
 * erasure survives the re-render that would otherwise repair it. Three longhands leave every
 * side independently overridable.
 *
 * `display: inline-block` because four of the six sites render inside a `<button>`; the phone's
 * `<View><Text/></View>` pair collapses to one element on the web.
 */
export function statusBadgeStyle(tone: SeverityTone, size: StatusBadgeSize = 'medium'): CSSProperties {
  return {
    display: 'inline-block',
    background: tone.background,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tone.borderColor,
    // A43's depth ladder: a pill is `lg` (12) here because the phone's badge is
    // `Layout.borderRadius.lg` (`CaseStatusBadge.tsx:63`), not because it is a control.
    borderRadius: radius.lg,
    padding: BADGE_PADDING[size],
    fontSize: BADGE_FONT_SIZE[size],
    // No `textTransform` and no `letterSpacing`: both are absent at `main`, and three of the
    // demo's six sites carry one or both today.
    fontWeight: 600,
    color: tone.color,
  }
}
