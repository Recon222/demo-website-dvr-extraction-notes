'use client'

import { useCallback, useState } from 'react'
import { DateTimeField, SectionCard, switchKeyDown, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { SyncStatusCard } from '@/features/demo/ui/screens/SyncStatusCard'
import type { SyncResult } from '@/features/demo/engine/types'
import { AlertDialog } from '@/features/demo/ui/controls/AlertDialog'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { GLASS, glassCard, glassBtnPrimary } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'

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
  // Stable identity: AlertDialog keys its Escape listener on `onDismiss`, so a fresh closure
  // per render would tear the listener down and re-add it on every parent update.
  const cancelRecalc = useCallback(() => setConfirmRecalc(false), [])
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Time Offset" onBack={p.onBack} onMenu={p.onMenu} />
      <div style={{ padding: 16 }}>
        <SectionCard title="DVR Time vs Actual Time">
          <DateTimeField label="DVR Date / Time" value={p.dvrDateTime} onChange={p.onChangeDvr} />
          <DateTimeField label="Actual Date / Time" value={p.actualDateTime} onChange={p.onChangeActual} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {/* Phone `app/(form)/time-offset.tsx:467-476`: `variant="outline"`, default size,
                `style={styles.flexButton}`. A66. */}
            <button type="button" onClick={p.onUseCurrentTime} style={{ flex: 1, ...buttonStyle({ variant: 'outline' }) }}>Use Current Time</button>
            <button type="button" onClick={onCalculateClick} disabled={!canCalc} style={{ flex: 1, textAlign: 'center', padding: 11, ...glassBtnPrimary, fontSize: 14, fontWeight: 600, cursor: canCalc ? 'pointer' : 'not-allowed', opacity: canCalc ? 1 : 0.45 }}>Calculate</button>
          </div>
          {/* Phone `app/(form)/time-offset.tsx:505-533`: `variant="outline"`, default size, with
              NON-STRING children — so the phone has to re-state `colors.link` on both the icon
              (`:521`) and the label (`:527`), and its `ocrCaptureText` is `fontSize.base`/semibold
              (`:736-740`). On the web both inherit from the button, so they are dropped rather
              than restated: one source for the token, and `currentColor` for the glyph. */}
          <button type="button" onClick={p.onCaptureOcr} style={{ gap: 9, width: '100%', ...buttonStyle({ variant: 'outline' }) }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            <span>Capture from DVR</span>
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
              <div style={{ width: 46, height: 28, borderRadius: 14, background: p.dvrAppliesDST ? '#2B8CC1' : colors.border, position: 'relative' }}>
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

      {/* The phone's `Recalculate Time Offset?` Alert (`app/(form)/time-offset.tsx:372-382`,
          spec `docs/ui-mapping/06-wizard-b-time.md:80-83`) on the shared blocking-dialog
          primitive: title, message and both button labels verbatim, `Cancel` carrying the
          phone's `style: 'cancel'`, Escape dismissing to the safe default. */}
      {confirmRecalc && (
        <AlertDialog
          title="Recalculate Time Offset?"
          message="This will reset your extracted video scopes. Any manual edits to the extracted times will be lost."
          actions={[
            { label: 'Cancel', style: 'cancel', onPress: cancelRecalc },
            {
              label: 'Continue',
              onPress: () => {
                setConfirmRecalc(false)
                p.onCalculate()
              },
            },
          ]}
          onDismiss={cancelRecalc}
        />
      )}
    </div>
  )
}
