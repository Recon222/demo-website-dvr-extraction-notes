'use client'

import { useEffect } from 'react'
import type { CSSProperties, ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react'

/** Enter/Space → activate, for `role="switch"`/`button` divs. */
export function switchKeyDown(activate: () => void) {
  return (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate()
    }
  }
}

const grid: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)',
  pointerEvents: 'none',
}

/** The bottom-sheet modal chrome shared by the New Case / New Location / Import modals. */
export function ModalShell({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 21, background: 'rgba(4,8,14,0.55)' }} />
      <div
        role="dialog"
        aria-modal="true"
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

/** Sticky wizard header — back arrow + title + hamburger (opens the wizard drawer). */
export function WizardHeader({ title, onBack, onMenu }: { title: string; onBack(): void; onMenu(): void }) {
  const iconBtn: CSSProperties = { cursor: 'pointer', display: 'flex', padding: 4, background: 'transparent', border: 'none' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 16, background: 'linear-gradient(180deg,#1b2e48,#15273b)', padding: '56px 12px 11px', borderBottom: '1px solid #1e3a5f' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" aria-label="Back" onClick={onBack} style={iconBtn}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8' }}>{title}</div>
      </div>
      <button type="button" aria-label="Menu" onClick={onMenu} style={iconBtn}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>
    </div>
  )
}

/** Primary "Continue" button at the foot of a wizard screen. */
export function WizardNext({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', textAlign: 'center', padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 6px 18px rgba(37,128,173,0.35)' }}>
      {label}
    </button>
  )
}

/** A titled form section card. */
export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18, borderRadius: 12, border: '1px solid rgba(30,58,95,0.5)', background: 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))', padding: 16 }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: '#f0f4f8', paddingBottom: 10, marginBottom: 14, borderBottom: '1px solid #1e3a5f' }}>{title}</div>
      {children}
    </div>
  )
}

/** A datetime-local field bound to a store 'YYYY-MM-DD HH:MM:SS' string. */
export function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>{label}</div>
      <input
        type="datetime-local"
        step="1"
        value={value.replace(' ', 'T')}
        onChange={(e) => onChange(e.target.value.replace('T', ' '))}
        aria-label={label}
        style={{ width: '100%', borderRadius: 8, border: '1px solid #1e3a5f', background: '#0d1b2a', color: '#f0f4f8', fontSize: 14, padding: '11px 12px', outline: 'none', colorScheme: 'dark' }}
      />
    </div>
  )
}

/** A labelled select bound to a string value. */
export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange(value: string): void; options: string[] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} style={{ width: '100%', borderRadius: 8, border: '1px solid #1e3a5f', background: '#0d1b2a', color: '#f0f4f8', fontSize: 14, padding: '11px 12px', outline: 'none', colorScheme: 'dark' }}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

/** A labelled on/off switch (keyboard-operable). */
export function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick(): void }) {
  return (
    <div
      role="switch"
      aria-checked={on}
      aria-label={label}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={switchKeyDown(onClick)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}
    >
      <span style={{ fontSize: 14, color: '#f0f4f8' }}>{label}</span>
      <div style={{ width: 46, height: 28, borderRadius: 14, background: on ? '#2B8CC1' : '#1e3a5f', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 3, [on ? 'right' : 'left']: 3, width: 22, height: 22, borderRadius: 11, background: on ? '#fff' : '#7a9fc4' }} />
      </div>
    </div>
  )
}

/** "+ Add …" dashed button + "Remove" link used by the array wizard screens. */
export function AddRowButton({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', textAlign: 'center', padding: 12, borderRadius: 10, border: '1px dashed #2a4a6f', background: 'transparent', color: '#4BA3D4', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
      {label}
    </button>
  )
}
