'use client'

import type { ScopeEntry } from '@/lib/demo/types'
import { AddRowButton, DateTimeField, Field, WizardHeader, WizardNext } from '@/components/demo/screens/_shared'

export interface RequestedScopeScreenProps {
  scopes: ScopeEntry[]
  onChange(index: number, patch: Partial<ScopeEntry>): void
  onAdd(): void
  onRemove(index: number): void
  onNext(): void
  onBack(): void
  onMenu(): void
}

function TimeTypeButton({ label, active, onClick }: { label: string; active: boolean; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 8, border: active ? 'none' : '1px solid #2a4a6f', background: active ? '#2B8CC1' : 'transparent', color: active ? '#fff' : '#99badd', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
    >
      {label}
    </button>
  )
}

/** Requested time ranges (real- or DVR-time) + cameras — the input the time-offset math acts on. */
export function RequestedScopeScreen({ scopes, onChange, onAdd, onRemove, onNext, onBack, onMenu }: RequestedScopeScreenProps) {
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Requested Scope" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        {scopes.map((sc, i) => (
          <div key={sc.id} style={{ borderRadius: 12, border: '1px solid rgba(30,58,95,0.5)', background: 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))', padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>Scope {i + 1}</div>
              {scopes.length > 1 && (
                <button type="button" onClick={() => onRemove(i)} style={{ cursor: 'pointer', color: '#ff7a85', fontSize: 13, background: 'transparent', border: 'none' }}>Remove</button>
              )}
            </div>
            <DateTimeField label="Start Date / Time" value={sc.startDateTime} onChange={(v) => onChange(i, { startDateTime: v })} />
            <DateTimeField label="End Date / Time" value={sc.endDateTime} onChange={(v) => onChange(i, { endDateTime: v })} />
            <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>Time Entry Type</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <TimeTypeButton label="Real Time" active={sc.isActualTime} onClick={() => onChange(i, { isActualTime: true })} />
              <TimeTypeButton label="DVR Time" active={!sc.isActualTime} onClick={() => onChange(i, { isActualTime: false })} />
            </div>
            <Field label="Cameras" value={sc.cameras} onChange={(v) => onChange(i, { cameras: v })} placeholder="e.g., 3, 4, 7" />
          </div>
        ))}
        <AddRowButton label="+ Add Scope" onClick={onAdd} />
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
