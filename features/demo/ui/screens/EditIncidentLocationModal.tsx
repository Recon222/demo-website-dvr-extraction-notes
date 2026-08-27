'use client'

import { useState } from 'react'

import type { IncidentLocationValues } from '@/features/demo/engine/logic/incident-location'
import { IncidentLocationFields } from '@/features/demo/ui/inputs/IncidentLocationFields'
import type { reverseGeocode } from '@/features/demo/ui/inputs/reverse-geocode'
import { Banner } from '@/features/demo/ui/controls/Banner'
import { ModalActions, ModalShell } from '@/features/demo/ui/screens/_shared'
import { spacing } from '@/features/demo/ui/tokens/scale'

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

export function EditIncidentLocationModal({ values, onChange, onSubmit, onCancel, reverseGeocode }: EditIncidentLocationModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  return (
    <ModalShell title={EDIT_INCIDENT_COPY.title} closeAccessibilityLabel="Close incident location" onClose={onCancel}>
      {/* A71/U3.3. The phone's own line, `EditIncidentLocationModal.tsx:125`:
          `<Banner severity="error" message={submitError} style={styles.errorBanner} />`.
          `errorBanner` there is `{ marginBottom: Layout.spacing.md }` and its comment (`:182-184`)
          says "Layout only. The callout itself is the shared Banner; this was one of
          five byte-identical local recipes whose text was the saturated `colors.error` on a
          `colors.error + '20'` fill." The demo's copy of that recipe was the same shape
          (`rgba(255,71,87,0.12)` fill, `#ff8a94` text) and is gone with it. 14 -> 16 is the
          phone's `spacing.md`, not a tidy. */}
      {submitError && (
        <Banner
          severity="error"
          message={submitError}
          testId="edit-incident-error"
          style={{ marginBottom: spacing.md }}
        />
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
