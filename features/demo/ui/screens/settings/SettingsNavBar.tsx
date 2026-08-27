'use client'

import type { CSSProperties } from 'react'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * The Settings sheet's header, in the phone's two variants
 * (`src/features/settings/components/SettingsNavBar.tsx`):
 *
 * - `master` — gear + "Settings" + close (×)
 * - `detail` — back (‹ Settings) + the category title, absolutely centred so it ignores the
 *   asymmetric sides, plus a right spacer balancing the back button's width.
 *
 * The back label is the LITERAL string "Settings", never the previous screen's name — phone
 * parity (`SettingsNavBar.tsx:65`), and the reason a detail's back button reads the same
 * whichever row opened it.
 *
 * Opaque on purpose, exactly as the phone's is: list content scrolls under the bar, and a
 * translucent bar would let it bleed through (`SettingsNavBar.tsx:5-10`).
 *
 * ## The tier is ELEVATED, not header (matrix row 82 / A37, corrected)
 *
 * Phone `:43` reads `GlassColors[colorScheme ?? 'light'].elevated`. `GLASS.gradientPanel` and
 * `GLASS.borderAccent` are the two halves of that same tier (`glass-tokens.ts:152,168` derive
 * both from `GLASS_TIER[scheme].elevated`), so this bar was already on the right GRADIENT and
 * on the wrong BORDER — `GLASS.border` is the flat `colors.border`, not the tier's.
 *
 * ## And it was not actually opaque
 *
 * The phone paints `backgroundColor: colors.background` and lays the elevated gradient over it
 * as an absolute fill (`:46-56`). The demo painted the gradient ALONE — and the elevated stops
 * are `rgba(…, 0.88)` / `rgba(…, 0.95)`, so the list really did bleed through the bar it scrolls
 * under, which is the one thing this component's own docblock says must not happen. Fixed by
 * carrying the ground: `backgroundColor` + `backgroundImage`, two longhands, never the
 * `background` shorthand beside one of them (React's conflicting-property warning is a
 * repo-wide test failure).
 */

const barBase: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  // Phone `styles.row` (`:136-143`) — `minHeight: 52`, `paddingHorizontal: spacing.md`,
  // `paddingVertical: spacing.sm` (was 12).
  minHeight: 52,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${spacing.sm}px ${spacing.md}px`,
  borderBottom: GLASS.borderAccent,
  backgroundColor: colors.background,
  backgroundImage: GLASS.gradientPanel,
}

/**
 * The back affordance's tint — chevron AND label, one token so they cannot fork.
 *
 * **A DELIBERATE DIVERGENCE FROM THE PHONE, and it is prescribed twice.** Phone `:94-95` paints
 * both in `colors.primary`; matrix row 82's Delta and plan §5's U6.2 row both say
 * *"back label `#2B8CC1` as text -> `link` (A66/A27)"*. The demo follows the plan, and the
 * arithmetic is why:
 *
 *   - This bar's ground is `colors.background` under the elevated gradient, i.e.
 *     `rgb(20, 62, 107)` on the top stop and `rgb(13, 56, 100)` on the bottom.
 *   - `colors.primary` on the top stop measures **2.91:1**. At 18px/500 that is normal-size
 *     text under WCAG (large starts at 18.66px bold or 24px), so the floor is 4.5:1.
 *   - `colors.link` measures **7.10:1** on the same stop.
 *
 * The phone's OWN audit flagged this exact line — `docs/plans/ui-consistency/
 * 00-UI-CONSISTENCY-AUDIT.md:580`, *"`SettingsNavBar.tsx:100` … `colors.primary` as link text
 * on `colors.background`: 3.94:1 at 18px regular; drops to ~3.2:1 on a glass card"* — and
 * DEF-UI-018's closure swept `Button`, `RadioGroup` and four hand-rolled mirrors WITHOUT
 * reaching it. So this is not the demo inventing a rule: it is A27/A66's rule applied at a site
 * the phone identified and did not close. A side-by-side WILL show a paler blue here than the
 * phone's; that is the ported decision, not drift.
 */
const BACK_TINT = colors.link

const iconBtn: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  padding: 4,
  cursor: 'pointer',
}

/** Ionicons `settings-sharp` at the phone's `size={22}` in `colors.primary` (`:61`). */
function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06A2 2 0 1 1 4.44 17l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06A2 2 0 1 1 7 4.44l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06A2 2 0 1 1 19.56 7l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97z" />
    </svg>
  )
}

export type SettingsNavBarProps =
  | { variant: 'master'; onClose(): void }
  | { variant: 'detail'; title: string; titleId: string; onBack(): void }

export function SettingsNavBar(props: SettingsNavBarProps) {
  if (props.variant === 'master') {
    return (
      <div style={barBase}>
        {/* Phone `styles.titleGroup` (`:144-149`) — `gap: spacing.sm`, `flex: 1`. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 }}>
          <GearIcon />
          {/* `Typography.fontSize['2xl']` / bold (`:150-154`), was 22. */}
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.text, letterSpacing: 0.2 }}>Settings</div>
        </div>
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close settings"
          data-testid="settings-close-button"
          style={{
            ...iconBtn,
            width: 30,
            height: 30,
            // `Layout.borderRadius.full` (`:158`), was a hand-computed 15.
            borderRadius: radius.full,
            // Phone `:74` and its comment: "A neutral wash off the foreground, not the accent
            // — the literals this replaces were white-on-dark and black-on-light, and
            // `colors.text` is the token that flips the same way." The demo carried the
            // white-on-dark literal.
            background: withAlpha(colors.text, 0.06),
          }}
        >
          {/* Ionicons `close` at the phone's `size={20}` in `colors.textSecondary` (`:81`). */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div style={barBase}>
      <button
        type="button"
        onClick={props.onBack}
        aria-label="Back to settings"
        data-testid="settings-back-button"
        style={{ ...iconBtn, gap: 1, marginLeft: -6, padding: '4px 4px 4px 0', zIndex: 2 }}
      >
        {/* Ionicons `chevron-back` at the phone's `size={24}` (`:94`), was 22. */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BACK_TINT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {/* `Typography.fontSize.lg` / medium (`:169-172`), was 16. */}
        <span style={{ fontSize: 18, fontWeight: 500, color: BACK_TINT }}>Settings</span>
      </button>

      {/* Absolutely centred so the asymmetric sides never shift it (phone `centerTitle`). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* `Typography.fontSize.lg` / semibold (`:180-183`), was 16.

            The phone's `numberOfLines={1}` is NOT ported, deliberately: the catalog is closed
            at ten rows and its longest title ("Export Security") renders ~135px at 18/600 in a
            378px bar, so there is nothing to truncate. Adding the ellipsis trio here would need
            a `minWidth: 0` to work at all and would guard a case the id space cannot produce. */}
        <div id={props.titleId} role="heading" aria-level={2} style={{ fontSize: 18, fontWeight: 600, color: colors.text }}>
          {props.title}
        </div>
      </div>

      {/* Right spacer balancing the back button (phone `rightSpacer`, width 92 — unchanged at
          `dd5551ec:195`). The plan warns to retune it when the back label's type size moves;
          it does not need one, and the reason is structural rather than arithmetic: the centred
          title is `position: absolute; inset: 0` and centres on the WHOLE bar, so the spacer
          cannot pull it off centre in either direction. It reserves trailing space and nothing
          else — the same as on the phone, whose `centerTitle` is `absoluteFillObject`. */}
      <div style={{ width: 92 }} />
    </div>
  )
}
