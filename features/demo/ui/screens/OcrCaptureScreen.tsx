'use client'

import { useCallback, useId, useState, type CSSProperties } from 'react'
import { GLASS, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'
import { AlertDialog } from '@/features/demo/ui/controls/AlertDialog'
import { DateTimeField } from '@/features/demo/ui/screens/_shared'
import { DateDisambiguationWarning } from '@/features/demo/ui/screens/DateDisambiguationWarning'
import { isDvrDraftCommittable, type DvrDateResolution } from '@/features/demo/engine/logic/ocr'
import type { OcrSampleFrame } from '@/features/demo/engine/content/seed'

export type OcrResult =
  | {
      ok: true
      /** What OCR read, after MM/DD-vs-DD/MM resolution — the evidence line, never edited. */
      dvrTime: string
      confidence: { label: string; color: string }
      actual: string
      /** What the reader had to assume — drives the warning/blocker, exactly one at a time. */
      resolution: DvrDateResolution
    }
  | { ok: false; rawText: string }

export interface OcrCaptureScreenProps {
  /** null = aim/camera stage; present = the confirm stage (parsed or failed). */
  result: OcrResult | null
  /** The operator's working DVR date/time — pre-filled from the read, editable before commit. */
  dvrDraft: string
  onChangeDvrDraft(value: string): void
  /** True once the operator has accepted the assumed date (only meaningful when
   *  `result.resolution.kind === 'assumed-date'` — R-23 replaced the flat `assumedDate` field
   *  this once named with the three-arm union). */
  dateConfirmed: boolean
  onConfirmDate(): void
  /**
   * True when extracted video scopes already exist, so committing would regenerate — and
   * discard any manual edits to — the whole list. Gates the phone's recalculate prompt.
   */
  hasExtractedScopes: boolean
  onUseSample(frame: OcrSampleFrame): void
  onCapture(): void
  onCancel(): void
  onRetake(): void
  /** `regenerate: false` = the phone's "Keep My Edits" — recalculate without rebuilding scopes. */
  onConfirm(regenerate: boolean): void
}

const corner = (pos: CSSProperties): CSSProperties => ({ position: 'absolute', width: 30, height: 30, ...pos })

const label12: CSSProperties = { fontSize: 12, color: '#7a9fc4' }
const mono = "var(--font-jbmono),'JetBrains Mono',monospace"

/** Full-screen OCR capture (launch-only). A live camera feed is a fast-follow (deferred media
 *  screens); today the capture button and the sample-frame buttons all run the same real
 *  clean+parse pipeline (cleanOcrText/readDvrTimestamp) over a hardcoded DVR frame. */
export function OcrCaptureScreen({
  result,
  dvrDraft,
  onChangeDvrDraft,
  dateConfirmed,
  onConfirmDate,
  hasExtractedScopes,
  onUseSample,
  onCapture,
  onCancel,
  onRetake,
  onConfirm,
}: OcrCaptureScreenProps) {
  const [confirmRecalc, setConfirmRecalc] = useState(false)
  // Stable identity: AlertDialog keys its Escape listener on `onDismiss`, so a fresh closure
  // per render would tear the listener down and re-add it on every parent update.
  const closeRecalc = useCallback(() => setConfirmRecalc(false), [])
  /** Ties the commit CTA to whichever reason is currently blocking it (R-15). */
  const blockedId = `${useId()}-blocked`

  if (result) {
    // The commit gate is the engine's (`isDvrDraftCommittable`) — this screen only reflects it.
    const canCommit = result.ok && isDvrDraftCommittable(dvrDraft, result.resolution, dateConfirmed)
    const dateNeedsConfirming = result.ok && Boolean(dvrDraft) && !canCommit
    const edited = result.ok && dvrDraft !== result.dvrTime
    // Committing runs `generateExtractedScopes`, which replaces the editable extracted-scope
    // list wholesale. The phone stops here and asks (ocr-capture.tsx:282-317); so do we.
    const onCommitClick = () => {
      if (!canCommit) return // the CTA is aria-disabled, not disabled — the guard lives here
      if (hasExtractedScopes) setConfirmRecalc(true)
      else onConfirm(true)
    }
    // Same idiom for the assumed-date confirm (R-35): aria-disabled keeps it focusable, so the
    // refusal has to live here.
    const onConfirmDateClick = () => {
      if (dateConfirmed) return
      onConfirmDate()
    }

    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#05080d', padding: '54px 22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8', marginBottom: 16 }}>Captured timestamp</div>
        {result.ok ? (
          <>
            <div style={{ borderRadius: 12, border: '1px solid rgba(30,58,95,0.6)', background: '#0a1320', padding: 16, marginBottom: 16 }}>
              <div style={{ ...label12, marginBottom: 4 }}>Parsed DVR time</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8', fontFamily: mono, marginBottom: 14 }}>{result.dvrTime}</div>
              {/* R-16: this score is the one number on the screen that is NOT measured — there
                  is no recogniser in a browser, so it is a constant per sample frame. It gets
                  the demo's established "not from the real thing" badge (the import result's
                  Sample-data pill), and the note names what it does and does not describe:
                  the legibility of the characters, never the reading of the date. Without
                  that, a green "High confidence" sitting above a red assumed-date blocker or
                  a low-confidence ambiguity warning reads as the screen contradicting itself. */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ ...label12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  OCR confidence
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#ffd07a', background: 'rgba(255,200,90,0.12)', border: '1px solid rgba(255,200,90,0.3)', borderRadius: 6, padding: '1px 6px' }}>
                    Sample
                  </span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: result.confidence.color }}>{result.confidence.label}</span>
              </div>
              <div style={{ fontSize: 11, color: '#7a9fc4', lineHeight: 1.45, marginBottom: 10 }}>
                Fixed for sample frames — a browser has no recogniser to score. It rates how legibly the characters
                read, never which date they mean.
              </div>
              <div style={label12}>
                Actual (atomic): <span style={{ color: '#cfe6f5', fontFamily: mono }}>{result.actual}</span>
              </div>
            </div>

            {/* Phone render order: the ambiguity warning sits between the captured evidence and
                the correction field (ui-mapping 06, Confirmation Step content items 2–3).
                The union makes "warning AND blocker at once" unrepresentable — see R-23. */}
            {result.resolution.kind === 'ambiguous' && <DateDisambiguationWarning result={result.resolution.ambiguity} />}

            {result.resolution.kind === 'assumed-date' && (
              <div role="alert" style={{ borderRadius: 12, border: GLASS.borderError, background: 'rgba(255,71,87,0.06)', padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#ff8a93', marginBottom: 8 }}>No date on the DVR display</div>
                <div style={{ fontSize: 12, color: '#9fc0db', lineHeight: 1.5, marginBottom: 12 }}>
                  Only a time was read from this frame. The date below is <strong>assumed</strong> — today&apos;s date on this
                  device, not something OCR saw. Correct it, or confirm it, before it becomes a scope boundary.
                </div>
                {/* R-35: `aria-disabled`, not `disabled` — the §44b rule applied to the button
                    that actually trips it. This one's state flips UNDER the operator's finger:
                    pressing it sets `dateConfirmed`, a native `disabled` blurs the just-pressed
                    element to <body>, and that lands at the exact moment the `role="status"`
                    blocked-reason clears and the (aria-disabled) commit CTA below becomes the
                    thing to press. The click is guarded in the handler instead — the same
                    three-layer shape as the CTA, and re-confirming would be idempotent anyway. */}
                <button
                  type="button"
                  onClick={onConfirmDateClick}
                  aria-disabled={dateConfirmed}
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    padding: 11,
                    borderRadius: 10,
                    border: '1px solid #2B8CC1',
                    background: 'transparent',
                    color: '#4BA3D4',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: dateConfirmed ? 'default' : 'pointer',
                    opacity: dateConfirmed ? 0.45 : 1,
                  }}
                >
                  {dateConfirmed ? 'Date confirmed' : 'The date is correct'}
                </button>
              </div>
            )}

            <DateTimeField label="DVR Date/Time" value={dvrDraft} onChange={onChangeDvrDraft} />
            {edited && <div style={{ fontSize: 12, fontStyle: 'italic', color: '#7a9fc4', marginTop: -8, marginBottom: 12 }}>Manually edited</div>}

            {/* R-15: the reason the commit is blocked is a live region (it appears in response
                to an edit, so it has to announce), and it NAMES the CTA it blocks via
                aria-describedby. The CTA uses `aria-disabled` rather than `disabled` so it
                stays focusable — a keyboard user has to be able to land on it to hear why it
                won't fire, and `disabled` would also drop focus at the exact moment confirming
                the date re-enables it (the R-7 failure shape). The click is guarded instead. */}
            <div style={{ marginTop: 'auto' }}>
              <div role="status" style={{ ...label12 }}>
                {!dvrDraft && <div id={blockedId} style={{ marginBottom: 10 }}>DVR Time Required — please enter the DVR timestamp before continuing.</div>}
                {dateNeedsConfirming && <div id={blockedId} style={{ marginBottom: 10 }}>Confirm or correct the assumed date before continuing.</div>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onRetake} style={{ padding: '14px 20px', ...glassBtnSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Retake</button>
                <button
                  type="button"
                  onClick={onCommitClick}
                  aria-disabled={!canCommit}
                  aria-describedby={canCommit ? undefined : blockedId}
                  style={{ flex: 1, textAlign: 'center', padding: 14, ...glassBtnPrimary, fontSize: 15, fontWeight: 600, cursor: canCommit ? 'pointer' : 'not-allowed', opacity: canCommit ? 1 : 0.45 }}
                >
                  Use this &amp; calculate
                </button>
              </div>
            </div>

            {/* The phone's `Recalculate Time Offset` Alert (`app/(form)/ocr-capture.tsx:288-317`,
                spec `docs/ui-mapping/06-wizard-b-time.md:145-155`) on the shared blocking-dialog
                primitive: title, message and all three button labels verbatim, `Cancel` carrying
                the phone's `style: 'cancel'` and `Regenerate Scopes` its `destructive`. */}
            {confirmRecalc && (
              <AlertDialog
                title="Recalculate Time Offset"
                message="Recalculating will update the time offset. What would you like to do with your extracted video scopes?"
                actions={[
                  // Phone: `router.push(TIME_OFFSET)` — leaves the OCR flow, discarding the read.
                  { label: 'Cancel', style: 'cancel', onPress: onCancel },
                  { label: 'Keep My Edits', onPress: () => onConfirm(false) },
                  { label: 'Regenerate Scopes', style: 'destructive', onPress: () => onConfirm(true) },
                ]}
                // Escape takes the least-destructive route — back to the confirm step with the
                // read intact. It deliberately is NOT the `Cancel` arm, which discards the read:
                // a stray keypress must not be able to throw away a capture.
                onDismiss={closeRecalc}
              />
            )}
          </>
        ) : (
          <>
            <div style={{ borderRadius: 12, border: GLASS.borderError, background: 'rgba(255,71,87,0.06)', padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#ff8a93', marginBottom: 8 }}>Couldn&apos;t read a timestamp</div>
              <div style={{ fontSize: 12, color: '#9fc0db', lineHeight: 1.5 }}>OCR text: <span style={{ fontFamily: mono, color: '#cdd9e6' }}>{result.rawText}</span></div>
            </div>
            <button type="button" onClick={onRetake} style={{ textAlign: 'center', padding: 14, ...glassBtnPrimary, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 'auto' }}>Try again</button>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#05080d', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center,#0d1b2a,#05080d)' }} />
      <div style={{ position: 'absolute', top: 54, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
        <div style={{ fontFamily: "var(--font-stmono),'Share Tech Mono',monospace", fontSize: 13, letterSpacing: 2, color: '#9fd4ee' }}>AIM AT THE DVR CLOCK</div>
      </div>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 300, height: 96, zIndex: 2 }}>
        <div style={corner({ top: 0, left: 0, borderTop: '3px solid #4BA3D4', borderLeft: '3px solid #4BA3D4' })} />
        <div style={corner({ top: 0, right: 0, borderTop: '3px solid #4BA3D4', borderRight: '3px solid #4BA3D4' })} />
        <div style={corner({ bottom: 0, left: 0, borderBottom: '3px solid #4BA3D4', borderLeft: '3px solid #4BA3D4' })} />
        <div style={corner({ bottom: 0, right: 0, borderBottom: '3px solid #4BA3D4', borderRight: '3px solid #4BA3D4' })} />
      </div>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,90px)', textAlign: 'center', zIndex: 3, width: 280 }}>
        <div style={{ fontSize: 13, color: '#ff8a93', lineHeight: 1.5 }}>No camera available here — use the sample DVR clock below (same OCR pipeline).</div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 26px', background: 'linear-gradient(0deg,rgba(0,0,0,0.88),transparent)', zIndex: 3 }}>
        <button type="button" onClick={() => onUseSample('clean')} style={{ width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, border: '1px solid #4BA3D4', background: 'rgba(43,140,193,0.14)', color: '#9fd4ee', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>Use sample DVR clock</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: '#7a9fc4' }}>Awkward frames:</span>
          <button type="button" onClick={() => onUseSample('ambiguous')} style={sampleLink}>Ambiguous date</button>
          <button type="button" onClick={() => onUseSample('timeOnly')} style={sampleLink}>Time only</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={onCancel} style={{ fontSize: 15, color: '#cdd9e6', cursor: 'pointer', padding: 10, width: 70, background: 'transparent', border: 'none', textAlign: 'left' }}>Cancel</button>
          <button type="button" aria-label="Capture" onClick={onCapture} style={{ width: 68, height: 68, borderRadius: 34, border: '4px solid #fff', background: 'rgba(255,255,255,0.22)', cursor: 'pointer' }} />
          <div style={{ width: 70 }} />
        </div>
      </div>
    </div>
  )
}

const sampleLink: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#9fd4ee',
  background: 'transparent',
  border: 'none',
  padding: 4,
  cursor: 'pointer',
  textDecoration: 'underline',
}
