'use client'

import type { ScopeEntry } from '@/lib/demo/types'
import { DateTimeField, Field, WizardHeader, WizardNext } from '@/components/demo/screens/_shared'

export interface ExtractedScopeScreenProps {
  scopes: ScopeEntry[]
  onChange(index: number, patch: Partial<ScopeEntry>): void
  onRemove(index: number): void
  onRegenerate(): void
  onNext(): void
  onBack(): void
  onMenu(): void
}

/** Auto-generated DVR-time extraction windows (from the offset). Editable; regenerate from offset. */
export function ExtractedScopeScreen({ scopes, onChange, onRemove, onRegenerate, onNext, onBack, onMenu }: ExtractedScopeScreenProps) {
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Extracted Scope" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 13, color: '#9fc0db', lineHeight: 1.5, marginBottom: 14, padding: 12, borderRadius: 10, border: '1px solid rgba(43,140,193,0.25)', background: 'rgba(43,140,193,0.07)' }}>
          Auto-generated from the time-offset calculation — these are the windows pulled off the DVR, in <strong style={{ color: '#cfe6f5' }}>DVR-clock time</strong>. Edit if you rounded the boundaries.
        </div>
        {scopes.length === 0 && (
          <div style={{ fontSize: 13, color: '#7a9fc4', fontStyle: 'italic', textAlign: 'center', padding: '14px 0' }}>Calculate the time offset first, then regenerate.</div>
        )}
        {scopes.map((ex, i) => (
          <div key={ex.id} style={{ borderRadius: 12, border: '1px solid rgba(30,58,95,0.5)', background: 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))', padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>Extracted {i + 1}</div>
              {scopes.length > 1 && (
                <button type="button" onClick={() => onRemove(i)} style={{ cursor: 'pointer', color: '#ff7a85', fontSize: 13, background: 'transparent', border: 'none' }}>Remove</button>
              )}
            </div>
            <DateTimeField label="Start (DVR time)" value={ex.startDateTime} onChange={(v) => onChange(i, { startDateTime: v })} />
            <DateTimeField label="End (DVR time)" value={ex.endDateTime} onChange={(v) => onChange(i, { endDateTime: v })} />
            <Field label="Cameras" value={ex.cameras} onChange={(v) => onChange(i, { cameras: v })} placeholder="Cameras exported" />
          </div>
        ))}
        <button type="button" onClick={onRegenerate} style={{ width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>Regenerate from offset</button>
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
