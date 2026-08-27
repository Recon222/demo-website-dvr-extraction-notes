'use client'

import type { CSSProperties, JSX } from 'react'

import { colors } from '@/features/demo/ui/tokens/palette'
import { iconSize, radius, spacing } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U3.3): the ONE severity callout. Matrix A71.
 *
 * Ported from the phone's `src/components/common/Banner.tsx` (`main` @ `dd5551ec`),
 * value for value — `:84-99` is the stylesheet, `:45-82` the dynamic half:
 *
 *   container  flexDirection row · alignItems flex-start · gap  Layout.spacing.sm     (8)
 *              borderRadius Layout.borderRadius.md (8) · borderWidth 1
 *              padding      Layout.spacing.base    (12)
 *   message    flex 1 · fontSize Typography.fontSize.sm (14)
 *              lineHeight fontSize.sm * lineHeight.normal (14 x 1.5 = 21)
 *   icon       Layout.iconSize.sm (20)
 *
 * ## The three-token trio, and why the accent is NOT the foreground
 *
 * background = `colors[<severity>Light]` (`:48`) · borderColor = `colors[severity]` (`:69`) ·
 * foreground = `colors[<severity>OnLight]` (`:52`), spent on BOTH the icon (`:74`) and the text
 * (`:79`). The phone's comment at `:49-51` is the reason and it is measured, not stylistic:
 * *"the saturated accent is reserved for the border: as an icon it drops to 1.92-2.24:1 in three
 * of the eight severity/scheme combinations."* Matrix §C.3 rule 1 says the same for text.
 *
 * The `*Light` names are the trap phone §1.2 note 2 warns about, and `palette.ts`'s docblock
 * carries it in full: **in DARK a `*Light` name is the DARK BACKGROUND TONE** its `*OnLight`
 * foreground sits on. `successLight` is DARKER than `success`, not lighter. (The two values are
 * spelled in `palette.ts` and nowhere else: `glass-tokens.test.ts`'s banned-literal sweep does
 * not strip comments, so quoting a hex here — even to explain it — reads as a re-inline.)
 *
 * ## OPAQUE, deliberately — the single most portable rule in the phone's P0
 *
 * Phone `Banner.tsx:11-16`: *"The `*OnLight` foregrounds are measured against the `*Light`
 * background tones (ruling D8a), and that guarantee only holds if the background is exactly
 * that tone; a translucent gradient composites over whatever the parent happens to be and
 * cannot be measured. A severity callout is a semantic surface, not a depth one, so it does
 * not join the glass tier."* So: no `GLASS`, no `GLASS_TIER`, no `rgba()` fill, ever. All eight
 * `*Light` values are flat opaque hexes in both halves, and `banner.test.tsx` pins that.
 *
 * ## No `icon` prop, and no `dismissible` — neither has ever existed
 *
 * Severity picks the glyph through `SEVERITY_ICON` below (phone `:30-35`). The phone shipped an
 * `icon` prop and deleted it unused in the same PR (`1a17b33a` *"drop Banner's unused icon prop
 * (YAGNI)"*, PR #112); it has never had a dismiss affordance in any revision. A Banner is a
 * status line, not a layout slot and not a toast — `message` is one paragraph of plain text, and
 * anything needing a control beside it puts one there (phone `ExportHub`'s Retry button sits
 * BESIDE the Banner, deliberately: phone-inventory §2.A D2).
 *
 * ## Scheme
 *
 * Every colour resolves through `colors`, i.e. `palette[scheme]` — never `palette.dark`. Plan
 * §9 clause 12: flipping the consumed scheme stays a ONE-SITE change. The light half of the
 * trio exists and is measured; `banner.test.tsx` holds both halves to AA at the tokens.
 *
 * ## Web adaptations of the two RN-only a11y props, and they are not cosmetic
 *
 * `accessible={true}` (phone `:61`) has no web analogue and needs none — an element carrying
 * `role="alert"` IS an accessibility element in the browser; the phone needs the prop because
 * RN's `View` never derives it (phone `:57-60`). `accessibilityLiveRegion` (`:66-68`, Android
 * only) maps to `aria-live`, and the explicit value is load-bearing: `role="alert"` implies
 * `aria-live="assertive"`, so info/success would interrupt whatever is being read unless the
 * politeness is written back down. Same split as the phone: error/warning assertive, else polite.
 */
export type BannerSeverity = 'info' | 'warning' | 'error' | 'success'

/**
 * Phone `:30-35`, glyph for glyph — Ionicons `information-circle` / `warning` / `alert-circle` /
 * `checkmark-circle`, redrawn as the demo's stroked 24-viewBox idiom. `error`'s is byte-identical
 * to the alert-circle already inlined at `PickerStage.tsx`, `ImportModal.tsx` and
 * `DemoErrorBoundary.tsx`, which is the shape those three surfaces already read as "error".
 */
const SEVERITY_ICON: Record<BannerSeverity, JSX.Element> = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-5M12 8h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.4l2.4 2.4 4.6-5.2" />
    </>
  ),
}

/**
 * The severity glyph, in the shell phone `:70-80` draws it in — 20px (`Layout.iconSize.sm`),
 * `fill="none"`, stroke 2, round caps, `flexShrink: 0`, and `aria-hidden` because the message
 * already carries the meaning (`:76-77`).
 *
 * Exported for `_pane-chrome.tsx`'s `PaneNote`, which renders the phone's `Banner` RECIPE
 * without its live-region SEMANTICS (see that file's docblock, and `pane-chrome.test.tsx`'s
 * drift guard). Extracting the glyph is what keeps the two from drawing different icons for the
 * same severity; it is not a widening of `Banner`'s own contract — there is still no `icon`
 * prop, and `color` is not a caller choice at either site, it is the `*OnLight` foreground the
 * severity already fixes.
 */
export function BannerIcon({ severity, color }: { severity: BannerSeverity; color: string }) {
  return (
    <svg
      aria-hidden="true"
      width={iconSize.sm}
      height={iconSize.sm}
      viewBox="0 0 24 24"
      fill="none"
      // Phone `:74` — the icon takes the FOREGROUND, never `colors[severity]`.
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {SEVERITY_ICON[severity]}
    </svg>
  )
}

export interface BannerProps {
  severity: BannerSeverity
  /** The callout copy. Single paragraph — a status line, not a layout slot (phone `:39`). */
  message: string
  /** Caller LAYOUT only (margins, alignment). Never a fill: the opacity rule above is the point. */
  style?: CSSProperties
  /** Rendered as `data-testid`, the demo's idiom for the phone's `testID`. */
  testId?: string
}

/** Phone `:85-93`. The scheme-dependent fill and border are composed per render, below. */
const banner: CSSProperties = {
  display: 'flex',
  // phone `:87` — `alignItems: 'flex-start'`, so a wrapped message keeps the icon on line one.
  alignItems: 'flex-start',
  // phone `:88` — `Layout.spacing.sm`.
  gap: spacing.sm,
  // phone `:90` — `Layout.borderRadius.md`. D13's NESTED tier, and the comment at `:89` says
  // why: "banners sit inside cards and form sections". A card is `lg` (12); this is not a card.
  borderRadius: radius.md,
  // phone `:91` — `borderWidth: 1`. LONGHANDS ONLY, and no colour: this fragment must survive
  // being spread. `reports/partner-lit-edge-ruling.md` §1 rules that a fragment carries no
  // border shorthand of any kind, and the colour arrives as the four `border*Color` longhands
  // in the composition below.
  borderWidth: 1,
  borderStyle: 'solid',
  // phone `:92` — `Layout.spacing.base`.
  padding: spacing.base,
}

/** Phone `:94-98`. `color` is the scheme-dependent foreground, applied per render. */
const messageStyle: CSSProperties = {
  flex: 1,
  // phone `:96` — `Typography.fontSize.sm`. On plan §4.9's ladder (12/14/16/18/20/24/30/36), so
  // a commented literal rather than an invented step; `tokens/scale.ts` carries no type scale
  // (U3.4 report R-6, deferral proposal D-4).
  fontSize: 14,
  // phone `:97` — `fontSize.sm * lineHeight.normal` = 14 x 1.5. RN takes a number of points; CSS
  // needs the unit, so the PRODUCT is spelled here rather than a unitless 1.5 multiplier, which
  // would silently re-derive from whatever `fontSize` a caller's `style` happened to set.
  lineHeight: '21px',
}

export function Banner({ severity, message, style, testId }: BannerProps) {
  // `colors` is `palette[scheme]`; the three reads are template-indexed so a renamed token is a
  // compile error rather than an `undefined` that paints transparent.
  const background = colors[`${severity}Light`]
  const foreground = colors[`${severity}OnLight`]

  return (
    <div
      data-testid={testId}
      role="alert"
      // Phone `:63` — the accessible name carries the severity, which the colour cannot.
      aria-label={`${severity}: ${message}`}
      // Phone `:66-68`. Explicit because `role="alert"` implies assertive; see the docblock.
      aria-live={severity === 'error' || severity === 'warning' ? 'assertive' : 'polite'}
      // The accent goes on the FOUR COLOUR LONGHANDS, never the `borderColor` shorthand —
      // `reports/partner-lit-edge-ruling.md` §1, measured in jsdom 29.1.1 and Chromium 148 with
      // react-dom 19.2.3 across three paints. `banner` carries no per-side colour today, so a
      // shorthand here would in fact survive; the ruled form is written anyway because (a) the
      // rule is "no shorthand after a spread", full stop, and the guard landing in W1 fails any
      // test that produces React's `conflicting property` warning, and (b) `...style` spreads
      // AFTER this, so the day a caller or this recipe grows a lit top edge, the shorthand form
      // is the one that is right on paint 1 and wrong on paint 2 — the trap with no test.
      style={{
        ...banner,
        backgroundColor: background,
        borderTopColor: colors[severity],
        borderRightColor: colors[severity],
        borderBottomColor: colors[severity],
        borderLeftColor: colors[severity],
        ...style,
      }}
    >
      {/* Phone `:76-77` — `accessibilityElementsHidden` + `importantForAccessibility="no"`:
          the message already carries the meaning, so the icon is decorative. */}
      <BannerIcon severity={severity} color={foreground} />
      <div style={{ ...messageStyle, color: foreground }}>{message}</div>
    </div>
  )
}
