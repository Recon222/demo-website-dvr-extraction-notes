'use client'

import { useState } from 'react'
import { Accordion, Field, ModalActions, ModalShell } from '@/features/demo/ui/screens/_shared'
import { AddressAutocomplete } from '@/features/demo/ui/inputs/AddressAutocomplete'
import { parseCoordinate, formatCoordinate, type CoordKind } from '@/features/demo/engine/logic/coordinates'

export interface NewCaseFields {
  caseNumber: string
  displayName: string
  unit: string
  oicName: string
  oicBadge: string
  vcName: string
  vcBadge: string
  incidentBusinessName: string
  incidentStreetAddress: string
  incidentCity: string
  /** Manual coordinate entry (string-form for the inputs; parsed + range-checked at submit).
   *  The incident scene can be off-grid (no street address), so coords are hand-enterable. */
  incidentLatitude: string
  incidentLongitude: string
  /** '' | 'geocoded' (filled by an address pick) | 'manual' (typed by hand). */
  incidentCoordinateSource: string
  notes: string
}

export interface NewCaseModalProps {
  form: NewCaseFields
  onChange(field: keyof NewCaseFields, value: string): void
  onSubmit(): void
  onCancel(): void
}

const sectionLabel = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: '#7a9fc4',
  margin: '2px 0 10px',
} as const

const coordInput = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid #1e3a5f',
  background: '#0d1b2a',
  color: '#f0f4f8',
  fontSize: 15,
  padding: '11px 12px',
  outline: 'none',
} as const

/** A single manual coordinate input with on-blur strict-parse + range validation (engine helper). */
function CoordinateField({ label, kind, value, onChange }: { label: string; kind: CoordKind; value: string; onChange(v: string): void }) {
  const [error, setError] = useState<string | undefined>(undefined)
  const validate = () => {
    if (value.trim() === '') {
      setError(undefined)
      return
    }
    const r = parseCoordinate(value, kind)
    setError(r.ok ? undefined : r.error)
  }
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={validate}
        placeholder={kind === 'lat' ? 'e.g., 43.65' : 'e.g., -79.38'}
        aria-label={label}
        inputMode="text"
        autoComplete="off"
        style={error ? { ...coordInput, borderColor: '#ff4757' } : coordInput}
      />
      {error && <div style={{ fontSize: 12, color: '#ff6b78', marginTop: 5 }}>{error}</div>}
    </div>
  )
}

export function NewCaseModal({ form, onChange, onSubmit, onCancel }: NewCaseModalProps) {
  const latR = parseCoordinate(form.incidentLatitude, 'lat')
  const lngR = parseCoordinate(form.incidentLongitude, 'lng')
  const showChip = latR.ok && lngR.ok
  const sourceLabel = form.incidentCoordinateSource === 'geocoded' ? 'Geocoded' : 'Manual'
  return (
    <ModalShell title="New Case" onClose={onCancel}>
      <Field label="Case Number" required value={form.caseNumber} onChange={(v) => onChange('caseNumber', v)} placeholder="OCC2025-001" hint="Locked once the case is created — it names the evidence folder." />
      <Field label="Display Name" value={form.displayName} onChange={(v) => onChange('displayName', v)} placeholder="Friendly name" />
      <Field label="Unit" required value={form.unit} onChange={(v) => onChange('unit', v)} placeholder="Investigation unit" />

      <Accordion title="Officer in Charge">
        <Field label="OIC Name" value={form.oicName} onChange={(v) => onChange('oicName', v)} placeholder="Officer in charge" />
        <Field label="OIC Badge" value={form.oicBadge} onChange={(v) => onChange('oicBadge', v)} placeholder="Badge number" />
      </Accordion>

      <Accordion title="Video / Canvas Coordinator">
        <Field label="Coordinator Name" value={form.vcName} onChange={(v) => onChange('vcName', v)} placeholder="Video coordinator" />
        <Field label="Coordinator Badge" value={form.vcBadge} onChange={(v) => onChange('vcBadge', v)} placeholder="Badge number" />
      </Accordion>

      <div style={sectionLabel}>Incident Location</div>
      <Field label="Business / Scene Name" value={form.incidentBusinessName} onChange={(v) => onChange('incidentBusinessName', v)} placeholder="Where the occurrence happened" />
      <AddressAutocomplete
        label="Street Address"
        value={form.incidentStreetAddress}
        onChange={(v) => onChange('incidentStreetAddress', v)}
        onPick={(p) => {
          onChange('incidentStreetAddress', p.streetAddress)
          onChange('incidentCity', p.city)
          if (p.coordinates) {
            onChange('incidentLatitude', String(p.coordinates.lat))
            onChange('incidentLongitude', String(p.coordinates.lng))
            onChange('incidentCoordinateSource', 'geocoded')
          }
        }}
        placeholder="Start typing an address…"
      />
      <Field label="City" value={form.incidentCity} onChange={(v) => onChange('incidentCity', v)} placeholder="City" />

      {/* Manual coordinate entry — geocode-filled by the address pick above, or typed by hand
          (the scene can be off-grid). Validated on blur; recovery locations have no such fields. */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
        <CoordinateField
          label="Latitude"
          kind="lat"
          value={form.incidentLatitude}
          onChange={(v) => {
            onChange('incidentLatitude', v)
            onChange('incidentCoordinateSource', 'manual')
          }}
        />
        <CoordinateField
          label="Longitude"
          kind="lng"
          value={form.incidentLongitude}
          onChange={(v) => {
            onChange('incidentLongitude', v)
            onChange('incidentCoordinateSource', 'manual')
          }}
        />
      </div>
      {showChip && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9fc4e6', margin: '6px 0 14px' }}>
          <span aria-hidden="true">📍</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCoordinate(latR.value, lngR.value)}</span>
          <span style={{ color: '#7a9fc4' }}>· {sourceLabel}</span>
        </div>
      )}

      <Field label="Notes" multiline value={form.notes} onChange={(v) => onChange('notes', v)} placeholder="Case notes…" />

      <div style={{ marginTop: 4 }}>
        <ModalActions submitLabel="Create Case" onCancel={onCancel} onSubmit={onSubmit} />
      </div>
    </ModalShell>
  )
}
