'use client'

import type { CSSProperties } from 'react'
import { GLASS, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'
import { DateTimeField } from '@/features/demo/ui/screens/_shared'
import { DateDisambiguationWarning } from '@/features/demo/ui/screens/DateDisambiguationWarning'
import type { DateDisambiguationResult } from '@/features/demo/engine/logic/date-disambiguation'
import { isDvrDraftCommittable } from '@/features/demo/engine/logic/ocr'
import type { OcrSampleFrame } from '@/features/demo/engine/content/seed'

export type OcrResult =
  | {
      ok: true
      /** What OCR read, after MM/DD-vs-DD/MM resolution — the evidence line, never edited. */
      dvrTime: string
      confidence: { label: string; color: string }
      actual: string
      /** Set when the frame carried no date: the assumed date the operator must confirm. */
      assumedDate: string | null
      /** Set when the date digits were ambiguous; drives the inline warning. */
      ambiguity: DateDisambiguationResult | null
    }
  | { ok: false; rawText: string }

export interface OcrCaptureScreenProps {
  /** null = aim/camera stage; present = the confirm stage (parsed or failed). */
  result: OcrResult | null
  /** The operator's working DVR date/time — pre-filled from the read, editable before commit. */
  dvrDraft: string
  onChangeDvrDraft(value: string): void
  /** True once the operator has accepted the assumed date (only meaningful when `assumedDate` is set). */
  dateConfirmed: boolean
  onConfirmDate(): void
  onUseSample(frame: OcrSampleFrame): void
  onCapture(): void
  onCancel(): void
  onRetake(): void
  onConfirm(): void
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
  onUseSample,
  onCapture,
  onCancel,
  onRetake,
  onConfirm,
}: OcrCaptureScreenProps) {
  if (result) {
    // The commit gate is the engine's (`isDvrDraftCommittable`) — this screen only reflects it.
    const canCommit = result.ok && isDvrDraftCommittable(dvrDraft, result.assumedDate, dateConfirmed)
    const dateNeedsConfirming = result.ok && Boolean(dvrDraft) && !canCommit
    const edited = result.ok && dvrDraft !== result.dvrTime

    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#05080d', padding: '54px 22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8', marginBottom: 16 }}>Captured timestamp</div>
        {result.ok ? (
          <>
            <div style={{ borderRadius: 12, border: '1px solid rgba(30,58,95,0.6)', background: '#0a1320', padding: 16, marginBottom: 16 }}>
              <div style={{ ...label12, marginBottom: 4 }}>Parsed DVR time</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8', fontFamily: mono, marginBottom: 14 }}>{result.dvrTime}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={label12}>OCR confidence</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: result.confidence.color }}>{result.confidence.label}</span>
              </div>
              <div style={label12}>
                Actual (atomic): <span style={{ color: '#cfe6f5', fontFamily: mono }}>{result.actual}</span>
              </div>
            </div>

            {/* Phone render order: the ambiguity warning sits between the captured evidence and
                the correction field (ui-mapping 06, Confirmation Step content items 2–3). */}
            {result.ambiguity && <DateDisambiguationWarning result={result.ambiguity} />}

            {result.assumedDate !== null && (
              <div role="alert" style={{ borderRadius: 12, border: GLASS.borderError, background: 'rgba(255,71,87,0.06)', padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#ff8a93', marginBottom: 8 }}>No date on the DVR display</div>
                <div style={{ fontSize: 12, color: '#9fc0db', lineHeight: 1.5, marginBottom: 12 }}>
                  Only a time was read from this frame. The date below is <strong>assumed</strong> — today&apos;s date on this
                  device, not something OCR saw. Correct it, or confirm it, before it becomes a scope boundary.
                </div>
                <button
                  type="button"
                  onClick={onConfirmDate}
                  disabled={dateConfirmed}
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

            <div style={{ marginTop: 'auto' }}>
              {!dvrDraft && <div style={{ ...label12, marginBottom: 10 }}>DVR Time Required — please enter the DVR timestamp before continuing.</div>}
              {dateNeedsConfirming && <div style={{ ...label12, marginBottom: 10 }}>Confirm or correct the assumed date before continuing.</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onRetake} style={{ padding: '14px 20px', ...glassBtnSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Retake</button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={!canCommit}
                  style={{ flex: 1, textAlign: 'center', padding: 14, ...glassBtnPrimary, fontSize: 15, fontWeight: 600, cursor: canCommit ? 'pointer' : 'not-allowed', opacity: canCommit ? 1 : 0.45 }}
                >
                  Use this &amp; calculate
                </button>
              </div>
            </div>
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
