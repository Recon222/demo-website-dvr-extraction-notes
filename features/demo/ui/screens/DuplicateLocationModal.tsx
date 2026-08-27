'use client'

import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { Field, ModalShell } from '@/features/demo/ui/screens/_shared'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { NEW_LOCATION_BLOCK_MESSAGES, newLocationBlock } from '@/features/demo/engine/logic/new-location-gate'
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
/** Re-export of the shared gate's collision copy — same rule, same string, one owner
 *  (`new-location-gate.ts`). Kept as a named export because the suite reads it. */
export const NAME_TAKEN_ERROR = NEW_LOCATION_BLOCK_MESSAGES.duplicateName

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

/** Layout only; the paint is `buttonStyle()`, spread after. */
const actionButton: CSSProperties = { width: '100%' }

const sectionCaption: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#99badd',
  marginBottom: 10,
}

/**
 * One stacked chooser action.
 *
 * `blocked` dims and marks `aria-disabled`; it never sets the `disabled` attribute. That is the
 * house rule §56d settled for this exact phase — `disabled` drops keyboard focus to `<body>`,
 * and this gate flips on every keystroke, so a visitor typing a name would be thrown out of the
 * dialog mid-edit and the two actions would leave the tab order and the actionable a11y tree
 * without a word. This component shipped the spelling that reconciliation rejected, in the same
 * diff that established it (review R-3). Enforcement is the caller's guard, as on `ModalActions`.
 *
 * `describedBy` points at the node saying WHY, so a keyboard visitor landing on a dimmed action
 * hears the reason without having to activate it.
 */
function ActionButton({
  label,
  variant = 'primary',
  blocked = false,
  describedBy,
  onClick,
}: {
  label: string
  variant?: 'primary' | 'secondary'
  blocked?: boolean
  describedBy?: string
  onClick(): void
}) {
  return (
    <button
      type="button"
      aria-disabled={blocked}
      aria-describedby={blocked ? describedBy : undefined}
      onClick={onClick}
      style={{
        ...actionButton,
        marginBottom: 10,
        // `blocked` is the disabled PAINT without the disabled ATTRIBUTE (same shape as
        // `ModalActions.submitBlocked`): `aria-disabled` keeps the control reachable so the
        // `describedBy` reason can be heard. D10 replaces the `opacity: 0.45` with the tokens.
        ...buttonStyle({ variant, disabled: blocked }),
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
  const blockedId = `${useId()}-blocked`
  // ONE derivation for the dimmed buttons, the field error and the reason line — and it is the
  // SHARED one `NewLocationModal` uses (`new-location-gate.ts`), not a second copy of the same
  // two rules. `requireAddress: false` with a blank street selects exactly the name half; the
  // module's ordering rule comes with it, so a blank name reports "required", never "duplicate",
  // even when a blank-named sibling exists.
  const block = newLocationBlock({ locationName: name, streetAddress: '', existingNames, requireAddress: false })

  // THE enforcement point, now that the buttons are `aria-disabled` rather than `disabled`:
  // activation reaches here and is refused (the phone's `handleDuplicate` guards too).
  const duplicate = (mode: DuplicateMode) => {
    if (block !== null) return
    onDuplicate(name.trim(), mode)
  }

  return (
    <ModalShell title="Duplicate Location" closeAccessibilityLabel="Close duplicate location" onClose={onClose}>
      <div style={{ fontSize: 13, color: '#99badd', marginTop: -4, marginBottom: 16 }}>
        Enter a name for the duplicate location.
      </div>

      <Field
        label="Location Name"
        required
        value={name}
        onChange={onChangeName}
        placeholder="e.g., Main Store - Copy"
        // Live, at the field, exactly as the New Location card does it. The blank-name case is
        // deliberately NOT an inline field error: an untouched form must not open shouting.
        error={block === 'duplicateName' ? NEW_LOCATION_BLOCK_MESSAGES.duplicateName : undefined}
      />

      {/* Why the two duplicate actions won't fire, as a live region they point at. Rendered
          unconditionally so the region exists before it has content — a region created together
          with its text is not reliably announced. Before R-3 the blank-name arm said nothing at
          all: two primary actions simply vanished from the tab order. */}
      <div role="status" data-testid="duplicate-location-blocked" style={{ fontSize: 12, color: '#ff6b78' }}>
        {block !== null && (
          <div id={blockedId} style={{ marginBottom: 10 }}>
            {NEW_LOCATION_BLOCK_MESSAGES[block]}
          </div>
        )}
      </div>

      <div style={{ paddingTop: 4 }}>
        <ActionButton
          label="Duplicate Location"
          blocked={block !== null}
          describedBy={blockedId}
          onClick={() => duplicate('submission-only')}
        />
        <ActionButton
          label="Duplicate Location with Scopes"
          blocked={block !== null}
          describedBy={blockedId}
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
