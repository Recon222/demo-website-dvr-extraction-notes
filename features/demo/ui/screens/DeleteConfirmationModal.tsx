'use client'

import { useId } from 'react'
import type { CSSProperties } from 'react'
import { CentredDialog } from '@/features/demo/ui/controls/CentredDialog'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'

/**
 * The phone's `DeleteConfirmationModal` (ui-mapping 11 § DeleteConfirmationModal;
 * `src/features/case-management/components/DeleteConfirmationModal.tsx`) — a two-arm
 * discriminated union over `type`, rendered as a centred transparent-overlay card rather
 * than one of this feature's bottom-sheet `ModalShell` modals, exactly as on the phone
 * (`<Modal transparent animationType="fade">` + a `Card`, NOT a pageSheet).
 *
 * SEAM(U4.3): the panel, the scrim, the z pair, Escape and the focus hand-back are
 * `CentredDialog`'s. This file keeps only what is this dialog's own.
 *
 * WHY NOT `AlertDialog` (the demo's blocking-ALERT primitive, P2.4). It was considered first
 * and it does not fit this surface's shape — which is why U4.3 extracted the shared SHELL from
 * both rather than folding one into the other:
 *  - `AlertDialog`'s body is ONE string. This dialog's content is structured — a 48px trash
 *    glyph, `Label:` / `value` detail rows, a warning-coloured lead-in, and an italic
 *    error-coloured warning line — and the case arm additionally needs a SCROLLABLE
 *    `maxHeight: 150` bullet list of the locations that will go with the case. Flattened into
 *    a `\n`-joined string, a case with twenty locations pushes its own buttons off the screen;
 *    that cap is a real requirement, not decoration.
 *  - The scrims disagree, deliberately, and the shell PRESERVES that difference rather than
 *    unifying it. `AlertDialog` mirrors an OS alert, whose scrim does NOT dismiss (a decision
 *    the phone forces), so it passes `dismissOnScrim={false}`. This modal's scrim DOES
 *    dismiss — the phone's `handleOverlayPress` (`DeleteConfirmationModal.tsx:43-47`,
 *    ui-mapping 11 § Conditional Behavior) — because cancelling a delete by tapping away is
 *    the safe direction. So it passes `dismissOnScrim`.
 *
 * NOT PORTED — `isDeleting`. On the phone, delete is an async SQLite + filesystem operation,
 * so the component carries a pending flag (disabled buttons, spinner, backdrop no-op) and
 * `cases.tsx` adds a synchronous double-submit ref guard. The demo's delete is one
 * synchronous store write; there is no in-flight window to guard, and a permanently-false
 * `isDeleting` prop would be dead weight pretending otherwise. See deferred.md §48.
 *
 * Presentational: props in, callbacks out. Nothing here touches the store.
 */

/** What is about to be deleted. Two arms — the phone's `type` discriminator. */
export type DeleteTarget =
  | {
      type: 'case'
      caseNumber: string
      /** Every location that will cascade away with the case, in list order. */
      locationNames: readonly string[]
    }
  | {
      type: 'location'
      locationName: string
      /** Composed street + city; the row is omitted entirely when empty (phone parity). */
      address: string
    }

export interface DeleteConfirmationModalProps {
  target: DeleteTarget
  onConfirm(): void
  onCancel(): void
}

const detailLabel: CSSProperties = { fontSize: 12, fontWeight: 600, color: '#7a9fc4' }
const detailValue: CSSProperties = { fontSize: 14.5, color: '#f0f4f8', marginTop: 2 }

/** Phone `colors.error` / `colors.warning` (dark theme, `src/constants/Colors.ts:98,102`). */
const ERROR = '#ff4757'
const WARNING = '#ffd93d'

/** Scrim z; the panel paints on 61. D14 — this package does not renumber. */
const DELETE_MODAL_Z = 60

export function DeleteConfirmationModal({ target, onConfirm, onCancel }: DeleteConfirmationModalProps) {
  const uid = useId()
  const titleId = `${uid}-title`
  const isCase = target.type === 'case'

  return (
    <CentredDialog
      z={DELETE_MODAL_Z}
      labelledBy={titleId}
      onDismiss={onCancel}
      dismissOnScrim
      dismissOnEscape
      testId="delete-modal-content"
      scrimTestId="delete-modal-overlay"
    >
        {/* Variation B (location) opens with the trash glyph; Variation A (case) has none. */}
        {!isCase && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={ERROR} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </div>
        )}

        <div id={titleId} style={{ fontSize: 19, fontWeight: 700, color: '#f0f4f8', textAlign: 'center', marginBottom: 14 }}>
          {isCase ? 'Delete Case?' : 'Delete Location?'}
        </div>

        <div style={{ marginBottom: 18 }}>
          {isCase ? (
            <>
              <div style={{ marginBottom: 8 }}>
                <div style={detailLabel}>Case:</div>
                <div style={detailValue}>{target.caseNumber}</div>
              </div>
              {target.locationNames.length > 0 && (
                <>
                  <div style={{ ...detailLabel, color: WARNING, marginTop: 14, marginBottom: 8 }}>
                    WARNING: This will also delete these locations:
                  </div>
                  {/* maxHeight 150 + internal scroll — the phone's cap, so a twenty-location
                      case can't push the buttons out of the dialog. */}
                  <div
                    data-testid="location-list-scroll"
                    style={{ maxHeight: 150, overflowY: 'auto', overscrollBehavior: 'contain', background: colors.backgroundSecondary, borderRadius: 10, padding: 12, marginBottom: 12 }}
                  >
                    {target.locationNames.map((name, i) => (
                      <div key={`${i}-${name}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 0' }}>
                        <span aria-hidden="true" style={{ fontSize: 14.5, color: '#f0f4f8', lineHeight: 1.5 }}>
                          {'•'}
                        </span>
                        <span style={{ fontSize: 13, color: '#f0f4f8', flex: 1 }}>{name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div style={{ marginBottom: 8 }}>
                <div style={detailLabel}>Location:</div>
                <div style={detailValue}>{target.locationName}</div>
              </div>
              {target.address && (
                <div style={{ marginBottom: 8 }}>
                  <div style={detailLabel}>Address:</div>
                  <div style={detailValue}>{target.address}</div>
                </div>
              )}
            </>
          )}
          {/* The two arms carry DIFFERENT warning strings on the phone (…"for this location"…
              vs the case's unqualified line) — both lifted verbatim, both italic + error. */}
          <div style={{ fontSize: 13, color: ERROR, fontStyle: 'italic', marginTop: 14, lineHeight: 1.5 }}>
            {isCase
              ? 'All form data, photos, and PDFs will be permanently deleted.'
              : 'All form data, photos, and PDFs for this location will be permanently deleted.'}
          </div>
        </div>

        {/* Phone `src/features/case-management/components/DeleteConfirmationModal.tsx:76-98`,
            testIDs included: cancel is `variant="secondary"`, confirm is `variant="danger"`,
            both default size. A67/A52 — the fill leaves the flat `error` red (3.34:1 under
            white) for `DangerFill.dark`, which is `errorLight` (6.39:1), and the label leaves
            `#fff` for `colors.onError`. The hexes are deliberately NOT written out here:
            `glass-tokens.test.ts`'s banned-literal scan reads SOURCE TEXT and does not know a
            comment from a style value — it caught this docblock on the first run.
            `ERROR` above KEEPS its other two consumers untouched: the 48px
            icon at `:126` and the italic warning line at `:183` are not buttons, and
            re-pointing the const wholesale would recolour both. */}
        {/* Phone `DeleteConfirmationModal.tsx:315`: `gap: Layout.spacing.md` (W2 F41). */}
        <div style={{ display: 'flex', gap: spacing.md }}>
          <button
            type="button"
            data-testid="delete-modal-cancel"
            onClick={onCancel}
            style={{ flex: 1, ...buttonStyle({ variant: 'secondary' }) }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="delete-modal-confirm"
            onClick={onConfirm}
            style={{ flex: 1, ...buttonStyle({ variant: 'danger' }) }}
          >
            {isCase ? 'Delete Case' : 'Delete'}
          </button>
        </div>
    </CentredDialog>
  )
}
