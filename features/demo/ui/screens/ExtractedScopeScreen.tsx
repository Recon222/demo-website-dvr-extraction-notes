'use client'

import type { ScopeEntry } from '@/features/demo/engine/types'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { DateTimeField, Field, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { EmptyState } from '@/features/demo/ui/controls/EmptyState'
import { Banner } from '@/features/demo/ui/controls/Banner'
import { glassCard } from '@/features/demo/ui/glass-tokens'

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
        {/* A71/U3.3. This explanatory note has NO phone counterpart — the phone's
            extracted-video-scope screen carries only an empty-state `infoCard` (`:108-112`,
            already the demo's `EmptyState` below). It is one of A71's ~12 local notice recipes
            all the same, and it was the family Banner absorbs: a 7%-alpha wash under 13px
            `#9fc0db`, unmeasurable because the fill is translucent.

            TWO THINGS CHANGED IN THE COPY, both forced and both disclosed:
             - The `<strong>DVR-clock time</strong>` is flat now. `message` is a string by
               design — phone `Banner.tsx:39-40`, "a status line, not a layout slot" — and
               widening it to `ReactNode` would re-invent the `icon` prop the phone deleted
               unused (`1a17b33a`). The phone's own P8 deviation D-3 is this same fold:
               `SecuritySettingsSection`'s warning TITLE folded into the Banner message.
             - The em dash became a full stop, per plan §4.3's standing copy rule. Same
               precedent as U3.4's `ExportCaseCard` string: the rule is swept by U7.3/A93, but
               a string this package is rewriting anyway does not get to keep a known violation.
               Every word is otherwise unchanged.

            `marginBottom` stays the demo's own 14: the phone's Banner callers pass
            `spacing.md` (16), but there is no phone counterpart here to lift 16 FROM, and
            §4.2 forbids tidying a demo value toward a number nothing sourced. */}
        <Banner
          severity="info"
          message="Auto-generated from the time-offset calculation. These are the windows pulled off the DVR, in DVR-clock time. Edit if you rounded the boundaries."
          style={{ marginBottom: 14 }}
        />
        {scopes.length === 0 && <EmptyState message="Calculate the time offset first, then regenerate." />}
        {scopes.map((ex, i) => (
          <div key={ex.id} style={{ ...glassCard, padding: 16, marginBottom: 14 }}>
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
        <button type="button" onClick={onRegenerate} style={{ width: '100%', marginBottom: 14, ...buttonStyle({ variant: 'secondary' }) }}>Regenerate from offset</button>
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
