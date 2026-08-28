'use client'

import { useLayoutEffect, useRef } from 'react'
import { pad2 } from '@/features/demo/engine/logic/datetime-parts'
import { glassWell } from '@/features/demo/ui/glass-tokens'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { flattenOver, radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'

const ROW = T.rowH // 44
const VISIBLE = 5 // visible rows (2 padding above + selected + 2 below)
const PAD = ((VISIBLE - 1) / 2) * ROW // 2 rows of padding so first/last can center

/**
 * The drum-curvature fade's outer stops (A39 / A59).
 *
 * The fade sits ON the well and ramps to the well's own colour at both edges, so its end stops
 * must be the well COMPOSITED onto the panel beneath it. The phone states the constraint in as
 * many words (`TimePicker.styles.ts:38-43`): the library ramps the container's fill to alpha 1
 * to fake the curvature, so *"the container's fill and the gradient's outer stops must be the
 * exact same colour or the fade ends on a visible seam."* Before U2.4 both were `T.raised` and
 * the constraint held trivially; the well is a translucent two-stop gradient, so it does not.
 *
 * `flattenOver`, NEVER `withAlpha(stop, 1)`. That is not flattening — it discards the alpha and
 * hands back the raw triple, which is exactly how the phone shipped this drum at `#060c16`,
 * 27.77 CIE76 dE from its own sheet, reading as a near-black slab (`with-alpha.ts:56-65`,
 * `TimePicker.styles.ts:45-51`).
 *
 * SEAM(U4.1): the ground is `T.raised` because that is what `PickerSheet.tsx:66` paints today.
 * The phone flattens over `GlassColors.sheet.gradient[0]` instead, so when U4.1 moves that
 * panel onto the `sheet` tier this ground moves with it — one edit, here, in the same package
 * as the panel. `ui/__tests__/glass-well-recipe.test.tsx` measures the well against this same
 * panel token, so a panel change that skips this line reds there.
 */
const WELL = GLASS_TIER[scheme].recessed
const FADE_TOP = flattenOver(WELL.gradient[0], T.raised)
const FADE_BOTTOM = flattenOver(WELL.gradient[1], T.raised)

/**
 * The per-column BARREL — the phone's `getGradientOverlayProps`
 * (`TimePicker.styles.ts:332-349`): 13 stops, pure vertical, painted INSIDE each column
 * (`DurationScroll.js:391-400`) and not across the drum.
 *
 * Per-column placement IS the finding (DP-6). The demo painted ONE fade spanning all three
 * columns and both 6px gutters, which reads as a single slab; three separate barrels — with the
 * well's own gradient still showing between them — is what makes it read as three cylinders.
 *
 * The ALPHAS are the phone's exactly. The COLOUR deliberately is not: the phone ramps to a flat
 * `#001e3f` because its RN library takes a single colour string, and its own comment
 * (`TimePicker.styles.ts:36-43`) says the container fill and the gradient's outer stops must be
 * the same colour or the fade ends on a seam. CSS has no such constraint, so each end ramps to
 * the WELL's own local colour instead — the phone's intent rather than its workaround.
 *
 * This also retires a live defect: the fade this replaces ramped through `rgba(15,32,53,0)` —
 * the retired raised navy in its rgb spelling, a fourth navy on no token in this palette and one
 * the phone deleted. Every stop below is derived from the well instead. (The hex form is not
 * written here on purpose: `palette.test.ts`'s RETIRED sweep matches raw text, comments
 * included, and it correctly flagged this docblock when it did spell it.)
 */
const BARREL_STOPS: ReadonlyArray<readonly [pct: number, alpha: number]> = [
  [0, 1],
  [8, 0.96],
  [18, 0.82],
  [24, 0.65],
  [34, 0.28],
  [40, 0.1],
  [50, 0],
  [60, 0.1],
  [66, 0.28],
  [76, 0.65],
  [82, 0.82],
  [92, 0.96],
  [100, 1],
]

const barrelGradient = `linear-gradient(180deg,${BARREL_STOPS.map(
  ([pct, alpha]) => `${withAlpha(pct <= 50 ? FADE_TOP : FADE_BOTTOM, alpha)} ${pct}%`,
).join(',')})`

/**
 * The column's right edge — phone `TimePicker.styles.ts:266-275`, `borderRightWidth: 1` in
 * `rgba(43,140,193,0.12)`. The phone puts it on every ITEM, so 45 stacked borders add up to one
 * continuous line down the column; one border on the column is the same line in one node.
 *
 * NOT `T.primaryEdge` — that is 0.25 and belongs to the band this replaces. `colors.primary` is
 * `#2B8CC1` = rgb(43,140,193), so the phone's literal is this token at 0.12.
 */
const COLUMN_EDGE = withAlpha(colors.primary, 0.12)

/** Round scrollTop to the nearest row index, clamped to [0, count-1]. Pure (jsdom-testable). */
export function indexFromScrollTop(scrollTop: number, rowH: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.round(scrollTop / rowH)))
}

interface ColumnProps {
  count: number
  value: number
  onChange(v: number): void
  dataCol: string
  label: string
}

function WheelColumn({ count, value, onChange, dataCol, label }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef(-1)

  // Reflect the controlled value as the scroll position — but skip when the change came
  // from our own scroll (lastEmitted === value), so we never fight an in-progress scroll.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (value !== lastEmitted.current) {
      el.scrollTop = value * ROW
      lastEmitted.current = value
    }
  }, [value])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const idx = indexFromScrollTop(el.scrollTop, ROW, count)
    if (idx !== value) {
      lastEmitted.current = idx
      onChange(idx)
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        // Phone `:266-275` — the column's right edge. Longhands, never the `borderRight`
        // shorthand: jsdom does not decompose one into the side a pin needs (HANDOFF §4).
        borderRightWidth: 1,
        borderRightStyle: 'solid',
        borderRightColor: COLUMN_EDGE,
      }}
    >
      <div
        ref={ref}
        data-wheel-col={dataCol}
        onScroll={onScroll}
        style={{
          height: VISIBLE * ROW,
          width: 64,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          paddingTop: PAD,
          paddingBottom: PAD,
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            style={{
              height: ROW,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 1,
              fontVariantNumeric: 'tabular-nums',
              // ONE colour for every row (`TimePicker.styles.ts:163-168`). The demo's selected
              // row used `#e8f0f8`, which is the same hand-mixed near-miss of `colors.text`
              // (`#f0f4f8`) the phone deleted — "two points of blue apart and reachable through
              // the theme". The selection is carried by the barrel, never by a second text
              // colour, and the phone's per-item ramp is likewise fully static
              // (`PickerItem.js:30-42` — no `renderItem` override, nothing computed).
              color: T.text,
              // Phone `:266-275`: EVERY row carries the wash, not just the middle one. The
              // selection band is emergent — no element paints it — because the barrel above
              // goes clear across roughly one row (its 0.40-0.60 stops) and veils the rest.
              // `T.primarySoft` is already `rgba(43,140,193,0.08)`, the phone's value exactly.
              background: T.primarySoft,
              // Phone `:173-177` — the etched read the flat numbers lacked entirely.
              textShadow: '0 1.5px 3px rgba(0, 0, 0, 0.6)',
            }}
          >
            {pad2(i)}
          </div>
        ))}
      </div>
      {/* The barrel, over the scroller and under the label. `pointer-events: none` so the column
          still scrolls through it — phone `DurationScroll.js:396-400` takes the non-masked
          branch (no `MaskedView` is ever passed) and paints the gradient OVER the content. */}
      <div aria-hidden="true" data-wheel-barrel={dataCol} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: barrelGradient }} />
      {/* Engraved column label (h / m / s) — `TimePicker.styles.ts:187-207`.
          The pill is what makes it read as an engraved marker rather than floating text, and
          the flat token is what makes it legible: the demo's `rgba(153,186,221,0.5)` is
          `textSecondary` alpha-dimmed, which measured 3.08:1 on this drum. Flat, on the
          `colors.background` pill, it measures 8.41 (matrix §C.2, A39/A59). */}
      <span
        style={{
          position: 'absolute',
          right: 2,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.8,
          color: T.textMute,
          background: withAlpha(colors.background, 0.6),
          padding: `${spacing.xxs}px ${spacing.xs}px`,
          borderRadius: radius.sm,
          pointerEvents: 'none',
        }}
      >
        {label}
      </span>
    </div>
  )
}

export interface TimeWheelProps {
  value: { h: number; mi: number; s: number }
  onChange(next: { h: number; mi: number; s: number }): void
}

/** HH:MM:SS drum: three scroll-snap columns with a center selection band + edge fade. */
export function TimeWheel({ value, onChange }: TimeWheelProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        // `gap: 6` is `spacing.xsm` and `padding: '0 10px'` is the phone's
        // `paddingHorizontal: 10` — both already byte-exact (`TimePicker.styles.ts:233-234`),
        // left as the lifted literals they are (demo §0.4).
        gap: 6,
        padding: '0 10px',
        // A39/A59 — the well. Spread LAST so nothing before it can win, and nothing is written
        // after it except `overflow`, which the fragment deliberately does not own.
        ...glassWell,
        overflow: 'hidden',
      }}
    >
      {/* Both drum-wide overlays are GONE (DP-6). The centre band and the curvature fade each
          spanned all three columns and both gutters, which is what made the drum read as one
          slab; the phone has neither element. Its band is emergent (every row washed, the barrel
          clear across the middle one) and its fade is per-column. `WheelColumn` owns both now. */}
      <WheelColumn count={24} value={value.h} onChange={(h) => onChange({ ...value, h })} dataCol="h" label="h" />
      <WheelColumn count={60} value={value.mi} onChange={(mi) => onChange({ ...value, mi })} dataCol="mi" label="m" />
      <WheelColumn count={60} value={value.s} onChange={(s) => onChange({ ...value, s })} dataCol="s" label="s" />
    </div>
  )
}
