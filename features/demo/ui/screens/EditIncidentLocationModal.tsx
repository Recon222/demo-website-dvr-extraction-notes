'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'

import type { IncidentLocationValues } from '@/features/demo/engine/logic/incident-location'
import { IncidentLocationFields } from '@/features/demo/ui/inputs/IncidentLocationFields'
import type { reverseGeocode } from '@/features/demo/ui/inputs/reverse-geocode'
import { ModalActions, ModalShell } from '@/features/demo/ui/screens/_shared'

/**
 * Edit Incident Location — the demo's port of the phone's `EditIncidentLocationModal`
 * (`src/features/case-management/components/EditIncidentLocationModal.tsx`, ui-mapping 03:269-300
 * and 11:165-207). Matrix row 23; reached only from the map's incident detail card (row 22).
 *
 * Deliberately narrow, for the phone's stated reason (phone header comment, :4-13): editing the
 * whole case — case number, OIC/VC, notes — does not belong on a map pin. This modal emits ONLY
 * the incident fields, so the save leaves the rest of the case untouched.
 *
 * Content order is the phone's (ui-mapping 11:177-180): error banner (conditional) →
 * `IncidentLocationFields` → Cancel / Save Changes.
 *
 * ── Seed-once ───────────────────────────────────────────────────────────────────────────────
 * The phone seeds with `useState(() => caseToIncidentValues(initialCase))` and relies on the
 * parent mounting a fresh instance per edit. The demo puts the same seed one level up, in the
 * store bridge: `DemoExperience` calls `caseToIncidentValues` when it opens this modal and owns
 * the working values, exactly as it does for the New Case / New Location forms. Same semantics
 * (one seed per open, edits never leak back into the case until Save), and it keeps the
 * store-bridge rule intact — this component never touches the store.
 *
 * ── The banner has ONE trigger here, not the phone's two ────────────────────────────────────
 * The phone's banner shows either a reverse-geocode failure OR a save failure — its save is an
 * async SQLite write that can throw (phone :78-93). The demo's save is a synchronous in-memory
 * store write with no failure mode, so inventing a save-error arm would be inventing an error.
 * The reverse-geocode arm — the one the phone's own fact-check flagged as previously
 * undocumented (ui-mapping 03:283/360) — is wired.
 */

export interface EditIncidentLocationModalProps {
  values: IncidentLocationValues
  onChange(updates: Partial<IncidentLocationValues>): void
  onSubmit(): void
  onCancel(): void
  /** Test seam, forwarded to `IncidentLocationFields`. */
  reverseGeocode?: typeof reverseGeocode
}

/** Phone copy, verbatim (EditIncidentLocationModal.tsx:113/148/158, ui-mapping 11:175/188-190). */
export const EDIT_INCIDENT_COPY = {
  title: 'Edit Incident Location',
  save: 'Save Changes',
  cancel: 'Cancel',
} as const

const banner: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #ff4757',
  background: 'rgba(255,71,87,0.12)',
  color: '#ff8a94',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 14,
}

export function EditIncidentLocationModal({ values, onChange, onSubmit, onCancel, reverseGeocode }: EditIncidentLocationModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  return (
    <ModalShell title={EDIT_INCIDENT_COPY.title} closeAccessibilityLabel="Close incident location" onClose={onCancel}>
      {submitError && (
        <div role="alert" data-testid="edit-incident-error" style={banner}>
          {submitError}
        </div>
      )}

      <IncidentLocationFields
        values={values}
        onChange={onChange}
        onReverseGeocodeError={setSubmitError}
        reverseGeocode={reverseGeocode}
      />

      <div style={{ marginTop: 18 }}>
        <ModalActions cancelLabel={EDIT_INCIDENT_COPY.cancel} submitLabel={EDIT_INCIDENT_COPY.save} onCancel={onCancel} onSubmit={onSubmit} />
      </div>
    </ModalShell>
  )
}
