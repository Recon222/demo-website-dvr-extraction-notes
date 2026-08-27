/**
 * SEAM(U4.1): the bottom-sheet recipe. Matrix A38 (the `sheet` tier), A46 (the upward shadow)
 * and A58 (`GlassBottomSheet`'s chrome). `GlassBottomSheet.tsx` mounts these; U4.2, U5.1 and
 * U7.2 spread the surface constants without mounting the shell.
 *
 * Source of truth: the phone's `src/components/common/GlassBottomSheet.tsx` at `main`
 * (`dd5551ec`) — `styles` `:475-556`, the sheet's border overrides `:404-406`, the header
 * `:314-320`, the handle `:298-308` — plus `GlassAccentStrip.tsx:26-56` for the strip. Every
 * number below is lifted with its `file:line`; nothing is invented or "tidied".
 *
 * ## What paints the ground
 *
 * `GLASS_TIER[scheme].sheet` (A38), read through the consumed-scheme site — never
 * `GLASS_TIER.dark`. The tier's FOURTH part, `innerShadow`, is deliberately NOT painted here:
 * the phone's sheet composes `Layout.shadow.sheet` and nothing else (`:441`, `styles.sheet`
 * `:481-488` carries no shadow), so an `inset 0 1px 0` would be a value the phone does not
 * render. Same finding, same reasoning as U1.4's header bars. `sheetSurfaceHasNoInset` in the
 * test file pins the absence.
 *
 * ## The border carries NO shorthand key, and that is load-bearing
 *
 * The tier wants four 1px sides in `border` and a 2px lit top in `highlightTop`. Every spelling
 * that puts a SHORTHAND slot in the fragment — `border`, `borderTop`, or even `borderColor`,
 * which is a four-side shorthand — is a trap for whoever spreads it, so this fragment has none.
 * Only colour LONGHANDS.
 *
 * Ruled by `reports/partner-lit-edge-ruling.md` §3-§4 after two seats measured different paints
 * of the same object and generalised in opposite directions. What settled it:
 *
 *   React writes only the style keys whose VALUE CHANGED (`setValueForStyles`). So a fragment
 *   whose key order protects the edge on first paint stops protecting it on the next update:
 *   the changed shorthand is written, the unchanged `borderTopColor` is skipped, and the edge
 *   silently becomes the side tint. Measured, jsdom and Chromium alike, with React's own
 *   `Updating a style property during rerender (borderColor) when a conflicting property is
 *   set (borderTopColor)` warning:
 *
 *     { ...withBorderColorKey, borderColor: X }   p1 rgb(200,200,200)  p2 rgb(2,2,2)  <- TRAP
 *     { ...thisFragment,       borderColor: X }   p1 rgb(1,1,1)        p2 rgb(2,2,2)  <- LOUD
 *     { ...thisFragment,       three side longhands }  p1/p2/p3 all rgb(200,200,200)  <- OK
 *
 * The middle row is the point. This form does NOT make a `borderColor` override work — it makes
 * it fail on the FIRST paint, visibly, instead of passing review and breaking on an update
 * nobody re-rendered in a test. A trap that survives paint 1 is worse than a plain failure.
 *
 * **The consumer rule, therefore: after spreading this, write only COLOUR LONGHANDS**
 * (`borderRightColor` / `borderBottomColor` / `borderLeftColor`, and `borderTopColor` if you
 * really mean to recolour the lit edge). Never `border`, `borderTop` or `borderColor`.
 * One benign asymmetry, measured and worth knowing: if a consumer applies those longhands
 * CONDITIONALLY, dropping them restores this fragment's own tint rather than falling back to
 * `currentColor` — because the tint lives in longhands here too. Every shorthand-carrying form
 * loses the sides to `currentColor` in that cell.
 *
 * ## What jsdom cannot see
 *
 * `paddingBottom: 'env(safe-area-inset-bottom)'` is DROPPED by jsdom's CSSOM — measured, it
 * reads back `''`. A DOM-level pin on it would assert over an empty declaration and stay green
 * after the value is deleted (plan §4.2's trap). It is pinned on the exported CONSTANT instead,
 * which is falsifiable, and no test asserts it through `element.style`.
 */

import type { CSSProperties } from 'react'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme, type ColorScheme } from '@/features/demo/ui/tokens/palette'
import { radius, withAlpha } from '@/features/demo/ui/tokens/scale'
import { glassHeaderBar } from '@/features/demo/ui/controls/header-chrome'

const sheet = GLASS_TIER[scheme].sheet

/**
 * A46 — `Layout.shadow.sheet` (`Layout.ts:175-190`). Casts UPWARD, because the sheet rises from
 * the bottom edge. The demo had four near-misses of this one recipe; this is the survivor.
 *
 * BOTH HALVES (D2, and W2/F34). RN spends five props (`shadowColor` / `shadowOffset` /
 * `shadowOpacity` / `shadowRadius`) on what CSS spends one on, and light folds `shadowColor`'s
 * own alpha into `shadowOpacity` (0.15 x 1) — the same mapping `button-recipe.ts:167-174`
 * documents. Shipping the dark string unconditionally is what F34 caught: on the flip day every
 * sheet would cast a pure-black 40px shadow onto a pale surface.
 */
export const SHEET_SHADOWS = {
  dark: '0 -8px 40px rgba(0,0,0,0.5)', // Layout.ts:183-189 — #000 / 0 -8 / 0.5 / 40
  light: '0 -8px 28px rgba(30, 58, 138, 0.15)', // Layout.ts:176-182 — 0 -8 / 1 / 28
} as const satisfies Record<ColorScheme, string>

/** The consumed half. Every sheet reads this; the record above is what makes the flip one line. */
export const SHEET_SHADOW = SHEET_SHADOWS[scheme]

/**
 * Enter / exit durations, phone `GlassBottomSheet.tsx:30-31`. The scrim fades across the same
 * window the sheet travels in, so the two read as one motion (PR #127 — before it, the RN
 * `Modal`'s own `animationType="slide"` translated the scrim WITH the sheet, `:373-375`).
 */
export const SHEET_ENTER_MS = 260
export const SHEET_EXIT_MS = 200

/**
 * The scrim's fade keyframe.
 *
 * `demo.css` is frozen (D9 — "the lifted rules + all 17 keyframes"), so this package may not
 * add a `sheetScrimFade`. `termFadeIn` (`demo.css:135-138`) is the frozen sheet's only
 * `opacity: 0 -> 1` keyframe and is what the fade is spelled with. Named here rather than
 * inlined so the constraint is visible at the seam instead of looking like a copy-paste from
 * the import terminal.
 */
export const SCRIM_FADE_KEYFRAME = 'termFadeIn'

/** The sheet's slide-up keyframe — `demo.css:115-118`, already lifted and frozen. */
export const SHEET_SLIDE_KEYFRAME = 'sheetUp'

/**
 * The sheet's painted surface: ground, border, radius, upward cast.
 *
 * Spread this to put a surface on the sheet tier without mounting the shell — that is what
 * U4.2 (`ModalShell` / `SettingsModal`) and U7.2 (the media library) need. Positioning, z and
 * sizing are NOT here: they belong to whoever anchors the surface.
 *
 * `borderRadius.sheet` is 22 (`scale.ts:48`, phone `Layout.ts:49`). Top corners only — a bottom
 * sheet's lower corners are off-screen.
 */
export const sheetSurface = {
  background: `linear-gradient(180deg,${sheet.gradient[0]},${sheet.gradient[1]})`,
  borderTopLeftRadius: radius.sheet,
  borderTopRightRadius: radius.sheet,
  // Longhands only — no `border`, no `borderTop`, and no `borderColor` (which is itself a
  // four-side shorthand). See the docblock; this is the ruled form.
  borderStyle: 'solid',
  borderWidth: 1,
  borderTopWidth: 2,
  borderTopColor: sheet.highlightTop,
  borderRightColor: sheet.border,
  borderBottomColor: sheet.border,
  borderLeftColor: sheet.border,
  boxShadow: SHEET_SHADOW,
  overflow: 'hidden',
  // Web analog of the phone's `insets.bottom` (`:436`), reserved on BOTH the default and the
  // fill-height path — DEF-UI-023 records the asymmetry that caused. Inside the 378x786 demo
  // frame this resolves to 0; it is here so the recipe is honest for a full-viewport host.
  paddingBottom: 'env(safe-area-inset-bottom)',
} as const satisfies CSSProperties

/**
 * The dim behind the sheet. `zIndex` and positioning are the shell's.
 *
 * A22/A90: `colors.scrim`, the one backdrop token, at 0.32 in dark. It was
 * `rgba(4,8,14,0.55)` — one of the twelve competing darknesses U4.4 collapsed.
 */
export const sheetScrim = {
  position: 'absolute',
  inset: 0,
  background: colors.scrim,
  pointerEvents: 'auto',
} as const satisfies CSSProperties

/**
 * The grab zone above the header: a centred 40x4 pill.
 *
 * Phone `styles.handleZone` `:298-302` — `paddingTop: spacing.sm` (8), `paddingBottom:
 * spacing.xs` (4), horizontally centred.
 */
export const sheetHandleZone = {
  display: 'flex',
  justifyContent: 'center',
  paddingTop: 8,
  paddingBottom: 4,
} as const satisfies CSSProperties

/**
 * The drag handle itself. Phone `styles.handle` `:306-310` — 40x4 at `borderRadius.full`.
 *
 * The colour is `withAlpha(textSecondary, 0.25)` (`:305`), which is the phone's own comment on
 * the last two hand-mixed colours in that file: `rgba(184,212,240,0.25)` was a pale blue-white
 * the eye cannot tell from `textSecondary` on a 40x4 pill, so the token won. Resolves here to
 * `rgba(153, 186, 221, 0.25)` — matrix A58's value, reached the way A58 spells it.
 */
export const sheetHandle = {
  width: 40,
  height: 4,
  borderRadius: radius.full,
  background: withAlpha(colors.textSecondary, 0.25),
} as const satisfies CSSProperties

/**
 * The header band — the `header` tier (A37), NOT the sheet tier.
 *
 * `glassHeaderBar` is spread LAST, per U1.4's rule: every layout key this fragment owns is
 * written before it, so nothing below can erase a key the recipe owns. Reusing that module
 * rather than composing a fifth bar is what U1.4's consume-me asks for, and the phone composes
 * this band identically (`:315-320`: the header tier's gradient plus `borderBottomColor`, no
 * highlight edge and no inner shadow).
 *
 * Padding `16/8/12` (A58): phone `styles.header` `:333-336` — `paddingHorizontal: spacing.md`
 * (16), `paddingTop: spacing.sm` (8), `paddingBottom: spacing.base` (12).
 */
export const sheetHeaderBand = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 16px 12px',
  ...glassHeaderBar,
} as const satisfies CSSProperties

/** Phone `styles.headerTitleRow` `:338-343` — `gap: spacing.sm` (8), `flex: 1`. */
export const sheetHeaderTitleRow = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  flex: 1,
  // The phone's `numberOfLines={1}` (`:346`) truncates; a flex child must be allowed to shrink
  // below its content for `text-overflow` to have anything to do.
  minWidth: 0,
} as const satisfies CSSProperties

/**
 * The 6px accent dot. Phone `styles.accentDot` `:348-352` (`spacing.xsm` = 6, `radius.full`)
 * with `backgroundColor: colors.primary` and the dark-only glow at `:326-332` —
 * `shadowOpacity: 0.4`, `shadowRadius: 4`, zero offset.
 */
export const sheetAccentDot = {
  width: 6,
  height: 6,
  borderRadius: radius.full,
  background: colors.primary,
  flexShrink: 0,
  // DARK-ONLY, like the phone's `isDark && {...}` at `:326-332`. W2/F34: shipping it
  // unconditionally would glow a deep-navy `primary` against white.
  boxShadow: scheme === 'dark' ? `0 0 4px ${withAlpha(colors.primary, 0.4)}` : undefined,
} as const satisfies CSSProperties

/**
 * Title: 14/700, `letterSpacing 0.3`, UPPERCASE. Phone `styles.title` `:356-361` plus the
 * dark-only text shadow at `:339-343` (`rgba(0, 0, 0, 0.3)`, offset `0 1`, radius 2).
 * `numberOfLines={1}` (`:346`) becomes the web's three-property ellipsis.
 */
export const sheetTitle = {
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: 0.3,
  textTransform: 'uppercase',
  color: colors.text,
  // DARK-ONLY, like the phone's `isDark && {...}` at `:339-343`. W2/F34.
  textShadow: scheme === 'dark' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : undefined,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const satisfies CSSProperties

/**
 * Subtitle: 12/400, `marginTop 2`. Phone `styles.subtitle` `:362-367` — and its explicit
 * `textTransform: 'none'`, which matters because the title above it is uppercased.
 */
export const sheetSubtitle = {
  fontSize: 12,
  fontWeight: 400,
  marginTop: 2,
  textTransform: 'none',
  color: colors.textSecondary,
} as const satisfies CSSProperties

/**
 * The 2px tapering accent rule under the header — phone `GlassAccentStrip.tsx:41-53`.
 *
 * Five stops derived from `colors.primary` at alphas `0 / shoulder / peak / shoulder / 0` with
 * `locations [0, 0.3, 0.5, 0.7, 1]`; the dark ramp is `peak 0.5, shoulder 0.4`
 * (`GlassAccentStrip.tsx:28`). RN's `start {x:0,y:0}` -> `end {x:1,y:0}` is a horizontal sweep,
 * which is CSS `90deg`. Every stop goes through `withAlpha(colors.primary, ...)` rather than a
 * literal, exactly as the phone component does — the strip follows a palette change instead of
 * being repainted by hand, which is the whole reason that component exists.
 */
const stripStop = (alpha: number) => withAlpha(colors.primary, alpha)
export const sheetAccentStrip = {
  height: 2,
  flexShrink: 0,
  background:
    `linear-gradient(90deg,${stripStop(0)} 0%,${stripStop(0.4)} 30%,` +
    `${stripStop(0.5)} 50%,${stripStop(0.4)} 70%,${stripStop(0)} 100%)`,
} as const satisfies CSSProperties

/**
 * The scrolling body. Phone `styles.body` `:368-370` is `flexShrink: 1` and nothing else — no
 * padding: content pads itself (matrix A82 has the map filters body carry `16/16/8`). The web
 * adds `overflowY` because a flex child does not scroll on its own here.
 */
export const sheetBody = { flexShrink: 1, overflowY: 'auto' } as const satisfies CSSProperties

/** `styles.bodyFill` `:371-373` — a definite height for a scrolling list to `flex: 1` into. */
export const sheetBodyFill = { flex: 1, overflowY: 'auto' } as const satisfies CSSProperties

/** Phone `styles.footer` `:374-376` — `paddingBottom: spacing.base` (12) and nothing else. */
export const sheetFooter = { paddingBottom: 12 } as const satisfies CSSProperties
