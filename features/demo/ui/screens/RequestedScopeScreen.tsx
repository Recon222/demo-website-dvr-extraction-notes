'use client'

import type { FormFieldId, ScopeEntry } from '@/features/demo/engine/types'
import { AddRowButton, DateTimeField, Field, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { RadioOption } from '@/features/demo/ui/controls/choice-controls'
import { glassCard } from '@/features/demo/ui/glass-tokens'
import { fieldLabelStyle } from '@/features/demo/ui/tokens/field-input'
import { spacing } from '@/features/demo/ui/tokens/scale'

export interface RequestedScopeScreenProps {
  scopes: ScopeEntry[]
  onChange(index: number, patch: Partial<ScopeEntry>): void
  onAdd(): void
  onRemove(index: number): void
  /** Which of this screen's fields the visitor's form profile keeps (P7.3). */
  isFieldVisible(id: FormFieldId): boolean
  onNext(): void
  /** Derived CTA copy — see `WizardNext` / `nextCtaLabel`. Never a literal. */
  nextLabel: string | null
  onBack(): void
  onMenu(): void
}

/*
 * A74 — `TimeTypeButton` is GONE. The phone renders this exact choice through the shared
 * `RadioGroup` (`app/(form)/requested-scope.tsx:140-149`, a 2-up `direction="row"` group whose
 * options are `Real Time` / `DVR Time`), and the demo's two segmented pills were a hand-rolled
 * copy with no `role="radio"` at all: a solid `#2B8CC1` fill with a white label when active,
 * an accent-as-text `#99badd` when not.
 *
 * D20's carve-out covers the composition change — presentational composition, in a package
 * whose row names this file. What it buys beyond the palette: the pair now announces itself as
 * one radio group instead of two unrelated buttons.
 */

/** Requested time ranges (real- or DVR-time) + cameras — the input the time-offset math acts on. */
export function RequestedScopeScreen({ scopes, onChange, onAdd, onRemove, isFieldVisible, onNext, nextLabel, onBack, onMenu }: RequestedScopeScreenProps) {
  // Start/End are always-on (the completion gate rejects a scope without them), so only the
  // entry-type switch and the camera list are gated here.
  const showTimeType = isFieldVisible('scope.isActualTime')
  const showCameras = isFieldVisible('scope.cameras')
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Requested Scope" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        {scopes.map((sc, i) => (
          <div key={sc.id} style={{ ...glassCard, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>Scope {i + 1}</div>
              {scopes.length > 1 && (
                <button type="button" onClick={() => onRemove(i)} style={{ cursor: 'pointer', color: '#ff7a85', fontSize: 13, background: 'transparent', border: 'none' }}>Remove</button>
              )}
            </div>
            <DateTimeField label="Start Date / Time" value={sc.startDateTime} onChange={(v) => onChange(i, { startDateTime: v })} />
            <DateTimeField label="End Date / Time" value={sc.endDateTime} onChange={(v) => onChange(i, { endDateTime: v })} />
            {showTimeType && (
              <>
                {/* A72's label half, from the seam: this labels the radio group exactly as a
                    `Field` label labels its input, and the `Field` two rows down had already
                    moved without it. */}
                <div id={`scope-${sc.id}-time-type`} style={fieldLabelStyle}>Time Entry Type</div>
                <div role="radiogroup" aria-labelledby={`scope-${sc.id}-time-type`} style={{ display: 'flex', gap: spacing.sm, marginBottom: 14 }}>
                  <RadioOption label="Real Time" selected={sc.isActualTime} onSelect={() => onChange(i, { isActualTime: true })} />
                  <RadioOption label="DVR Time" selected={!sc.isActualTime} onSelect={() => onChange(i, { isActualTime: false })} />
                </div>
              </>
            )}
            {showCameras && <Field label="Cameras" value={sc.cameras} onChange={(v) => onChange(i, { cameras: v })} placeholder="e.g., 3, 4, 7" />}
          </div>
        ))}
        <AddRowButton label="+ Add Scope" onClick={onAdd} />
        <WizardNext label={nextLabel} onClick={onNext} />
      </div>
    </div>
  )
}
