'use client'

import type { Ref } from 'react'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'

/**
 * The web equivalent of the phone's swipe-to-reveal row action (`SwipeDeleteAction`, revealed
 * by `ReanimatedSwipeable` on a case card or a location row).
 *
 * ADAPTATION, not a gesture port (parity plan §5 P3.1: "web: pointer long-press + row action
 * buttons — match intent, not gesture"). A horizontal swipe on a pointer device is a scroll,
 * not a reveal; the intent the phone encodes is "a destructive row action must cost a
 * deliberate gesture and must not sit under a stray tap". That is preserved three ways:
 *  - a HOLD on the row reveals the tray (`useLongPress`, the phone's 500 ms beat), and the
 *    click that ends the hold is swallowed so the row's own action never fires;
 *  - the tray is also reachable by an always-visible, keyboard-focusable trigger. The phone
 *    needs a screen-reader-only `accessibilityActions` entry for the same reason
 *    (`SwipeableCaseCard.tsx:147`) precisely because its gesture is invisible; on the web the
 *    honest answer is a real control rather than a parallel a11y-only path;
 *  - the actions themselves are buttons, styled after the phone's revealed action (icon +
 *    "Delete", the error fill).
 *
 * The tray renders IN FLOW below its row rather than as an overlaid drawer — which is why the
 * phone's "scrolling the list closes the open swipeable" rule (`CaseList.tsx:86-93`) is
 * deliberately not ported: there is no overlay to strand, and nothing is hidden behind it.
 * Single-open IS ported — see `CasesScreen`.
 *
 * Presentational: props in, callbacks out.
 */

export interface RowAction {
  label: string
  onSelect(): void
  /** 'danger' takes the phone's error fill; anything else reads as a secondary button. */
  tone?: 'danger'
}

export function RowActionsTrigger({
  label,
  open,
  onToggle,
  triggerRef,
}: {
  /** Accessible name — callers scope it to the row ("Actions for case PR25-0098213"). */
  label: string
  open: boolean
  onToggle(): void
  /** The row's stable focus anchor. Unlike the tray's own buttons this control survives the
   *  tray closing, so it is where focus belongs when a destructive dialog hands back
   *  (review R-10). */
  triggerRef?: Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: open ? '#f0f4f8' : '#7a9fc4',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="12" cy="19" r="1.7" />
      </svg>
    </button>
  )
}

export function RowActionsTray({ actions, label }: { actions: readonly RowAction[]; label: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: 'flex', gap: 8, padding: '8px 12px 12px' }}
    >
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onSelect}
          style={{
            flex: 1,
            gap: 6,
            // A52/A67 and A65. The danger arm leaves the flat `error` fill for `DangerFill`
            // (3.34 -> 6.39 under white); the other arm was `{ ...glassBtnSecondary, border:
            // GLASS.borderBtn }` — one of the two live instances §4.3 names of a `border`
            // SHORTHAND written after a spread. It is gone rather than rewritten: the override
            // only re-asserted the border the fragment already carried, and the recipe emits
            // four side longhands so there is no shorthand left to lose to.
            ...buttonStyle({ variant: a.tone === 'danger' ? 'danger' : 'secondary', size: 'small' }),
          }}
        >
          {a.tone === 'danger' && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          )}
          {a.label}
        </button>
      ))}
    </div>
  )
}
