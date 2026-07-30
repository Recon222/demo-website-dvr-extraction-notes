'use client'

import { DateTimeField, Field, SectionCard, WizardHeader } from '@/features/demo/ui/screens/_shared'
import { GLASS, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'

export interface CompletionSummary {
  occNumber: string
  location: string
  dvr: string
  offset: string | null
  scopes: number
  cameras: number
  export: string
}

export interface CompletionScreenProps {
  summary: CompletionSummary
  /** Location-scoped (R-1): true only when THIS location was completed — never the case. */
  isComplete: boolean
  /** False when no location is open (rail-jump with nothing selected): Complete & Save disables
   *  instead of silently no-opping. */
  canComplete: boolean
  dateTimeCompleted: string
  completedBy: string
  onChange(field: 'dateTimeCompleted' | 'completedBy', value: string): void
  onPreviewPdf(): void
  onPreviewTimeOffsetPdf(): void
  onComplete(): void
  /** Back from the confirmation to the review form — the court PDF is never a one-shot. */
  onReviewAgain(): void
  onBackToDashboard(): void
  onBackToCases(): void
  onBack(): void
  onMenu(): void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: '#7a9fc4' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#cdd9e6', textAlign: 'right', maxWidth: '62%' }}>{value}</span>
    </div>
  )
}

/** Review summary → real court-PDF preview + simulated biometric export gate → complete. */
export function CompletionScreen(p: CompletionScreenProps) {
  if (p.isComplete) {
    return (
      <div style={{ minHeight: 786, paddingBottom: 40 }}>
        <WizardHeader title="Completion & Review" onBack={p.onBack} onMenu={p.onMenu} />
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 60 }}>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: 'rgba(16,209,119,0.13)', border: '1px solid rgba(16,209,119,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#10d177" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f4f8', marginBottom: 10 }}>Location Complete</div>
          <div style={{ fontSize: 14, color: '#9fc0db', lineHeight: 1.5, maxWidth: 280, marginBottom: 30 }}>Saved and marked complete. This location is locked, with its PDFs and media archived.</div>
          <button type="button" onClick={p.onBackToDashboard} style={{ width: '100%', textAlign: 'center', padding: 14, ...glassBtnPrimary, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Back to Dashboard</button>
          <button type="button" onClick={p.onBackToCases} style={{ width: '100%', textAlign: 'center', padding: 14, ...glassBtnSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Return to Cases</button>
          <button type="button" onClick={p.onReviewAgain} style={{ width: '100%', textAlign: 'center', padding: 14, ...glassBtnSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Review / Export again</button>
        </div>
      </div>
    )
  }
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Completion & Review" onBack={p.onBack} onMenu={p.onMenu} />
      <div style={{ padding: 16 }}>
        <div style={{ borderRadius: 14, border: GLASS.borderAccent, background: 'linear-gradient(180deg,rgba(26,45,68,0.9),rgba(19,34,54,0.96))', padding: 18, marginBottom: 18, boxShadow: '0 0 22px rgba(43,140,193,0.12)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8', fontFamily: "'JetBrains Mono',monospace", marginBottom: 14 }}>OCC #{p.summary.occNumber}</div>
          <Row label="Location" value={p.summary.location} />
          <Row label="DVR" value={p.summary.dvr} />
          {p.summary.offset && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#7a9fc4' }}>Time offset</span>
              <span style={{ fontSize: 13, color: '#4BA3D4', fontWeight: 600 }}>{p.summary.offset}</span>
            </div>
          )}
          <Row label="Scopes / Cameras" value={`${p.summary.scopes} / ${p.summary.cameras}`} />
          <Row label="Export" value={p.summary.export} />
        </div>
        <SectionCard title="Completion Details">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>Date / Time Completed</div>
            <DateTimeField label="Date / Time Completed" value={p.dateTimeCompleted} onChange={(v) => p.onChange('dateTimeCompleted', v)} />
          </div>
          <Field label="Completed By" value={p.completedBy} onChange={(v) => p.onChange('completedBy', v)} placeholder="Analyst name" />
        </SectionCard>
        <button type="button" onClick={p.onPreviewPdf} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 13, borderRadius: 10, border: '1px solid #2B8CC1', background: 'transparent', color: '#4BA3D4', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10, width: '100%' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4BA3D4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
          Preview / Export PDF
        </button>
        {p.summary.offset && (
          <button type="button" onClick={p.onPreviewTimeOffsetPdf} style={{ width: '100%', textAlign: 'center', padding: 13, ...glassBtnSecondary, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Preview Time-Offset Calibration</button>
        )}
        <button
          type="button"
          onClick={p.onComplete}
          disabled={!p.canComplete}
          title={p.canComplete ? undefined : 'Open a location first'}
          style={{ width: '100%', textAlign: 'center', padding: 15, ...glassBtnPrimary, fontSize: 15, fontWeight: 700, cursor: p.canComplete ? 'pointer' : 'not-allowed', opacity: p.canComplete ? 1 : 0.45, boxShadow: p.canComplete ? '0 6px 18px rgba(37,128,173,0.35)' : 'none' }}
        >
          Complete &amp; Save
        </button>
      </div>
    </div>
  )
}
