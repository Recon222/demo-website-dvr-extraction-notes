'use client'

import { AddRowButton, DateTimeField, WizardHeader, WizardNext } from '@/components/demo/screens/_shared'

export interface ArrivalRow {
  id: string
  arrival: string
  departure: string
}

export interface ArrivalDepartureScreenProps {
  visits: ArrivalRow[]
  onChange(index: number, patch: Partial<ArrivalRow>): void
  onAdd(): void
  onRemove(index: number): void
  onNext(): void
  onBack(): void
  onMenu(): void
}

/** On-site visit arrival/departure pairs (optional chain-of-custody detail). */
export function ArrivalDepartureScreen({ visits, onChange, onAdd, onRemove, onNext, onBack, onMenu }: ArrivalDepartureScreenProps) {
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Arrival / Departure" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        {visits.length === 0 && <div style={{ fontSize: 13, color: '#7a9fc4', fontStyle: 'italic', textAlign: 'center', padding: '8px 0 14px' }}>No visits recorded — add one if you attended the site.</div>}
        {visits.map((a, i) => (
          <div key={a.id} style={{ borderRadius: 12, border: '1px solid rgba(30,58,95,0.5)', background: 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))', padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>Visit {i + 1}</div>
              <button type="button" onClick={() => onRemove(i)} style={{ cursor: 'pointer', color: '#ff7a85', fontSize: 13, background: 'transparent', border: 'none' }}>Remove</button>
            </div>
            <DateTimeField label="Arrival" value={a.arrival} onChange={(v) => onChange(i, { arrival: v })} />
            <DateTimeField label="Departure" value={a.departure} onChange={(v) => onChange(i, { departure: v })} />
          </div>
        ))}
        <AddRowButton label="+ Add Visit" onClick={onAdd} />
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
