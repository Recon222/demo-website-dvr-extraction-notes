'use client'

import { useEffect, useState } from 'react'
import { DateTimeField, SectionCard, switchKeyDown, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { SyncStatusCard } from '@/features/demo/ui/screens/SyncStatusCard'
import type { SyncResult } from '@/features/demo/engine/types'
import { GLASS, glassCard, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'

export interface CorrectedScope {
  id: string
  reqLabel: string
  /** The domain the adjusted times are in — the inverse of `reqLabel`, as the phone labels it. */
  adjLabel: string
  reqStart: string
  reqEnd: string
  adjStart: string
  adjEnd: string
  cameras: string
}

export interface TimeOffsetScreenProps {
  dvrDateTime: string
  actualDateTime: string
  onChangeDvr(value: string): void
  onChangeActual(value: string): void
  onUseCurrentTime(): void
  onCalculate(): void
  onCaptureOcr(): void
  sync: SyncResult | null
  syncing: boolean
  result: { diff: string; direction: string; isCorrect: boolean } | null
  correctedScopes: CorrectedScope[]
  dvrAppliesDST: boolean
  onToggleDst(): void
  /** The phone's DST scenario message for the current calibration, or null. */
  dstAdvisory: string | null
  /** True when a recalculation would overwrite generated/edited extracted scopes. */
  hasExtractedScopes: boolean
  onNext(): void
  onBack(): void
  onMenu(): void
}

const cell = (color: string): React.CSSProperties => ({ fontSize: 12.5, color, fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace" })

/** The demo's warning amber — the same `colors.warning` stop the import terminal uses. */
const WARNING = '#ffd93d'

/**
 * The phone's `Recalculate Time Offset?` confirmation (`app/(form)/time-offset.tsx:372-382`,
 * spec `docs/ui-mapping/06-wizard-b-time.md:80-83`) as an in-phone blocking dialog: title,
 * message and both button labels are verbatim; `Cancel` is the safe default (the phone marks
 * it `style: 'cancel'`), and Escape / backdrop both cancel.
 *
 * Deliberately local to this screen: the demo has no shared blocking-dialog primitive yet and
 * one is scheduled work elsewhere in the plan (P3.1 / P4.5 / P5.3) — this is not it. Fold it in
 * when that primitive lands (deferred ledger).
 */
function RecalculateDialog({ onCancel, onContinue }: { onCancel(): void; onContinue(): void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div
      data-recalc-backdrop
      onClick={onCancel}
      style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(4,8,14,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recalculate Time Offset?"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 286, maxWidth: '100%', ...glassCard, boxShadow: '0 24px 60px rgba(0,0,0,0.6)', padding: '20px 20px 16px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', marginBottom: 8 }}>Recalculate Time Offset?</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: '#bcccde', marginBottom: 18 }}>
          This will reset your extracted video scopes. Any manual edits to the extracted times will be lost.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- focus lands on the safe default action when the dialog opens */}
          <button type="button" autoFocus onClick={onCancel} style={{ flex: 1, padding: 11, ...glassBtnSecondary, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="button" onClick={onContinue} style={{ flex: 1, padding: 11, ...glassBtnPrimary, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

/** The marquee: capture the DVR clock vs real time and compute the defensible offset, then show
 *  the requested ranges corrected onto the DVR clock. Calls the real time-offset math. */
export function TimeOffsetScreen(p: TimeOffsetScreenProps) {
  const canCalc = Boolean(p.dvrDateTime && p.actualDateTime)
  const [confirmRecalc, setConfirmRecalc] = useState(false)
  // The phone gates Calculate behind a confirmation once extracted scopes exist, because the
  // recalculation regenerates them wholesale and discards any manual edits. The demo's
  // `generateExtractedScopes` replaces the list the same way, and its Extracted-Scope screen is
  // editable — so the guard is load-bearing here, not ceremony.
  const onCalculateClick = () => {
    if (p.hasExtractedScopes) setConfirmRecalc(true)
    else p.onCalculate()
  }
  return (
    <div style={{ position: 'relative', minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Time Offset" onBack={p.onBack} onMenu={p.onMenu} />
      <div style={{ padding: 16 }}>
        <SectionCard title="DVR Time vs Actual Time">
          <DateTimeField label="DVR Date / Time" value={p.dvrDateTime} onChange={p.onChangeDvr} />
          <DateTimeField label="Actual Date / Time" value={p.actualDateTime} onChange={p.onChangeActual} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={p.onUseCurrentTime} style={{ flex: 1, textAlign: 'center', padding: 11, borderRadius: 10, border: '1px solid #2B8CC1', background: 'transparent', color: '#4BA3D4', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Use Current Time</button>
            <button type="button" onClick={onCalculateClick} disabled={!canCalc} style={{ flex: 1, textAlign: 'center', padding: 11, ...glassBtnPrimary, fontSize: 14, fontWeight: 600, cursor: canCalc ? 'pointer' : 'not-allowed', opacity: canCalc ? 1 : 0.45 }}>Calculate</button>
          </div>
          <button type="button" onClick={p.onCaptureOcr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 12, borderRadius: 10, border: '1px solid #2B8CC1', background: 'transparent', cursor: 'pointer', width: '100%' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4BA3D4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#4BA3D4' }}>Capture from DVR</span>
          </button>
        </SectionCard>

        <SyncStatusCard sync={p.sync} syncing={p.syncing} />

        {p.result && (
          <>
            <div style={{ borderRadius: 12, border: GLASS.borderAccent, background: GLASS.gradientPanel, padding: 20, marginBottom: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#7a9fc4', marginBottom: 6 }}>Time Difference</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: '#f0f4f8', fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace", marginBottom: 6 }}>{p.result.diff}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#4BA3D4' }}>{p.result.isCorrect ? 'DVR time is correct' : `DVR is ${p.result.direction} real time`}</div>
            </div>

            {p.correctedScopes.length > 0 && (
              <>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f4f8', marginBottom: 12 }}>Adjusted Time Ranges</div>
                {p.correctedScopes.map((sc, i) => (
                  <div key={sc.id} style={{ ...glassCard, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8', marginBottom: 10 }}>Scope {i + 1}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#7a9fc4', marginBottom: 5 }}>Requested ({sc.reqLabel})</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={cell('#7a9fc4')}>Start</span><span style={cell('#f0f4f8')}>{sc.reqStart}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={cell('#7a9fc4')}>End</span><span style={cell('#f0f4f8')}>{sc.reqEnd}</span></div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#4BA3D4', marginBottom: 5 }}>Adjusted ({sc.adjLabel})</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={cell('#7a9fc4')}>Start</span><span style={{ ...cell('#4BA3D4'), fontWeight: 600 }}>{sc.adjStart}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={cell('#7a9fc4')}>End</span><span style={{ ...cell('#4BA3D4'), fontWeight: 600 }}>{sc.adjEnd}</span></div>
                    {sc.cameras && <div style={{ fontSize: 12, color: '#7a9fc4', fontStyle: 'italic', marginTop: 10 }}>Cameras: {sc.cameras}</div>}
                  </div>
                ))}
              </>
            )}

            <div
              role="switch"
              aria-checked={p.dvrAppliesDST}
              aria-label="DVR Applies DST"
              tabIndex={0}
              onClick={p.onToggleDst}
              onKeyDown={switchKeyDown(p.onToggleDst)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px', cursor: 'pointer', marginTop: 6 }}
            >
              <span style={{ fontSize: 15, fontWeight: 500, color: '#f0f4f8' }}>DVR Applies DST</span>
              <div style={{ width: 46, height: 28, borderRadius: 14, background: p.dvrAppliesDST ? '#2B8CC1' : '#1e3a5f', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 3, [p.dvrAppliesDST ? 'right' : 'left']: 3, width: 22, height: 22, borderRadius: 11, background: p.dvrAppliesDST ? '#fff' : '#7a9fc4' }} />
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: '#7a9fc4', marginTop: 2, marginBottom: 10 }}>
              Enable if the DVR clock adjusts for Daylight Saving Time
            </div>

            {p.dstAdvisory && (
              <div
                role="status"
                style={{ marginTop: 4, padding: 12, borderRadius: 10, border: `1px dashed ${WARNING}`, background: 'rgba(255,217,61,0.07)', fontSize: 12.5, lineHeight: 1.5, fontStyle: 'italic', textAlign: 'center', color: WARNING }}
              >
                {p.dstAdvisory}
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 14 }}>
          <WizardNext label="Continue →" onClick={p.onNext} />
        </div>
      </div>

      {confirmRecalc && (
        <RecalculateDialog
          onCancel={() => setConfirmRecalc(false)}
          onContinue={() => {
            setConfirmRecalc(false)
            p.onCalculate()
          }}
        />
      )}
    </div>
  )
}
