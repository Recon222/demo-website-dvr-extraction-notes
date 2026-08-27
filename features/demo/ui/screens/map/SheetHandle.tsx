'use client'

import type { CSSProperties } from 'react'
import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import { STATUS_LABEL, SHEET_COLORS, type StatusCounts } from '@/features/demo/ui/screens/map/mapTokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'
import { severityTone, STATUS_SEVERITY, type SeverityTone } from '@/features/demo/ui/tokens/status'

export interface SheetHandleProps {
  contentMode: 'list' | 'detail'
  locationCount: number
  statusCounts: StatusCounts
}

const STATUSES: LocationMapStatus[] = ['started', 'working', 'complete']

/**
 * The 2px accent rule under the sheet's top edge — phone `SheetHandle.tsx:53-63` + `:136-139`.
 * Three stops, `primary` at `0 / 0.45 / 0`, swept horizontally (RN `start {x:0}` -> `end {x:1}`
 * is CSS `90deg`).
 *
 * NOT `controls/sheet-chrome.ts`'s `sheetAccentStrip`: that one ports `GlassAccentStrip.tsx`,
 * which is a FIVE-stop ramp peaking at 0.5 with 0.4 shoulders. Same idea, different component,
 * different numbers — sharing it would ship a value the phone's map sheet does not.
 */
const accentStrip: CSSProperties = {
  height: 2,
  flexShrink: 0,
  background: `linear-gradient(90deg,${withAlpha(colors.primary, 0)},${withAlpha(colors.primary, 0.45)},${withAlpha(colors.primary, 0)})`,
}
// phone `styles.pillRow` `:140-144` — `paddingTop: sm`, `paddingBottom: xs`. Was `pt 8 / pb 10`.
const pillRow: CSSProperties = { display: 'flex', justifyContent: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs }
// phone `styles.pill` `:145-149` — 40x4 at `radius.full`. Was 38x4 at radius 2; the phone's own
// docblock at `:15-17` records that pairing as the drift it repaired against `GlassBottomSheet`.
const pill: CSSProperties = { width: 40, height: 4, borderRadius: radius.full, background: SHEET_COLORS.handle }
// phone `styles.summarySection` / `styles.detailSection` `:150-154`, `:182-185` — `paddingHorizontal: lg`,
// `paddingBottom: sm`, and a `gap: xs` that replaces the badge row's old `marginTop: 5`.
const summary: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.xs,
  padding: `0 ${spacing.lg}px ${spacing.sm}px`,
}
// phone `styles.countText` / `styles.detailTitle` — `Typography.fontSize.lg` (18). Was 16.
const countText: CSSProperties = { fontSize: 18, fontWeight: 700, color: colors.text }
// `flexWrap` is the demo's, kept: the phone lays three badges across a 390-430pt screen and the
// demo's slot is 378px (demo inventory §0.3), where 12px labels can overflow. Wrapping is the
// smallest honest adaptation; every value below is the phone's.
const badgeRow: CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }

/**
 * A status count badge — phone `SheetHandle.tsx:99-114` + `styles.badge` `:164-181`, painted from
 * the D8(a) trio: the `*Light` tone fills, the saturated severity holds the (decorative) border,
 * and the `*OnLight` foreground carries BOTH the dot and the label.
 *
 * These read `MAP_PIN_COLORS` at `${color}1e` / `${color}55` before, which the phone records as
 * measuring 1.33:1 in light mode once the sheet started following the theme (`:93-95`).
 *
 * Border longhands, never the `border`/`borderColor` shorthands — the house rule from
 * `tokens/status.ts:164-168`: React writes only CHANGED keys on update, so a shorthand's erasure
 * survives the re-render that would otherwise repair it.
 */
const badge = (tone: SeverityTone): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: spacing.xs,
  padding: `${spacing.xxs}px ${spacing.xsm}px`,
  borderRadius: radius.md,
  borderStyle: 'solid',
  borderWidth: 1,
  borderColor: tone.borderColor,
  background: tone.background,
  fontSize: 12,
  fontWeight: 700,
  color: tone.color,
})
// phone `styles.badgeDot` `:173-177` — 5x5 at `radius.full`, on the FOREGROUND token (`:110`).
const dot = (tone: SeverityTone): CSSProperties => ({ width: 5, height: 5, borderRadius: radius.full, background: tone.color })

/** The peek-bar handle: accent strip + drag pill + a live summary (count + status badges in list
 *  mode; a title in detail mode). Presentational — the drag is owned by MapBottomSheet. */
export function SheetHandle({ contentMode, locationCount, statusCounts }: SheetHandleProps) {
  return (
    <div>
      <div data-testid="sheet-accent-strip" style={accentStrip} />
      <div style={pillRow}>
        <div data-testid="handle-pill" style={pill} />
      </div>
      {contentMode === 'list' ? (
        <div style={summary}>
          <div style={countText}>
            {locationCount} {locationCount === 1 ? 'Location' : 'Locations'}
          </div>
          <div style={badgeRow}>
            {STATUSES.map((s) => {
              if (statusCounts[s] === 0) return null
              const tone = severityTone(STATUS_SEVERITY[s])
              return (
                <span key={s} data-testid={`status-badge-${s}`} style={badge(tone)}>
                  <span data-testid={`status-badge-dot-${s}`} style={dot(tone)} />
                  <span>
                    {statusCounts[s]} {STATUS_LABEL[s]}
                  </span>
                </span>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={summary}>
          <div style={countText}>Location Details</div>
        </div>
      )}
    </div>
  )
}
