'use client'

import { useCallback, useState } from 'react'
import { Accordion, Field, ModalActions, ModalShell } from '@/features/demo/ui/screens/_shared'
import { AlertDialog } from '@/features/demo/ui/controls/AlertDialog'
import { AddressAutocomplete } from '@/features/demo/ui/inputs/AddressAutocomplete'
import { parseCoordinate, formatCoordinate, type CoordKind } from '@/features/demo/engine/logic/coordinates'
import { DuplicateCaseNumberError } from '@/features/demo/engine/logic/case-number'
import type { NewCaseFields } from '@/features/demo/ui/screens/caseFormData'
import type { DemoCase } from '@/features/demo/engine/types'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { fieldInputStyle } from '@/features/demo/ui/tokens/field-input'

// The form shape and its store mappers live in caseFormData.ts (one round trip, one file);
// re-exported here so the modal stays the import site its consumers already use.
export type { NewCaseFields }

interface NewCaseModalBaseProps {
  form: NewCaseFields
  /** Field-typed, not `(field, value: string)` (review R-13): the provenance field is a union,
   *  and a keyed setter that accepts any `string` would let a typo through to a persisted,
   *  PDF-rendered value. Generic so each key checks against its OWN type. */
  onChange<K extends keyof NewCaseFields>(field: K, value: NewCaseFields[K]): void
  onSubmit(): void
  onCancel(): void
}

/**
 * Discriminated on `mode`, exactly as the phone types it (`NewCaseModal.tsx:51-66`):
 *   - create (default): "New Case" / "Create Case", editable number, confirmation on submit.
 *     `existingCase` is forbidden.
 *   - edit: "Edit Case" / "Save Changes", number read-only, no confirmation (there is
 *     nothing left to warn about — the one immutable field is already locked).
 *
 * The union makes `{ mode: 'edit' }` without a case a COMPILE error, so the invariant lives
 * at the type boundary rather than at each call site. `existingCase` is not decoration: the
 * locked number is read from the stored case, not from the editable form copy, so the value
 * on screen is the one that actually owns the evidence folder.
 */
export type NewCaseModalProps =
  | (NewCaseModalBaseProps & { mode?: 'create'; existingCase?: never })
  | (NewCaseModalBaseProps & { mode: 'edit'; existingCase: DemoCase })

const sectionLabel = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: '#7a9fc4',
  margin: '2px 0 10px',
} as const

/** A single manual coordinate input with on-blur strict-parse + range validation (engine helper). */
function CoordinateField({ label, kind, value, onChange }: { label: string; kind: CoordKind; value: string; onChange(v: string): void }) {
  const [error, setError] = useState<string | undefined>(undefined)
  const [focused, setFocused] = useState(false)
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
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          validate()
        }}
        placeholder={kind === 'lat' ? 'e.g., 43.65' : 'e.g., -79.38'}
        aria-label={label}
        inputMode="text"
        autoComplete="off"
        style={fieldInputStyle({ error: Boolean(error), focused })}
      />
      {error && <div style={{ fontSize: 12, color: '#ff6b78', marginTop: 5 }}>{error}</div>}
    </div>
  )
}

/** The two required fields, and the phone's verbatim messages for them
 *  (`NewCaseModal.tsx:135-150`). Unit is the ONLY required metadata field — OIC and
 *  Video/Canvas Coordinator are optional on the phone and stay optional here. */
interface RequiredFieldErrors {
  caseNumber?: string
  unit?: string
}

function validateRequired(caseNumber: string, unit: string): RequiredFieldErrors {
  const errors: RequiredFieldErrors = {}
  if (!caseNumber.trim()) errors.caseNumber = 'Case number is required'
  if (!unit.trim()) errors.unit = 'Unit is required'
  return errors
}

export function NewCaseModal({ form, onChange, onSubmit, onCancel, mode = 'create', existingCase }: NewCaseModalProps) {
  const isEdit = mode === 'edit'
  // In edit mode the stored case owns the number — the form's copy is seeded from it and then
  // ignored, which is what makes "immutable" true rather than merely un-typeable.
  const caseNumber = existingCase ? existingCase.caseNumber : form.caseNumber
  // Set only by a blocked submit attempt, and cleared field-by-field as the visitor types —
  // so the modal never opens shouting at an untouched form (the phone's `errors` state has
  // the same lifecycle: written by validateForm, never on mount).
  const [errors, setErrors] = useState<RequiredFieldErrors>({})
  const latR = parseCoordinate(form.incidentLatitude, 'lat')
  const lngR = parseCoordinate(form.incidentLongitude, 'lng')
  const showChip = latR.ok && lngR.ok
  const sourceLabel = form.incidentCoordinateSource === 'geocoded' ? 'Geocoded' : 'Manual'

  const blocked = Object.keys(validateRequired(caseNumber, form.unit)).length > 0

  // The immutable-case-number confirmation (phone `NewCaseModal.tsx:237-249`), held open
  // until the visitor answers. Stable identity for the dismiss handler: AlertDialog keys
  // its Escape listener on `onDismiss`.
  const [confirming, setConfirming] = useState(false)
  const cancelConfirm = useCallback(() => setConfirming(false), [])

  // The submit-failure banner (phone `submitError`, rendered first in the content column).
  const [submitError, setSubmitError] = useState<string | null>(null)

  /**
   * The phone's `performSubmit` catch (`NewCaseModal.tsx:182-195`): a
   * `DuplicateCaseNumberError` gets the typed message plus a recovery hint, anything else
   * gets its own message or the `Failed to create case` fallback. The demo's `onSubmit` is
   * synchronous but throws the same way — the store refuses at the write boundary — so the
   * branch is the phone's, not an approximation of it. The modal deliberately stays OPEN on
   * failure: the form the visitor typed is still there to fix.
   */
  const performSubmit = () => {
    try {
      onSubmit()
    } catch (err) {
      setSubmitError(
        err instanceof DuplicateCaseNumberError
          ? `${err.message}. Open the existing case or enter a different number.`
          : err instanceof Error
            ? err.message
            : 'Failed to create case',
      )
    }
  }

  /** Mirrors the phone's `handleSubmit` → `validateForm` gate: a failed validation sets the
   *  field errors and returns without submitting. On success, create mode raises the
   *  confirmation first (only its "Create Case" arm performs the submit); edit mode saves
   *  directly — the case number is already locked, so there is nothing to confirm. */
  const handleSubmit = () => {
    setSubmitError(null)
    const found = validateRequired(caseNumber, form.unit)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    if (isEdit) {
      performSubmit()
      return
    }
    setConfirming(true)
  }

  const confirmSubmit = () => {
    setConfirming(false)
    performSubmit()
  }

  // While the alert is up it is the ONLY answerable surface (its scrim is inert by design),
  // so the sheet behind it must not take a dismissal either: without this, Escape would be
  // heard by BOTH document listeners and throw away the whole form on the way to cancelling
  // a confirmation. The X and the scrim are already covered — they sit under the alert.
  const handleShellClose = useCallback(() => {
    if (!confirming) onCancel()
  }, [confirming, onCancel])

  /** Typing into a field that is currently flagged clears its message immediately.
   *  Generic per key, like the prop it forwards to — a `(field, value: string)` wrapper would
   *  have re-opened R-13 through the back door, since it accepts any string for any key
   *  (TD-N1). */
  const change = <K extends keyof NewCaseFields>(field: K, value: NewCaseFields[K]) => {
    // Bound to a local so the comparison narrows a `keyof NewCaseFields` rather than the type
    // PARAMETER `K`, which TS cannot narrow — the clearing branch only concerns the two gated
    // fields, so it does not need the generic.
    const key: keyof NewCaseFields = field
    if (key === 'caseNumber' || key === 'unit') {
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }
    onChange(field, value)
  }

  return (
    <ModalShell title={isEdit ? 'Edit Case' : 'New Case'} onClose={handleShellClose}>
      {/* Render order #1 on the phone: the submit-failure banner sits above every field. */}
      {submitError && (
        <div
          role="alert"
          style={{ borderRadius: 10, border: GLASS.borderError, background: 'rgba(255,71,87,0.08)', padding: '10px 12px', marginBottom: 14, fontSize: 13, fontWeight: 500, color: '#ff6b78' }}
        >
          {submitError}
        </div>
      )}
      {/* Read-only in edit mode, and read FROM the case: the number names the evidence
          folder, which is fixed at creation (phone `NewCaseModal.tsx:296-316`). */}
      <Field
        label="Case Number"
        required
        readOnly={isEdit}
        value={caseNumber}
        onChange={(v) => change('caseNumber', v)}
        placeholder="OCC2025-001"
        hint={isEdit ? 'Case number cannot be changed' : 'Locked once the case is created — it names the evidence folder.'}
        error={errors.caseNumber}
      />
      <Field label="Display Name" value={form.displayName} onChange={(v) => onChange('displayName', v)} placeholder="Friendly name" />
      <Field label="Unit" required value={form.unit} onChange={(v) => change('unit', v)} placeholder="Investigation unit" error={errors.unit} />

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
        {/* No `submitDescribedBy`, deliberately — do not "fix" this into a swallow or a reason
            region (review appendix, WEB-7). §50a/§56d's whole design here is that the click
            REACHES `handleSubmit`, which then writes the phone's verbatim per-field messages
            ("Case number is required" / "Unit is required") into the fields' own `role="alert"`
            nodes. The reason is reachable by activation rather than pre-stated, which is what
            makes that copy live instead of dead. The New Location card is the other shape — its
            reason is on screen before the press — and the two are meant to differ. */}
        <ModalActions submitLabel={isEdit ? 'Save Changes' : 'Create Case'} onCancel={onCancel} onSubmit={handleSubmit} submitBlocked={blocked} />
      </div>

      {/* The phone's create-mode confirmation (`NewCaseModal.tsx:237-249`) on the shared
          blocking-dialog primitive: title, message and both button labels verbatim, `Cancel`
          carrying the phone's `style: 'cancel'`, Escape dismissing to the safe default. The
          number is quoted in its TRIMMED form — the same value the case is created with. */}
      {confirming && (
        <AlertDialog
          title="Confirm Case Number"
          message={`The case number "${caseNumber.trim()}" can't be changed after the case is created. Everything else can be edited later.`}
          actions={[
            { label: 'Cancel', style: 'cancel', onPress: cancelConfirm },
            { label: 'Create Case', onPress: confirmSubmit },
          ]}
          onDismiss={cancelConfirm}
        />
      )}
    </ModalShell>
  )
}
