'use client'

import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ModalShell } from '@/features/demo/ui/screens/_shared'
import { actionsForStatus } from '@/features/demo/engine/logic/case-actions'
import type { CaseSheetData } from '@/features/demo/ui/screens/screenData'
import { glassBtnPrimary, glassBtnSecondary, glassCardNested } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'

/**
 * CaseActionsSheet — the dashboard's long-press action menu + read-only case report
 * (parity P3.2, matrix row 9). Web port of the phone's
 * `src/features/case-management/components/CaseActionsSheet.tsx`.
 *
 * Presentational: props in, callbacks out. Nothing here touches the store — the bridge
 * supplies the mapped `caseData` (see `toCaseSheet`) and every action.
 *
 * Structure is the phone's pageSheet, three zones:
 *   header (case number · display name · `Status: …`)
 *   → ONE bordered "report" panel of grouped label/value rows, capped to the space between
 *     the header and the buttons and scrollable ONLY on real overflow (measured, below)
 *   → the status-aware action buttons, PINNED (they never scroll away).
 *
 * The action set comes from `actionsForStatus` (engine) — DRAFT → Complete+Archive,
 * COMPLETE → Reopen+Archive, ARCHIVED → Reopen. Edit and Cancel are unconditional on the
 * phone; here Edit renders only when `onEdit` is supplied — see the prop's note.
 */

/**
 * The overflow gate (phone `CaseActionsSheet.tsx:235-249`).
 *
 * The report hugs its content when it fits and scrolls INSIDE its own border only once the
 * content would overflow the measured space — so it can never slide behind the pinned
 * buttons, and a short case gets no scrollbar, no drag, no bounce.
 *
 * Both inputs are null until first measurement, and the gate defaults OFF then — a fitting
 * case must never render one scrollable frame before its own height is known. Exported for
 * unit tests (the `isNearBottom` idiom from ImportTerminalProgress): jsdom does no layout, so
 * the component-level default is "unmeasured".
 *
 * Unlike the phone there is no `- borderWidth * 2` correction: `box-sizing: border-box`
 * (scoped to `[data-demo-root]` in demo.css) already counts the panel's 1px borders inside
 * `maxHeight`. The `+ 1` slack is the phone's, kept for sub-pixel rounding.
 */
export function reportScrollGate(m: { bodyHeight: number | null; contentHeight: number | null }): {
  maxHeight: number | undefined
  scrollable: boolean
} {
  const maxHeight = m.bodyHeight != null && m.bodyHeight > 0 ? m.bodyHeight : undefined
  const scrollable = maxHeight != null && m.contentHeight != null ? m.contentHeight > maxHeight + 1 : false
  return { maxHeight, scrollable }
}

export interface CaseActionsSheetProps {
  /** The case the actions apply to. The bridge mounts the sheet only when one is open. */
  caseData: CaseSheetData
  /**
   * Open the case for editing. OPTIONAL and rendered first when present — the phone's
   * `Edit Case` opens `NewCaseModal` in edit mode, which is package P3.3's deliverable.
   * Until that lands the bridge passes nothing and the button is absent, rather than
   * shipping a button that cannot do what it says (the demo's honesty rule).
   */
  onEdit?: () => void
  /** DRAFT only — mark the case complete. */
  onComplete: () => void
  /** COMPLETE / ARCHIVED — return the case to active. */
  onReopen: () => void
  /** DRAFT / COMPLETE — archive the case. */
  onArchive: () => void
  /** Dismiss without acting (Cancel, the close ×, the scrim, Escape). */
  onClose: () => void
}

const gridButton: CSSProperties = {
  flexBasis: '48%',
  flexGrow: 1,
  minWidth: 0,
  padding: 12,
  fontSize: 14.5,
  fontWeight: 600,
  cursor: 'pointer',
}

export function CaseActionsSheet({
  caseData,
  onEdit,
  onComplete,
  onReopen,
  onArchive,
  onClose,
}: CaseActionsSheetProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [metrics, setMetrics] = useState<{ bodyHeight: number | null; contentHeight: number | null }>({
    bodyHeight: null,
    contentHeight: null,
  })

  // Measure on mount and again whenever either box resizes — the phone's onLayout +
  // onContentSizeChange pair. The state update is reference-preserving on unchanged
  // measurements, so the observer cannot drive a render loop.
  //
  // The CONTENT element is observed, never the scroller: the scroller's own box is what
  // `maxHeight` pins, so once the cap is applied it stops changing size and would never
  // report content that grew behind it. The content wrapper is uncapped (it carries the
  // panel's padding, like the phone's `contentContainerStyle`), so its height is the real
  // signal.
  useLayoutEffect(() => {
    const body = bodyRef.current
    const content = contentRef.current
    if (!body || !content) return
    const measure = () =>
      setMetrics((prev) => {
        const bodyHeight = body.clientHeight
        const contentHeight = content.offsetHeight
        return prev.bodyHeight === bodyHeight && prev.contentHeight === contentHeight
          ? prev
          : { bodyHeight, contentHeight }
      })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(body)
    ro.observe(content)
    return () => ro.disconnect()
  }, [])

  const { maxHeight, scrollable } = reportScrollGate(metrics)
  const { canComplete, canReopen, canArchive } = actionsForStatus(caseData.status)

  const subtitle = (
    <>
      {caseData.displayName && (
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f4f8', marginTop: 4 }}>{caseData.displayName}</div>
      )}
      <div style={{ fontSize: 13, color: '#7a9fc4', marginTop: 4 }}>Status: {caseData.statusLabel}</div>
    </>
  )

  const footer = (
    // 2-up grid, document order Edit → Complete/Reopen → Archive → Cancel: row 1 is
    // Edit + Complete/Reopen, row 2 Archive + Cancel. An ARCHIVED case has one button
    // fewer, so Cancel lands alone on its row and flexGrow stretches it full width —
    // the phone's exact wrap behaviour.
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {onEdit && (
        <button type="button" onClick={onEdit} style={{ ...gridButton, ...glassBtnPrimary }}>
          Edit Case
        </button>
      )}
      {canComplete && (
        <button type="button" onClick={onComplete} style={{ ...gridButton, ...glassBtnPrimary }}>
          Complete Case
        </button>
      )}
      {canReopen && (
        <button type="button" onClick={onReopen} style={{ ...gridButton, ...glassBtnSecondary }}>
          Reopen Case
        </button>
      )}
      {canArchive && (
        <button type="button" onClick={onArchive} style={{ ...gridButton, ...glassBtnSecondary }}>
          Archive Case
        </button>
      )}
      <button type="button" onClick={onClose} style={{ ...gridButton, ...glassBtnSecondary }}>
        Cancel
      </button>
    </div>
  )

  return (
    <ModalShell title={caseData.caseNumber} subtitle={subtitle} onClose={onClose} fillBody footer={footer}>
      <div ref={bodyRef} style={{ flex: 1, minHeight: 0 }}>
        <div
          data-case-report
          style={{
            // A33/A55 (U1.3) - the nested tier. Was `rgba(13,27,42,0.6)` on the hard border.
            // Spread FIRST so the geometry below wins and nothing overrides `border` or
            // `borderColor` after it (either erases the lit top edge - §4.3).
            ...glassCardNested,
            maxHeight,
            overflowY: scrollable ? 'auto' : 'hidden',
            overscrollBehavior: 'contain',
            // No padding here — it belongs to the content wrapper (the phone's
            // `contentContainerStyle`), so the panel's inset scrolls with the report
            // instead of clipping its last row, and the wrapper measures a true height.
            overflowX: 'hidden',
          }}
        >
          <div ref={contentRef} data-case-report-content style={{ padding: 18 }}>
          {caseData.groups.map((group, i) => (
            <Fragment key={group.id}>
              {i > 0 && <div style={{ height: 1, background: colors.border, opacity: 0.6, margin: '12px 0' }} />}
              <div data-report-group={group.id}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: '#f0f4f8',
                    marginBottom: 8,
                  }}
                >
                  {group.title}
                </div>
                {group.rows.map((row) => (
                  <div
                    key={row.label}
                    style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}
                  >
                    <div style={{ flex: '0 0 42%', fontSize: 13, fontWeight: 500, color: '#7a9fc4' }}>{row.label}</div>
                    <div
                      style={{
                        flex: '0 0 58%',
                        fontSize: row.mono ? 12.5 : 14,
                        fontWeight: 500,
                        color: '#f0f4f8',
                        textAlign: 'right',
                        wordBreak: 'break-word',
                        ...(row.mono ? { fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace" } : {}),
                      }}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
                {group.body && (
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: '#f0f4f8', whiteSpace: 'pre-line' }}>{group.body}</div>
                )}
              </div>
            </Fragment>
          ))}
          </div>
        </div>
      </div>
    </ModalShell>
  )
}
