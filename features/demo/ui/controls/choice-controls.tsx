'use client'

import type { CSSProperties, ReactNode } from 'react'

import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget, withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U2.4): the demo's two selection controls — matrix A74 (`RadioGroup`) and A75
 * (`Checkbox`).
 *
 * Presentational components, not style functions, and that is the whole point. A radio's recipe
 * is not a style object: it is a ROW plus a RING plus a DOT plus a LABEL, four elements whose
 * colours move together. Exporting `radioRowStyle()` alone would have left every consumer
 * re-rendering the ring and the dot by hand, which is the duplication A74 exists to remove —
 * the demo had three hand-rolled radio groups and no two agreed on the ring. Same argument for
 * the checkbox's box-and-glyph.
 *
 * They share a file because they are one family (the phone keeps them one directory apart in
 * `components/common/`), because neither is large enough to earn its own module, and because a
 * single file is a single entry for the adoption scan below to name.
 *
 * ## What the components do NOT own
 *
 * The GROUP. `role="radiogroup"`, the option list, per-option test ids and the flex container
 * stay with each consumer, because the three consumers disagree about all four and none of the
 * disagreements are visual. Same for the checkbox: the pressable, its `role`, its
 * `aria-checked` and its accessible name are the consumer's — `CheckboxBox` paints the box.
 *
 * ## Invalid states
 *
 * `checked x disabled` is UNREPRESENTABLE rather than pinned: neither component takes a
 * `disabled` prop, because not one of the five call sites has a disabled option. The phone's
 * `RadioGroup` has one (`RadioGroup.tsx:112` greys the label to `textSecondary`) and its
 * `Checkbox` has two opacity states; when a demo surface needs either, that is the trigger to
 * add it — with D10's rule intact (opacity + `aria-disabled`, never a faded data label).
 * `checked x scheme` is closed by construction: every colour below resolves through
 * `colors.*`, which is `palette[scheme]`, so there is no dark literal to get a light half
 * wrong. `checked x error` does not exist for either control on either platform.
 */

/* -------------------------------------------------------------------------- radio ---- */

export interface RadioOptionProps {
  label: string
  selected: boolean
  onSelect(): void
  /**
   * `'row'` (the phone's default, `RadioGroup.tsx:36`) shares the width evenly between the
   * options; `'column'` stacks them full-width. RN gets the row case from `flex: 1` and the
   * column case from the default `stretch`; a `<button>` shrinks to its content instead, so
   * the column case has to say `width: '100%'` out loud.
   */
  direction?: 'row' | 'column'
  /** Per-option test id, so a settings pane can seed the phone's own. */
  testId?: string
}

/**
 * One radio option — phone `RadioGroup.tsx:52-117` + `:144-192`.
 *
 * THE WHOLE SELECTED TREATMENT IS `colors.link`: the row's border, the ring, the dot AND the
 * label (`:60-68`, `:97`, `:103`, `:111`). Not `colors.primary`. That is DEF-UI-018's third
 * instance and the phone records the measurements in-source: as the label `primary` measured
 * 3.46:1 against the tint this same branch paints, and as the ring and border — the only
 * visual carriers of the selected state — 2.81:1 against WCAG 1.4.11's 3:1. `link` clears both
 * at 6.86 dark (matrix §C.2, and `palette-contrast.test.ts` row 10 bounds it on every tier).
 *
 * The selected fill is `withAlpha(colors.primaryLight, 0.08)` (`:75`) — note the HUE: the demo
 * washed with `primary` (`rgba(43,140,193,0.08)`), the phone washes with `primaryLight`
 * (`rgba(75,163,212,0.08)`). `withAlpha` and not a `token + '15'` concat, for the reason the
 * phone's own comment gives at `:69-74`.
 *
 * `flexShrink: 1` on the label (`:175-191`) is load-bearing at three-up: with the ring, its
 * margin and the 16px side paddings, a 3-up group leaves ~39px of text budget at 360dp, and
 * without the shrink the label overflows under the neighbouring option's border.
 */
export function RadioOption({ label, selected, onSelect, direction = 'row', testId }: RadioOptionProps) {
  const edge = selected ? colors.link : colors.border
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={testId}
      onClick={onSelect}
      style={{
        ...(direction === 'row' ? { flex: 1 } : { width: '100%' }),
        display: 'flex',
        alignItems: 'center',
        padding: `${spacing.sm}px ${spacing.md}px`,
        minHeight: touchTarget.min,
        borderRadius: radius.md,
        border: `1px solid ${edge}`,
        background: selected ? withAlpha(colors.primaryLight, 0.08) : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        aria-hidden="true"
        data-radio-ring
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: radius.full,
          border: `2px solid ${edge}`,
          marginRight: spacing.sm,
        }}
      >
        {selected && (
          <span
            data-radio-dot
            style={{ width: 10, height: 10, borderRadius: radius.full, background: colors.link }}
          />
        )}
      </span>
      <span
        data-radio-label
        style={{
          fontSize: 16,
          fontWeight: 500,
          color: selected ? colors.link : colors.text,
          flexShrink: 1,
        }}
      >
        {label}
      </span>
    </button>
  )
}

/* ----------------------------------------------------------------------- checkbox ---- */

/** Exactly what `aria-checked` takes, so a consumer needs no second vocabulary for tri-state. */
export type CheckboxChecked = boolean | 'mixed'

/**
 * The glyphs are LITERAL CHARACTERS, not an SVG path — phone `Checkbox.tsx:75-85`.
 * `−` is U+2212 MINUS SIGN (not a hyphen) and `✓` is U+2713 CHECK MARK.
 */
const GLYPH: Record<'true' | 'false' | 'mixed', ReactNode> = {
  true: '✓',
  mixed: '−',
  false: null,
}

/**
 * The 24x24 box — phone `Checkbox.tsx:57-86` + `:109-128`.
 *
 * `indeterminate` reads as "partially on": a FILLED box with a dash, not an empty one
 * (`:36-37`, `filled = value || indeterminate`). The mark is `colors.onPrimary` and not a raw
 * white or the screen background (`:67-74`): it sits on the `colors.primary` fill, so the token
 * that names "foreground on a filled primary surface" is the one that belongs, and reading the
 * screen background and relying on it happening to contrast is the literal-by-another-name
 * pattern this campaign removes. In dark that moves the glyph 3.94 -> 3.73, both clear of WCAG
 * 1.4.11's 3:1 non-text floor, which is the applicable one for a 16px check mark.
 *
 * THE UNFILLED BOX IS OPAQUE (`colors.background`, `:62`), not transparent. That is a visible
 * change on the export card, where the box sits on a glass gradient; it is also what makes the
 * two states read as one control rather than as "a square" and "a hole".
 *
 * No `marginRight`. The phone's `:116` puts `spacing.sm` between the box and its LABEL, which
 * is a row concern — the demo's one consumer today has no label sibling, so a margin here would
 * be stray space. A consumer that grows one adds it before the box.
 */
export function CheckboxBox({ checked }: { checked: CheckboxChecked }) {
  const filled = checked === true || checked === 'mixed'
  const style: CSSProperties = {
    flex: '0 0 auto',
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: filled ? colors.primary : colors.border,
    background: filled ? colors.primary : colors.background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
    lineHeight: '16px',
    color: colors.onPrimary,
  }
  return (
    <span aria-hidden data-checkbox-box style={style}>
      {GLYPH[String(checked) as keyof typeof GLYPH]}
    </span>
  )
}
