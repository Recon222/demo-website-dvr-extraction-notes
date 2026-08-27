'use client'

import type { CSSProperties } from 'react'

import { generateDisambiguationWarning, type DateDisambiguationResult } from '@/features/demo/engine/logic/date-disambiguation'
import { Banner } from '@/features/demo/ui/controls/Banner'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'

const MONTHS_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** `YYYY-MM-DD` → `Mon D, YYYY` (phone `DateDisambiguationWarning.tsx:73-91`). */
function formatDateForDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${MONTHS_SHORT[parseInt(month, 10)]} ${parseInt(day, 10)}, ${year}`
}

export interface DateDisambiguationWarningProps {
  result: DateDisambiguationResult
}

/**
 * Inline warning for an MM/DD-vs-DD/MM ambiguous OCR date — the demo's port of the phone's
 * `src/features/ocr-time-capture/components/DateDisambiguationWarning.tsx` (spec: ui-mapping
 * 06 "Surface: DateDisambiguationWarning"). Same copy, same early return on `'high'` confidence
 * — a confident resolution is not something to interrupt the operator over.
 *
 * ## A71 / U3.3 — the callout is now `<Banner severity="warning">`, and so is the phone's
 *
 * The phone DELETED its bespoke callout here rather than restyling it, and its docblock
 * (`:19-28`) is the whole rationale, verbatim:
 *
 *   *"It used to be a one-off: a solid Card with a doubled 2px border, a 4px left accent bar
 *   found nowhere else in the app, a bare `!` Text glyph for a badge (a screen reader announced
 *   the exclamation mark), and a heading painted `colors.warning`, which measures 2.15:1 on the
 *   light card. Banner carries the icon, the role, the live region and the measured `*OnLight`
 *   foreground (ruling D8a). Banner is a status line rather than a layout slot (the ExportHub
 *   precedent), so the prose folds into its `message` and the two dated interpretations sit
 *   beneath it, where they stay independently readable by a screen reader."*
 *
 * The demo's version had all five of those defects, ported faithfully: 2px border, `borderLeftWidth
 * 4`, the bare `!` in a 28px ring, the 16/600 heading in `#ffd93d` (= `colors.warning`, §C.3
 * rule 1's ban on the saturated accent as text), and a translucent `rgba(255,217,61,0.06)` fill
 * that made the ratio unmeasurable. All gone with the callout.
 *
 * **The three strings are folded, NOT rewritten** — `` `${title}. ${description} ${suggestion}` ``
 * is the phone's own expression at `:47`, character for character, and
 * `generateDisambiguationWarning` still returns all three unchanged.
 *
 * The two dated interpretations below take the phone's `:98-114` values, which the demo had
 * approximated (11/13px and `textTertiary` labels against the phone's 12/14 and `textSecondary`).
 * They are the same block in the same file and move with the callout rather than waiting for a
 * package that does not open this file.
 */
export function DateDisambiguationWarning({ result }: DateDisambiguationWarningProps) {
  if (result.confidence === 'high') return null

  const warning = generateDisambiguationWarning(result)

  return (
    <div style={container} data-testid="date-disambiguation-warning">
      {/* phone `:45-48`. `role="alert"`, the icon, the live region and the AA foreground all
          come from Banner now; this component contributes none of them. */}
      <Banner severity="warning" message={`${warning.title}. ${warning.description} ${warning.suggestion}`} />

      <div style={detailsRow}>
        <div style={detailColumn}>
          <div style={detailLabel}>Chosen Interpretation:</div>
          <div style={{ ...detailValue, color: colors.text }}>
            {formatDateForDisplay(result.chosenDate)} ({result.chosenFormat})
          </div>
        </div>
        <div style={detailColumn}>
          <div style={detailLabel}>Alternative:</div>
          {/* phone `:61` — the alternative is deliberately the QUIETER of the two; the chosen
              one took `colors.text` above. */}
          <div style={{ ...detailValue, color: colors.textSecondary }}>{formatDateForDisplay(result.alternativeDate)}</div>
        </div>
      </div>
    </div>
  )
}

/** phone `:94-97` — `gap: Layout.spacing.sm`, `marginBottom: Layout.spacing.md`. */
const container: CSSProperties = { display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.md }

/** phone `:98-103`. */
const detailsRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: spacing.md,
  padding: `0 ${spacing.xs}px`,
}

/** phone `:104-106`. */
const detailColumn: CSSProperties = { flex: 1 }

/** phone `:107-110` + `:52` — `Typography.fontSize.xs`, `Layout.spacing.xxs`, `textSecondary`. */
const detailLabel: CSSProperties = { fontSize: 12, marginBottom: spacing.xxs, color: colors.textSecondary }

/** phone `:111-114` — `Typography.fontSize.sm`, `fontWeight.medium`. Colour is per column. */
const detailValue: CSSProperties = { fontSize: 14, fontWeight: 500 }
