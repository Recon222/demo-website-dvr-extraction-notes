'use client'

import type { FormFieldId } from '@/features/demo/engine/types'
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
  /** Messages from the last blocked gate run (`finalSubmissionSchema`). Empty = no card.
   *  The bridge owns the state and clears it as soon as the data becomes valid, exactly like
   *  the phone's auto-clear effect (`app/(form)/completion.tsx:115-125`). */
  validationErrors: readonly string[]
  dateTimeCompleted: string
  completedBy: string
  onChange(field: 'dateTimeCompleted' | 'completedBy', value: string): void
  /** Which of this screen's fields the visitor's form profile keeps (P7.3). */
  isFieldVisible(id: FormFieldId): boolean
  onPreviewPdf(): void
  onPreviewTimeOffsetPdf(): void
  /** Opens the export scope chooser (phone `setShowExportSheet(true)`, completion.tsx:554). */
  onExportZip(): void
  /** Phone: `disabled={isExporting || !currentLocationId}` (completion.tsx:557). Split from
   *  `canComplete` because the two disable for different reasons and say so differently. */
  canExport: boolean
  /** Phone: the label flips to `Exporting...` while a run is in flight (completion.tsx:562). */
  isExporting: boolean
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
        {/* One `padding` SHORTHAND, not `padding: 16` + a `paddingTop: 60` longhand. React
            reuses this node for the review form's `{ padding: 16 }` div at :82, so on the
            "Review / Export again" transition it removed `paddingTop` while `padding` stayed
            unchanged and never reasserted — the form rendered with NO top padding, and said so
            only in a console error nobody read (lit-edge ruling §4.3; caught by the repo-wide
            guard in `vitest.setup.ts`). Same 60/16/16 box. */}
        <div style={{ padding: '60px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
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
        {/* The phone's "Required Fields Missing" card, same position (above the summary) and
            same shape: title, then one `- message` line per rule that failed
            (ui-mapping 08 → Completion "Content (render order)" #2; completion.tsx:468-479). */}
        {p.validationErrors.length > 0 && (
          <div role="alert" style={{ borderRadius: 12, border: GLASS.borderError, background: 'rgba(255,71,87,0.06)', padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ff6b7a', marginBottom: 8 }}>Required Fields Missing</div>
            {p.validationErrors.map((err) => (
              <div key={err} style={{ fontSize: 13, color: '#ff9aa5', marginBottom: 4 }}>- {err}</div>
            ))}
          </div>
        )}
        {/* A36/A56 (U1.3) - the `0.9/0.96` gradient was a near-miss of the `elevated` tier
            (deferral §31 names it); `GLASS.gradientPanel` IS that tier, and `GLASS.borderAccent`
            beside it is the same tier's border. SEAM(U6.4b): the `techGlow` boxShadow on this
            line is M1(a)'s to REMOVE and is deliberately untouched here - one line, two
            packages. U1.3 lands first; do not revert the gradient when the glow goes. */}
        <div style={{ borderRadius: 14, border: GLASS.borderAccent, background: GLASS.gradientPanel, padding: 18, marginBottom: 18, boxShadow: '0 0 22px rgba(43,140,193,0.12)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8', fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace", marginBottom: 14 }}>OCC #{p.summary.occNumber}</div>
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
        {/* The card goes when both its entries do — the summary above and the export actions
            below are chrome, not fields, and neither is switchable. Completion is a must-stay
            screen precisely so those actions stay reachable. */}
        {(p.isFieldVisible('completion.dateTimeCompleted') || p.isFieldVisible('completion.completedBy')) && (
        <SectionCard title="Completion Details">
          {p.isFieldVisible('completion.dateTimeCompleted') && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>Date / Time Completed</div>
              <DateTimeField label="Date / Time Completed" value={p.dateTimeCompleted} onChange={(v) => p.onChange('dateTimeCompleted', v)} />
            </div>
          )}
          {p.isFieldVisible('completion.completedBy') && (
            <Field label="Completed By" value={p.completedBy} onChange={(v) => p.onChange('completedBy', v)} placeholder="Analyst name" />
          )}
        </SectionCard>
        )}
        <button type="button" onClick={p.onPreviewPdf} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 13, borderRadius: 10, border: '1px solid #2B8CC1', background: 'transparent', color: '#4BA3D4', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10, width: '100%' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4BA3D4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
          Preview / Export PDF
        </button>
        {p.summary.offset && (
          <button type="button" onClick={p.onPreviewTimeOffsetPdf} style={{ width: '100%', textAlign: 'center', padding: 13, ...glassBtnSecondary, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Preview Time-Offset Calibration</button>
        )}
        {/* Phone order (FormActions, completion.tsx:504-572): Preview/Export PDF → the
            conditional Time-Offset preview → Export Zip → Complete & Save. */}
        <button
          type="button"
          onClick={p.onExportZip}
          disabled={!p.canExport}
          aria-label="Export options"
          title={p.canExport ? 'Choose between exporting this location or the full case' : 'Open a location first'}
          style={{ width: '100%', textAlign: 'center', padding: 13, ...glassBtnSecondary, fontSize: 14, fontWeight: 600, cursor: p.canExport ? 'pointer' : 'not-allowed', opacity: p.canExport ? 1 : 0.45, marginBottom: 10 }}
        >
          {p.isExporting ? 'Exporting...' : 'Export Zip'}
        </button>
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
