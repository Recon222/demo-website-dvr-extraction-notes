'use client'

import { WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'

export interface NotesScreenProps {
  notes: string
  onChange(value: string): void
  onRegenerate(): void
  onNext(): void
  onBack(): void
  onMenu(): void
}

/** The auto-generated case notes (editable, regenerate). Text comes from the real generateNotes. */
export function NotesScreen({ notes, onChange, onRegenerate, onNext, onBack, onMenu }: NotesScreenProps) {
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Case Notes" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#9fc0db' }}>Auto-generated from your case data</div>
          <button type="button" onClick={onRegenerate} style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#4BA3D4', background: 'transparent', border: 'none' }}>Regenerate</button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Case notes"
          style={{ width: '100%', height: 420, resize: 'none', borderRadius: 12, border: '1px solid #2a4a6f', background: '#0a1320', color: '#dfe9f3', fontSize: 13, lineHeight: 1.6, padding: 14, fontFamily: "'JetBrains Mono',monospace", outline: 'none', marginBottom: 14 }}
        />
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
