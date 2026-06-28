'use client'

import { DateTimeField, SectionCard, WizardHeader, WizardNext } from '@/components/demo/screens/_shared'

export interface CorrectedScope {
  id: string
  reqLabel: string
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
  captureMethod: 'manual' | 'ocr' | null
  result: { diff: string; direction: string; isCorrect: boolean } | null
  correctedScopes: CorrectedScope[]
  dvrAppliesDST: boolean
  onToggleDst(): void
  onNext(): void
  onBack(): void
  onMenu(): void
}

const cell = (color: string): React.CSSProperties => ({ fontSize: 12.5, color, fontFamily: "'JetBrains Mono',monospace" })

/** The marquee: capture the DVR clock vs real time and compute the defensible offset, then show
 *  the requested ranges corrected onto the DVR clock. Calls the real time-offset math. */
export function TimeOffsetScreen(p: TimeOffsetScreenProps) {
  const canCalc = Boolean(p.dvrDateTime && p.actualDateTime)
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Time Offset" onBack={p.onBack} onMenu={p.onMenu} />
      <div style={{ padding: 16 }}>
        <SectionCard title="DVR Time vs Actual Time">
          <DateTimeField label="DVR Date / Time" value={p.dvrDateTime} onChange={p.onChangeDvr} />
          <DateTimeField label="Actual Date / Time" value={p.actualDateTime} onChange={p.onChangeActual} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={p.onUseCurrentTime} style={{ flex: 1, textAlign: 'center', padding: 11, borderRadius: 10, border: '1px solid #2B8CC1', background: 'transparent', color: '#4BA3D4', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Use Current Time</button>
            <button type="button" onClick={p.onCalculate} disabled={!canCalc} style={{ flex: 1, textAlign: 'center', padding: 11, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: canCalc ? 'pointer' : 'not-allowed', opacity: canCalc ? 1 : 0.45 }}>Calculate</button>
          </div>
          {p.captureMethod === 'ocr' && (
            <div style={{ padding: 13, borderRadius: 10, border: '1px solid rgba(16,209,119,0.3)', background: 'rgba(16,209,119,0.06)', marginBottom: 12 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 1.5, color: '#10d177', textTransform: 'uppercase' }}>Atomic clock sync · OCR capture</div>
              <div style={{ fontSize: 10, color: '#5d7a9a', marginTop: 8 }}>Device → NTP → Atomic clock → UTC → SI second</div>
            </div>
          )}
          <button type="button" onClick={p.onCaptureOcr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 12, borderRadius: 10, border: '1px solid #2B8CC1', background: 'transparent', cursor: 'pointer', width: '100%' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4BA3D4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#4BA3D4' }}>Capture from DVR</span>
          </button>
        </SectionCard>

        {p.result && (
          <>
            <div style={{ borderRadius: 12, border: '1px solid rgba(43,140,193,0.3)', background: 'linear-gradient(180deg,rgba(26,45,68,0.88),rgba(19,34,54,0.95))', padding: 20, marginBottom: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#7a9fc4', marginBottom: 6 }}>Time Difference</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: '#f0f4f8', fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>{p.result.diff}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#4BA3D4' }}>{p.result.isCorrect ? 'DVR time is correct' : `DVR is ${p.result.direction} real time`}</div>
            </div>

            {p.correctedScopes.length > 0 && (
              <>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f4f8', marginBottom: 12 }}>Adjusted Time Ranges</div>
                {p.correctedScopes.map((sc, i) => (
                  <div key={sc.id} style={{ borderRadius: 12, border: '1px solid rgba(30,58,95,0.5)', background: 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))', padding: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8', marginBottom: 10 }}>Scope {i + 1}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#7a9fc4', marginBottom: 5 }}>Requested ({sc.reqLabel})</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={cell('#7a9fc4')}>Start</span><span style={cell('#f0f4f8')}>{sc.reqStart}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={cell('#7a9fc4')}>End</span><span style={cell('#f0f4f8')}>{sc.reqEnd}</span></div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#4BA3D4', marginBottom: 5 }}>Adjusted (DVR time)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={cell('#7a9fc4')}>Start</span><span style={{ ...cell('#4BA3D4'), fontWeight: 600 }}>{sc.adjStart}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={cell('#7a9fc4')}>End</span><span style={{ ...cell('#4BA3D4'), fontWeight: 600 }}>{sc.adjEnd}</span></div>
                    {sc.cameras && <div style={{ fontSize: 12, color: '#7a9fc4', fontStyle: 'italic', marginTop: 10 }}>Cameras: {sc.cameras}</div>}
                  </div>
                ))}
              </>
            )}

            <div onClick={p.onToggleDst} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px', cursor: 'pointer', marginTop: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: '#f0f4f8' }}>DVR Applies DST</span>
              <div style={{ width: 46, height: 28, borderRadius: 14, background: p.dvrAppliesDST ? '#2B8CC1' : '#1e3a5f', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 3, [p.dvrAppliesDST ? 'right' : 'left']: 3, width: 22, height: 22, borderRadius: 11, background: p.dvrAppliesDST ? '#fff' : '#7a9fc4' }} />
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 14 }}>
          <WizardNext label="Continue →" onClick={p.onNext} />
        </div>
      </div>
    </div>
  )
}
