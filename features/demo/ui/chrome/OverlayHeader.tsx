'use client'

import type { CSSProperties, ReactNode } from 'react'

import { CAMERA_CHROME } from '@/features/demo/ui/screens/camera-chrome'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { iconSize, radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U7.2): the demo's ONE full-bleed overlay header. Matrix A61, D15's
 * OVERLAY-CONSOLIDATION half.
 *
 * ## THIS IS DEMO-ORIGINATED, and that word is load-bearing
 *
 * It is NOT a port of the phone's `src/components/layout/OverlayHeader.tsx` — that component
 * (PR #125) is an EXPERIMENTAL scroll-linked WRAPPER floating `MainHeader` over the four TAB
 * routes, **D15 defers it**, none of this file's four adopters is one of its consumers, and
 * neither U3.4 nor U7.2 ports it. A61 is explicit: the demo hand-rolls a full-bleed overlay
 * header FOUR times and the phone has no shared one to lift, because its own camera / recorder
 * / preview headers are per-surface too (phone-inventory §2.G).
 *
 * So this module is a consolidation of the demo's own four sites. Where the phone DOES paint an
 * equivalent control or label on the same surface, that value is lifted with its `file:line`
 * below; where it paints nothing, the demo's existing value is kept rather than invented.
 *
 * ## The four sites this replaces (before → after)
 *
 * | Surface | Leading control before | Title before |
 * |---|---|---|
 * | `AudioPreviewScreen` | 24px ✕, transparent, TRAILING | 20/700, left |
 * | `AudioRecorderScreen` | 40x40 r20 circle, old-navy fill | — (a mono badge, trailing) |
 * | `MediaCaptureScreen` | 48x48 r24 scrim circle, `✕` TEXT glyph | — |
 * | `OcrCaptureScreen` (confirm) | none at all | 20/700, left |
 *
 * ## Values, and where each comes from
 *
 * - **Leading control size is per VARIANT, not one number.** A61 says "the recorder's 40 and the
 *   camera's 48 both converge" at 44. They do not, and shrinking the camera's would be drift AWAY
 *   from the phone on a surface **D17 freezes**: `VisionCameraScreen.tsx:775-777` still ships
 *   `width/height: 48` at `dd5551ec`, while `RecorderScreen.tsx:280-282` ships
 *   `Layout.touchTarget.min` (44). Both are lifted: `glass` takes 44, `cameraScrim` takes 48.
 *   44 is a FLOOR (`touchTarget.min`), so neither variant is under it. See the U7.2 report, R-2.
 * - **Title `18/600`, `flex: 1`, LEFT.** A61's "centred 16/600" has no source. The phone paints
 *   both title-bearing surfaces through `FormLayout` → `Header`, whose title is
 *   `Header.tsx:198-201`: `flex: 1` · `Typography.fontSize.lg` (18) · `fontWeight.semibold`
 *   (600) · `colors.text` (`:88`), left-aligned, after the leading control. 18 and 600 are both
 *   on plan §4.9's ladder. (`FormLayout.tsx:127` is the recorder flow's own call:
 *   `title="Review Audio" showExit onExit={onCancel}`.) See the report, R-1.
 * - **The leading control comes FIRST**, before the title — `Header.tsx:67-88` renders
 *   back/exit, then title, then menu. `AudioPreviewScreen`'s ✕ moves from trailing to leading
 *   for that reason.
 * - **`glass` fill/border**: `RecorderScreen.tsx:78-79`, verbatim — *"The close pill is a flat
 *   surface, so it takes the glass card's top gradient stop rather than painting a second
 *   gradient for one 44pt circle"* — `{ backgroundColor: glassStyle.gradient[0], borderColor:
 *   glassStyle.border }` over `GlassColors[scheme].card`. Read through `GLASS_TIER[scheme]`,
 *   never a half by name (plan §9 clause 12; `glass-tokens.test.ts` exempts no file).
 * - **`cameraScrim` fill**: `CAMERA_CHROME.controlScrim`, the camera's own black — **D17 freezes
 *   the camera palette** and `VisionCameraScreen.tsx:779` still paints exactly it.
 * - **Icon**: 20 in `colors.textSecondary` for `glass` (`RecorderScreen.tsx:293`), 28 in
 *   `CAMERA_CHROME.onCamera` for `cameraScrim` (`VisionCameraScreen.tsx:651`). One ✕ path for
 *   all four, replacing `MediaCaptureScreen`'s `✕` text glyph.
 *
 * ## NO PADDING, and no positioning
 *
 * A61's "absolute row at `top:44`, `padding:'0 16px'`" is the CAMERA's geometry generalised to
 * four surfaces, and it is wrong twice. (a) Three of the four sit IN FLOW inside a shell that
 * already pads 54px from the top and scrolls; making them absolute would slide their bodies
 * under them. The phone agrees — only `VisionCameraScreen` positions absolutely
 * (`:316-326`); `RecorderScreen`'s header and `Header` are both in flow. (b) `16` is the demo's
 * own camera literal; the phone spells `Layout.spacing.mdlg` (20) at BOTH counterparts
 * (`RecorderScreen.tsx:277`, `VisionCameraScreen.tsx:324`), which is also what the recorder's
 * body margins and the preview's shell padding already use.
 *
 * So placement is the CALLER'S, through `style` — the same contract and the same wording as
 * `controls/Banner.tsx`'s `style` prop. The four callers each pass their own inset; nothing here
 * invents one they would all have to override.
 */
export type OverlayHeaderVariant =
  /** Over an opaque app shell — recorder, audio preview, OCR confirm. */
  | 'glass'
  /** Over a live camera feed. D17 freezes this palette. */
  | 'cameraScrim'

/** Everything that does not depend on whether there is a leading control. */
interface OverlayHeaderBase {
  title?: string
  /** Trailing slot — the recorder's AUDIO CAPTURE badge today. */
  trailing?: ReactNode
  variant: OverlayHeaderVariant
  /** Caller LAYOUT only (placement, insets, margins). Never a fill. See the docblock. */
  style?: CSSProperties
}

/**
 * The leading control, as a DISCRIMINATED PAIR rather than two optionals (W3 r1 F74).
 *
 * `backLabel` was prose-required and type-optional, so `<OverlayHeader variant="glass"
 * onBack={fn} />` compiled and rendered an icon-only button with NO accessible name — a control
 * a screen reader announces as "button" and voice input cannot address at all. All four callers
 * pass it; the hole was latent on a brand-new shared seam, which is exactly when it is cheapest
 * to close.
 *
 * The shape is `SettingsNavBarProps`' own, this wave (`settings/SettingsNavBar.tsx:100-102`).
 * The `onBack?: undefined` arm is what makes the pair EXHAUSTIVE rather than merely additive:
 * without it, `{ onBack: fn }` alone still matches the no-control arm by width subtyping.
 *
 * NOT defaulted to "Close", and that is `ModalShell`'s reason verbatim from phone
 * `ModalHeader.tsx:32-38`: near-identical surfaces that all announce "Close" are
 * indistinguishable to a screen-reader user. Each caller keeps the words it already had.
 */
type OverlayHeaderControl =
  | { onBack(): void; backLabel: string }
  | { onBack?: undefined; backLabel?: undefined }

export type OverlayHeaderProps = OverlayHeaderBase & OverlayHeaderControl

const tier = GLASS_TIER[scheme]

/**
 * Per-variant leading-control paint and size. A record rather than two ternaries so a new
 * variant cannot be added while forgetting one of the four fields.
 */
export const CONTROL = {
  glass: {
    size: touchTarget.min, // RecorderScreen.tsx:281-282 — `Layout.touchTarget.min`
    background: tier.card.gradient[0], // RecorderScreen.tsx:79 — `glassStyle.gradient[0]`
    borderColor: tier.card.border, // RecorderScreen.tsx:79 — `glassStyle.border`
    icon: iconSize.sm, // RecorderScreen.tsx:293 — `size={20}`
    stroke: colors.textSecondary, // RecorderScreen.tsx:293
  },
  cameraScrim: {
    size: touchTarget.comfortable, // VisionCameraScreen.tsx:776-777 — 48, and D17 freezes it
    background: CAMERA_CHROME.controlScrim, // VisionCameraScreen.tsx:779
    borderColor: 'transparent', // the phone's camera control has no border
    icon: 28, // VisionCameraScreen.tsx:651 — `size={28}`; off §4.9's ladder, lifted not snapped
    stroke: CAMERA_CHROME.onCamera, // VisionCameraScreen.tsx:651 — `color="#FFFFFF"`
  },
  // W3 r1 F61 — Record-FORM rather than a `Record<>` annotation: `satisfies` keeps the literal
  // types (so a missing variant is still a compile error, which is what this table is for)
  // while `as const` makes it readonly. An annotation alone widens every value to `string`.
} as const satisfies Record<
  OverlayHeaderVariant,
  { size: number; background: string; borderColor: string; icon: number; stroke: string }
>

// W3 r1 F61 — module-level style tables ship readonly. Third recurrence of the F20/F38 class.
export const row = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.sm,
} as const satisfies CSSProperties

/** Phone `Header.tsx:198-201` + `:88`. */
export const titleText = {
  flex: 1,
  minWidth: 0,
  fontSize: 18,
  fontWeight: 600,
  color: colors.text,
} as const satisfies CSSProperties

export function OverlayHeader({ onBack, backLabel, title, trailing, variant, style }: OverlayHeaderProps) {
  const control = CONTROL[variant]
  return (
    <div style={{ ...row, ...style }}>
      {onBack !== undefined && (
        <button
          type="button"
          aria-label={backLabel}
          onClick={onBack}
          style={{
            width: control.size,
            height: control.size,
            // `Layout.borderRadius.full` on both phone sites; CSS clamps to a circle.
            borderRadius: radius.full,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: control.background,
            // Longhands, no `border` shorthand: the lit-edge ruling's shape, even though this
            // object spreads no fragment and so has no edge to erase.
            borderStyle: 'solid',
            borderWidth: 1,
            borderColor: control.borderColor,
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <svg
            width={control.icon}
            height={control.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke={control.stroke}
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      {title !== undefined && <div style={titleText}>{title}</div>}
      {trailing}
    </div>
  )
}
