'use client'

import type { CSSProperties } from 'react'

export type OcrResult =
  | { ok: true; dvrTime: string; confidence: { label: string; color: string }; actual: string }
  | { ok: false; rawText: string }

export interface OcrCaptureScreenProps {
  /** null = aim/camera stage; present = the confirm stage (parsed or failed). */
  result: OcrResult | null
  onUseSample(): void
  onCapture(): void
  onCancel(): void
  onRetake(): void
  onConfirm(): void
}

const corner = (pos: CSSProperties): CSSProperties => ({ position: 'absolute', width: 30, height: 30, ...pos })

/** Full-screen OCR capture (launch-only). A live camera feed is a fast-follow (deferred media
 *  screens); today the capture button and the "Use sample DVR clock" button both run the same real
 *  clean+parse pipeline (cleanOcrText/parseTimestampFromText) over a sample DVR frame. */
export function OcrCaptureScreen({ result, onUseSample, onCapture, onCancel, onRetake, onConfirm }: OcrCaptureScreenProps) {
  if (result) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#05080d', padding: '54px 22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8', marginBottom: 16 }}>Captured timestamp</div>
        {result.ok ? (
          <>
            <div style={{ borderRadius: 12, border: '1px solid rgba(30,58,95,0.6)', background: '#0a1320', padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#7a9fc4', marginBottom: 4 }}>Parsed DVR time</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8', fontFamily: "'JetBrains Mono',monospace", marginBottom: 14 }}>{result.dvrTime}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#7a9fc4' }}>OCR confidence</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: result.confidence.color }}>{result.confidence.label}</span>
              </div>
              <div style={{ fontSize: 12, color: '#7a9fc4' }}>
                Actual (atomic): <span style={{ color: '#cfe6f5', fontFamily: "'JetBrains Mono',monospace" }}>{result.actual}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
              <button type="button" onClick={onRetake} style={{ padding: '14px 20px', borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Retake</button>
              <button type="button" onClick={onConfirm} style={{ flex: 1, textAlign: 'center', padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Use this &amp; calculate</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ borderRadius: 12, border: '1px solid rgba(255,71,87,0.3)', background: 'rgba(255,71,87,0.06)', padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#ff8a93', marginBottom: 8 }}>Couldn&apos;t read a timestamp</div>
              <div style={{ fontSize: 12, color: '#9fc0db', lineHeight: 1.5 }}>OCR text: <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#cdd9e6' }}>{result.rawText}</span></div>
            </div>
            <button type="button" onClick={onRetake} style={{ textAlign: 'center', padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 'auto' }}>Try again</button>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#05080d', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center,#0d1b2a,#05080d)' }} />
      <div style={{ position: 'absolute', top: 54, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 13, letterSpacing: 2, color: '#9fd4ee' }}>AIM AT THE DVR CLOCK</div>
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
        <button type="button" onClick={onUseSample} style={{ width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, border: '1px solid #4BA3D4', background: 'rgba(43,140,193,0.14)', color: '#9fd4ee', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>Use sample DVR clock</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={onCancel} style={{ fontSize: 15, color: '#cdd9e6', cursor: 'pointer', padding: 10, width: 70, background: 'transparent', border: 'none', textAlign: 'left' }}>Cancel</button>
          <button type="button" aria-label="Capture" onClick={onCapture} style={{ width: 68, height: 68, borderRadius: 34, border: '4px solid #fff', background: 'rgba(255,255,255,0.22)', cursor: 'pointer' }} />
          <div style={{ width: 70 }} />
        </div>
      </div>
    </div>
  )
}
