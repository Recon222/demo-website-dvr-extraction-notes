'use client'

import type { CSSProperties, ReactNode } from 'react'

const grid: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)',
  pointerEvents: 'none',
}

/** The bottom-sheet modal chrome shared by the New Case / New Location / Import modals. */
export function ModalShell({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 21, background: 'rgba(4,8,14,0.55)' }} />
      <div
        role="dialog"
        aria-label={title}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 34,
          bottom: 0,
          zIndex: 22,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          background: '#0d1b2a',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'screenIn 0.3s ease',
        }}
      >
        <div style={grid} />
        <div style={{ position: 'relative', padding: 18, borderBottom: '1px solid #1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8' }}>{title}</div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ cursor: 'pointer', display: 'flex', background: 'transparent', border: 'none', padding: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: 18 }}>{children}</div>
      </div>
    </>
  )
}

/** A labelled text input row, lifted from the prototype's form styling. */
export function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  required?: boolean
  value: string
  onChange(value: string): void
  placeholder?: string
  hint?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: '#ff4757' }}> *</span>}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        style={{ width: '100%', borderRadius: 8, border: '1px solid #1e3a5f', background: '#0d1b2a', color: '#f0f4f8', fontSize: 15, padding: '11px 12px', outline: 'none' }}
      />
      {hint && <div style={{ fontSize: 12, color: '#7a9fc4', marginTop: 5 }}>{hint}</div>}
    </div>
  )
}

/** Cancel / primary action row at the foot of a modal. */
export function ModalActions({
  cancelLabel = 'Cancel',
  submitLabel,
  onCancel,
  onSubmit,
}: {
  cancelLabel?: string
  submitLabel: string
  onCancel(): void
  onSubmit(): void
}) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <button type="button" onClick={onCancel} style={{ flex: 1, textAlign: 'center', padding: 13, borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        {cancelLabel}
      </button>
      <button type="button" onClick={onSubmit} style={{ flex: 1, textAlign: 'center', padding: 13, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        {submitLabel}
      </button>
    </div>
  )
}

/** Sticky wizard header (title + step caption) shared by the wizard screens. */
export function WizardHeader({ title, step }: { title: string; step?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 16,
        background: 'linear-gradient(180deg,#1b2e48,#15273b)',
        padding: '56px 16px 11px',
        borderBottom: '1px solid #1e3a5f',
      }}
    >
      <div style={{ fontSize: 19, fontWeight: 700, color: '#f0f4f8' }}>{title}</div>
      {step && <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#7a9fc4' }}>{step}</div>}
    </div>
  )
}
