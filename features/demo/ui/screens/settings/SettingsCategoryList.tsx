'use client'

import { useState, type CSSProperties } from 'react'
import type { SettingsCategoryId } from '@/features/demo/engine/content/settings-catalog'
import { DEMO_VERSION_LINE } from '@/features/demo/engine/content/app-info'
import { glassCard } from '@/features/demo/ui/glass-tokens'
import { SettingsIcon } from '@/features/demo/ui/screens/settings/settings-icons'
import type { SettingsRowView, SettingsSectionView } from '@/features/demo/ui/screens/settings/settingsData'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget, withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * The Settings master pane: grouped inset glass cards of tappable rows, iOS-Settings style
 * (phone `SettingsCategoryList.tsx` + `SettingsCategoryRow.tsx`).
 *
 * Presentational — selection is delegated upward. Rows are real `<button>`s rather than
 * `role="button"` divs so keyboard and AT reach them for free, which is also what makes the
 * back-focus restore in `SettingsModal` possible (it re-focuses by `data-settings-row`).
 *
 * Footer: the phone renders `"{appName} · v{version}"` (`SettingsCategoryList.tsx:74`). The
 * demo renders its own version line — the same chrome, labelled for what the visitor is
 * actually looking at (P4.2's precedent, shared through `app-info.ts`).
 */

/**
 * A79 — phone `SettingsCategoryList.tsx:84-91`. `Typography.fontSize.xs` (12) in
 * `colors.textSecondary`; the demo's 11.5 was below even the phone's PRE-campaign 12.5, and its
 * `#7a9fc4` was one step darker than the phone's tone. The rest (600 / uppercase /
 * `letterSpacing 0.6` / `paddingHorizontal xs` + `paddingBottom sm`) already matched.
 */
const sectionLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: colors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  padding: `0 ${spacing.xs}px ${spacing.sm}px`,
}

/**
 * A78 — the canonical settings LIST-ROW (phone `SettingsCategoryRow.tsx:82-89`):
 * `gap: Layout.spacing.md` (16, was 14) · `paddingHorizontal: Layout.spacing.md` (16, was 14) ·
 * `minHeight: 56` (already `Layout.touchTarget.large`).
 */
const rowBase: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  width: '100%',
  minHeight: touchTarget.large,
  padding: `0 ${spacing.md}px`,
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
}

/**
 * DERIVED ARITHMETIC, not a constant — phone `SettingsCategoryRow.tsx:79`, comment and all:
 * *"chip (36) + gap (16) + row padding aligns the divider under the title"*. It was 64 while the
 * gap was 14 and moves with it; A78 says so explicitly. Change the chip size or the gap and this
 * follows, or the hairline stops landing under the first letter of the title.
 */
const SEPARATOR_INSET = 58

/**
 * The pressed wash, phone `SettingsCategoryRow.tsx:47` — `withAlpha(colors.link, 0.06)` in dark
 * (its comment records that the two literals it replaced were exactly `Colors.dark.link` and
 * `Colors.light.primary` at 0.06, and that the fork stays because the wash has to LIFT off navy
 * and DARKEN off white; only the dark arm exists here).
 *
 * The demo has to hold this in React state. `Pressable` gives the phone the flag for free;
 * on the web the equivalent is `:active`, which needs a stylesheet — and `features/demo/**`
 * styles with `CSSProperties`, `ui/demo.css` is frozen (plan §4.2 / D9), and a value moved into
 * a class un-pins its own test because jsdom renders no CSS. So the state is the pinnable form,
 * which is why it is here rather than in a rule.
 */
const PRESSED_BG = withAlpha(colors.link, 0.06)

export interface SettingsCategoryListProps {
  sections: readonly SettingsSectionView[]
  onSelect(id: SettingsCategoryId): void
}

export function SettingsCategoryList({ sections, onSelect }: SettingsCategoryListProps) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        // Phone `styles.content` (`:77-80`) — `padding: spacing.md` with
        // `paddingBottom: spacing.xxl`. The demo carried the first and not the second, so the
        // footer version line sat hard against the bottom of the sheet.
        //
        // Spelled as four LONGHANDS rather than `padding` + `paddingBottom`. React warns on a
        // shorthand sharing an object with one of its own longhands ("conflicting property"),
        // and `vitest.setup.ts` makes that warning a repo-wide test failure — the same class of
        // trap the lit-edge ruling closes for borders.
        paddingTop: spacing.md,
        paddingRight: spacing.md,
        paddingBottom: spacing.xxl,
        paddingLeft: spacing.md,
      }}
    >
      {sections.map((section) => (
        // Phone `styles.section` (`:81-83`) — `marginBottom: spacing.lg`, was 20.
        <div key={section.id} style={{ marginBottom: spacing.lg }}>
          <div style={sectionLabel}>{section.label}</div>
          {/* A79's card: `glassCard` already carries the phone's radius `lg` (12, was 16),
              `Layout.shadow.card` and the 1px lit top edge — U1.2 landed all three. `padding`
              is deliberately absent from the fragment, which is exactly the phone's
              `card: { padding: 0 }` (`:92-94`): the rows are edge-to-edge, each painting its
              own pressed background across the full width. */}
          <div style={{ ...glassCard, overflow: 'hidden' }}>
            {section.items.map((row, index) => (
              <CategoryRow
                key={row.id}
                row={row}
                isLast={index === section.items.length - 1}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
      {/* Phone `styles.footer` (`:95-99`) — `fontSize.xs` in `colors.textTertiary`,
          `paddingTop: spacing.xs`. `#46607e` was on no ramp in the palette at all. */}
      <div
        style={{ textAlign: 'center', fontSize: 12, color: colors.textTertiary, paddingTop: spacing.xs }}
      >
        {DEMO_VERSION_LINE}
      </div>
    </div>
  )
}

function CategoryRow({
  row,
  isLast,
  onSelect,
}: {
  row: SettingsRowView
  isLast: boolean
  onSelect(id: SettingsCategoryId): void
}) {
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)
  return (
    <button
      type="button"
      onClick={() => onSelect(row.id)}
      // `Pressable`'s `pressed` flag, hand-held. `pointercancel` and `pointerleave` both
      // release it: a press dragged off the row, or interrupted by a scroll gesture taking
      // over the pointer, otherwise leaves the wash painted with nothing to clear it.
      onPointerDown={() => setPressed(true)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      // Phone-verbatim accessible name: `"{title} settings"` (`SettingsCategoryRow.tsx:60`).
      // Its `accessibilityHint` ("Opens this settings category") has no ported equivalent —
      // `aria-description` is ARIA 1.3 and effectively unimplemented, and the alternative
      // (`aria-describedby` at a visually-hidden node) would add DOM for a sentence a
      // chevroned row in a settings list already conveys. Deliberate omission, not a miss.
      aria-label={`${row.title} settings`}
      data-testid={`settings-row-${row.id}`}
      data-settings-row={row.id}
      style={pressed ? { ...rowBase, background: PRESSED_BG } : rowBase}
    >
      <span
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          // `Layout.borderRadius.control` (phone `:93`), was a bare 9 — the value the phone's
          // own audit flagged as "between md(8) and lg(12)" before the campaign named it.
          borderRadius: radius.control,
          // Phone `:40-41` — fill `primary@0.18` in dark, border `primary@0.22`. The demo had
          // 0.16 and `GLASS.borderAccent` (the ELEVATED tier's 0.25), i.e. a chip whose border
          // moved with a surface tier it is not part of.
          borderStyle: 'solid',
          // The phone spells `StyleSheet.hairlineWidth`; the web's honest equivalent is 1px,
          // which is what every other border in this feature already paints.
          borderWidth: 1,
          borderColor: withAlpha(colors.primary, 0.22),
          background: withAlpha(colors.primary, 0.18),
          color: colors.primary,
        }}
      >
        {/* `SettingsIcon` already defaults to the phone's `size={19}` (`:59`). */}
        <SettingsIcon id={row.icon} />
      </span>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          // `Typography.fontSize.base` / `fontWeight.medium` (phone `:98-103`), was 15.
          fontSize: 16,
          fontWeight: 500,
          color: colors.text,
          letterSpacing: 0.1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.title}
      </span>

      <span style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, maxWidth: '52%' }}>
        {row.preview && (
          <span
            data-testid={`settings-preview-${row.id}`}
            style={{
              // `Typography.fontSize.sm` (phone `:110-113`), was 13.
              fontSize: 14,
              // Phone `:112`, kept for key-for-key parity and NOT pinned: `flex-shrink: 1` is
              // the CSS INITIAL value, so it is a no-op here. RN defaults `flexShrink` to 0,
              // which is the only reason the phone has to spell it. A probe deleting this line
              // SURVIVED, correctly; the truncation trio below is what actually holds the
              // padlock and chevron in the row, and that is what the test asserts.
              flexShrink: 1,
              color: colors.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.preview}
          </span>
        )}
        {row.requiresAuth && (
          /* The phone's padlock (`SettingsCategoryRow.tsx:69`, size 13, `textTertiary`,
             `marginRight: -2`). It states a fact about the row ON THE DEVICE; the demo never
             fakes the prompt behind it — the pane explains. */
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-testid={`settings-lock-${row.id}`} style={{ marginRight: -2 }}>
            <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
            <path d="M8.5 10.5V8a3.5 3.5 0 1 1 7 0v2.5" />
          </svg>
        )}
        {/* Phone `:71` — `chevron-forward`, size 17, `textTertiary`. */}
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>

      {!isLast && (
        <span
          aria-hidden="true"
          style={{ position: 'absolute', left: SEPARATOR_INSET, right: 0, bottom: 0, height: 1, background: colors.border }}
        />
      )}
    </button>
  )
}
