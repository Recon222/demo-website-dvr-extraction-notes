'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Field, ModalShell } from '@/features/demo/ui/screens/_shared'
import { GLASS, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'
import { isLocationNameTaken } from '@/features/demo/engine/logic/location-name'
import type { DuplicateMode } from '@/features/demo/engine/types'

/**
 * The location ACTION CHOOSER (P3.5, matrix row 14) — port of the phone's
 * `DuplicateLocationModal` (`src/features/case-management/components/DuplicateLocationModal.tsx`,
 * documented in ui-mapping 02 + 11). Despite the name it is the general per-location actions
 * surface: two duplicate modes, two new-address modes, and the two location exports.
 *
 * Presentational: name in / intent out. The suggested name is pre-deduped by the bridge
 * (`generateCopyName`), so the live collision check below normally fires only when the visitor
 * edits the name INTO a collision — exactly the phone's note.
 *
 * Deliberate phone behaviours kept:
 * - No autofocus. The phone's comment says why: this is a chooser first, four of the six
 *   actions ignore the name field, and focusing it raised the keyboard over the buttons.
 * - The new-address and export sections are conditional on their handlers (the export pair
 *   needs BOTH, like the phone), even though the demo's single caller always supplies all
 *   three — the conditional IS the component's contract.
 * - Only the two duplicate buttons are gated by the name; the other four never are.
 */

/** Phone copy, verbatim (`DuplicateLocationModal.tsx:88`). */
export const NAME_TAKEN_ERROR = 'A location with this name already exists in this case'

export interface DuplicateLocationModalProps {
  /** Current value of the Location Name field — seeded by the bridge with `generateCopyName`. */
  name: string
  onChangeName(value: string): void
  /** Sibling location names in this case (the source included), for the live collision check. */
  existingNames: readonly string[]
  onClose(): void
  onDuplicate(name: string, mode: DuplicateMode): void
  /** Omit to hide the "Copy info to a new address" section (phone: optional prop). */
  onNewAddress?(mode: DuplicateMode): void
  /** The export section renders only when BOTH handlers are supplied (phone parity). */
  onExportZip?(): void
  onExportGeoJSON?(): void
}

const actionButton: CSSProperties = {
  width: '100%',
  textAlign: 'center',
  padding: 13,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
}

const sectionCaption: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#99badd',
  marginBottom: 10,
}

/** One stacked chooser action. `disabled` dims and blocks — the phone's `Button disabled`. */
function ActionButton({
  label,
  variant = 'primary',
  disabled,
  onClick,
}: {
  label: string
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  onClick(): void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...actionButton,
        ...(variant === 'primary' ? glassBtnPrimary : glassBtnSecondary),
        ...(disabled ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
        marginBottom: 10,
      }}
    >
      {label}
    </button>
  )
}

/** A separated action group with its caption (the phone's `newAddressSection`). */
function ActionSection({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 8, paddingTop: 16, borderTop: GLASS.border }}>
      <div style={sectionCaption}>{caption}</div>
      {children}
    </div>
  )
}

export function DuplicateLocationModal({
  name,
  onChangeName,
  existingNames,
  onClose,
  onDuplicate,
  onNewAddress,
  onExportZip,
  onExportGeoJSON,
}: DuplicateLocationModalProps) {
  const isNameEmpty = !name.trim()
  const isNameTaken = !isNameEmpty && isLocationNameTaken(name, existingNames)
  const isSubmitDisabled = isNameEmpty || isNameTaken

  // Guarded here too, not just by the `disabled` attribute: the commit path is what must
  // refuse a blank/colliding name (the phone's `handleDuplicate` does the same).
  const duplicate = (mode: DuplicateMode) => {
    if (isSubmitDisabled) return
    onDuplicate(name.trim(), mode)
  }

  return (
    <ModalShell title="Duplicate Location" onClose={onClose}>
      <div style={{ fontSize: 13, color: '#99badd', marginTop: -4, marginBottom: 16 }}>
        Enter a name for the duplicate location.
      </div>

      <Field
        label="Location Name"
        required
        value={name}
        onChange={onChangeName}
        placeholder="e.g., Main Store - Copy"
        error={isNameTaken ? NAME_TAKEN_ERROR : undefined}
      />

      <div style={{ paddingTop: 4 }}>
        <ActionButton label="Duplicate Location" disabled={isSubmitDisabled} onClick={() => duplicate('submission-only')} />
        <ActionButton
          label="Duplicate Location with Scopes"
          disabled={isSubmitDisabled}
          onClick={() => duplicate('with-scopes')}
        />

        {onNewAddress && (
          <ActionSection caption="Copy info to a new address">
            {/* These two ignore the name field entirely — the name is chosen on the
                create-location card that opens next — so they are never disabled by it. */}
            <ActionButton label="New Location w/ Sub Info" onClick={() => onNewAddress('submission-only')} />
            <ActionButton label="New Location w/ Sub Info + Scopes" onClick={() => onNewAddress('with-scopes')} />
          </ActionSection>
        )}

        {onExportZip && onExportGeoJSON && (
          <ActionSection caption="Export this location">
            <ActionButton label="Export ZIP" onClick={onExportZip} />
            <ActionButton label="Export GeoJSON" onClick={onExportGeoJSON} />
          </ActionSection>
        )}

        <div style={{ marginTop: 8 }}>
          <ActionButton label="Cancel" variant="secondary" onClick={onClose} />
        </div>
      </div>
    </ModalShell>
  )
}
