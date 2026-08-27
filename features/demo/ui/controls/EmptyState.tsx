'use client'

import type { CSSProperties, ReactNode } from 'react'

import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U3.4): the SCREEN-LEVEL empty state. Matrix A80.
 *
 * Ported from the phone's `src/features/case-management/components/EmptyState.tsx:39-52`
 * (`main` @ `dd5551ec`), value for value:
 *
 *   container  paddingVertical: Layout.spacing.xxl (48), alignItems + justifyContent center
 *   message    fontSize: Typography.fontSize.lg (18), textAlign center,
 *              marginBottom: Layout.spacing.lg (24), color: colors.textSecondary
 *   button     minWidth: 200
 *
 * No icon, no illustration, no glass, no border, **and no italic** — the phone's component
 * carries none of them and A80's Demo action bans all five by name.
 *
 * ## WHAT THIS IS NOT, and the distinction is load-bearing
 *
 * This is the empty state for a surface whose WHOLE BODY is empty — a tab list, a wizard
 * section. It is NOT the treatment for an empty LINE inside a card that has other content.
 * The phone keeps those separate and they still carry `fontStyle: 'italic'` at `dd5551ec`:
 *
 *   `case-management/components/CaseCard.tsx:274-278`             16 / textSecondary / italic
 *   `case-management/components/DashboardCaseCard.tsx:333-337`    14 / textTertiary  / italic
 *   `case-management/export-hub/components/ExportCaseCard.tsx:340-346`
 *                                            14 / textTertiary / italic / centred / pv 16
 *
 * So "no italic" is a rule about THIS component, never a rule about the app. A blanket italic
 * sweep would restyle four in-card lines AWAY from the phone, plus eleven live-data sites that
 * were never empty states at all (captions, a business name, a warning, a status detail). The
 * keep-list is pinned in `__tests__/empty-state.test.tsx`.
 *
 * The phone uses its own component at exactly ONE site (`CaseList.tsx:194`), which is why the
 * 48pt block reads correctly there and would not inside a 40pt card row.
 *
 * ## `marginBottom` is unconditional, and that is the phone's
 *
 * `styles.message` carries `marginBottom: lg` whether or not a button follows, so a message
 * with no action leaves 24px of trailing space inside the 48px block. Lifted, not tidied
 * (plan §4.1 item 7, §4.2's "do not tidy the lifted pixel values"). No demo site passes an
 * action today; the slot exists because A80's recipe names it and U5's two empty states
 * (`LocationList`, `MapScreen`) are the likely first callers.
 */
export interface EmptyStateProps {
  /** The one line of copy. The phone defaults it; every demo caller has its own, so no default. */
  message: string
  /** Optional primary action, rendered in a `minWidth: 200` box beneath the message. */
  action?: ReactNode
}

const container: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  // phone `:41` — `paddingVertical: Layout.spacing.xxl`. Horizontal padding is the caller's.
  padding: `${spacing.xxl}px 0`,
}

const message: CSSProperties = {
  // phone `:46` — `Typography.fontSize.lg`. On plan §4.9's ladder (12/14/16/18/20/24/30/36),
  // so it is a literal rather than an invented step; `scale.ts` carries no type scale.
  fontSize: 18,
  textAlign: 'center',
  // phone `:48` — `Layout.spacing.lg`.
  marginBottom: spacing.lg,
  // phone `:29` — `colors.textSecondary`, applied inline over the stylesheet.
  color: colors.textSecondary,
}

/** phone `:51` — the action's own `minWidth`, not the container's. */
const actionBox: CSSProperties = { minWidth: 200 }

export function EmptyState({ message: text, action }: EmptyStateProps) {
  return (
    <div style={container}>
      <div style={message}>{text}</div>
      {action !== undefined && <div style={actionBox}>{action}</div>}
    </div>
  )
}
