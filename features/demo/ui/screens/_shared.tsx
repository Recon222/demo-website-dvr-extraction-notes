'use client'

import { useEffect, useId } from 'react'
import type { CSSProperties, ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { PickerOption } from '@/features/demo/engine/content/form-options'
import { Dropdown } from '@/features/demo/ui/inputs/Dropdown'
import { DateTimeField as DateTimeFieldImpl } from '@/features/demo/ui/inputs/DateTimeField'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { GLASS, glassCard, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'

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
  backgroundImage: GLASS.gridOverlay,
  pointerEvents: 'none',
}

/** The bottom-sheet modal chrome shared by the New Case / New Location / Import modals.
 *  `onBack` (optional) renders a chevron before the title for in-modal sub-steps — the
 *  phone's paste-text header shape (chevron-back · title · close, ImportPickerModal.tsx:642-661).
 *
 *  `subtitle` / `footer` / `fillBody` (all optional, added by P3.2) carry the phone's
 *  pageSheet shape for the Case Actions Sheet: header lines under the title, an action row
 *  PINNED below the body (never scrolled away), and a body that hands scrolling to its child
 *  instead of owning it (the sheet's report panel measures its own overflow). Every default
 *  reproduces the pre-P3.2 markup byte for byte, so the three existing callers are untouched. */
export function ModalShell({
  title,
  subtitle,
  onClose,
  onBack,
  backLabel = 'Back',
  fillBody = false,
  footer,
  children,
}: {
  title: string
  /** One-line header caption under the title, rendered only when passed (phone
   *  NewLocationModal.tsx:212-219). It becomes the dialog's DESCRIPTION, never part of its
   *  accessible name. ReactNode so richer captions (P3.2's sheet) fit; plain strings for the
   *  phone-parity callers. */
  subtitle?: ReactNode
  onClose(): void
  onBack?(): void
  backLabel?: string
  fillBody?: boolean
  footer?: ReactNode
  children: ReactNode
}) {
  const subtitleId = `${useId()}-subtitle`
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const content = (
    <>
      <div data-modal-scrim onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 21, background: 'rgba(4,8,14,0.55)', pointerEvents: 'auto' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={subtitle ? subtitleId : undefined}
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
          pointerEvents: 'auto',
        }}
      >
        <div style={grid} />
        <div style={{ position: 'relative', padding: 18, borderBottom: GLASS.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {onBack && (
              <button type="button" aria-label={backLabel} onClick={onBack} style={{ cursor: 'pointer', display: 'flex', background: 'transparent', border: 'none', padding: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8' }}>{title}</div>
              {subtitle && (
                <div id={subtitleId} data-testid="modal-subtitle" style={{ fontSize: 13, color: '#99badd', marginTop: 4 }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ cursor: 'pointer', display: 'flex', background: 'transparent', border: 'none', padding: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div
          style={
            fillBody
              ? // The child owns its own scrolling (and its own overflow measurement);
                // `minHeight: 0` lets it shrink inside the flex column instead of pushing
                // the pinned footer off the sheet. Column flex so the child can claim the
                // remaining height with `flex: 1` and MEASURE it.
                {
                  position: 'relative',
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column' as const,
                }
              : { position: 'relative', flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: 18 }
          }
        >
          {children}
        </div>
        {footer && <div style={{ position: 'relative', padding: 18, borderTop: GLASS.border }}>{footer}</div>}
      </div>
    </>
  )
  return <PhoneOverlayPortal>{content}</PhoneOverlayPortal>
}

const fieldInput: CSSProperties = {
  width: '100%',
  borderRadius: 8,
  border: GLASS.border,
  background: '#0d1b2a',
  color: '#f0f4f8',
  fontSize: 15,
  padding: '11px 12px',
  outline: 'none',
}

/** A labelled text input (or textarea when `multiline`), lifted from the prototype's form styling. */
export function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  hint,
  error,
  readOnly,
  multiline,
}: {
  label: string
  required?: boolean
  value: string
  onChange(value: string): void
  placeholder?: string
  hint?: string
  /**
   * Validation message for THIS field — the phone's shared `TextInput` `error` prop.
   *
   * Reddens the border, sets `aria-invalid`, and REPLACES `hint`: the phone renders the error
   * line OR the helper line, never both (`src/components/common/TextInput.tsx:113-125` —
   * `{error && …}` then `{!error && helperText && …}`).
   *
   * ONE treatment for both kinds of caller (P3 assembly; three spellings of this prop landed
   * in parallel). The message carries BOTH `role="alert"` and an id the input's
   * `aria-describedby` points at, which is a superset, not a compromise:
   *  - `role="alert"` is what a SUBMIT-TIME message needs (P3.3's "Case number is required"
   *    on a refused Create). Focus is on the button at that moment, so `aria-describedby` on
   *    the input would announce nothing at all — a silently refused submit;
   *  - `aria-describedby` is what a field-focused visitor needs, and it re-reads the message
   *    on every return to the field.
   * P3.4 dropped `role="alert"` for fear a LIVE per-keystroke check would interrupt
   * continuously. It does not: the live callers pass a CONSTANT string from a conditionally
   * mounted node (`NEW_LOCATION_BLOCK_MESSAGES.duplicateName`), so the region announces when
   * the collision appears and stays silent while the visitor keeps typing into it.
   */
  error?: string
  /** Displays the value but refuses edits — dimmed like the phone's `readOnlyField`
   *  treatment (`NewCaseModal.tsx:494-498`). Still focusable and selectable, so the value
   *  can be read and copied; `disabled` would take it out of the tab order entirely. */
  readOnly?: boolean
  multiline?: boolean
}) {
  const errorId = `${useId()}-error`
  const describedBy = error ? errorId : undefined
  const invalid = error ? true : undefined
  const boxStyle = error ? { ...fieldInput, borderColor: '#ff4757' } : fieldInput
  return (
    <div style={readOnly ? { marginBottom: 14, opacity: 0.6 } : { marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: '#ff4757' }}> *</span>}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          readOnly={readOnly}
          rows={3}
          style={{ ...boxStyle, minHeight: 76, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          readOnly={readOnly}
          style={boxStyle}
        />
      )}
      {error ? (
        <div id={errorId} role="alert" style={{ fontSize: 12, color: '#ff6b78', marginTop: 5 }}>
          {error}
        </div>
      ) : (
        hint && <div style={{ fontSize: 12, color: '#7a9fc4', marginTop: 5 }}>{hint}</div>
      )}
    </div>
  )
}

/** A collapsed-by-default disclosure for secondary modal fields (OIC, Video Coordinator). */
export function Accordion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="demo-accordion" style={{ marginBottom: 14, borderRadius: 10, border: GLASS.border, background: 'rgba(13,27,42,0.4)', overflow: 'hidden' }}>
      <summary style={{ cursor: 'pointer', padding: '12px 14px', fontSize: 14, fontWeight: 600, color: '#cdd9e6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{title}</span>
        <svg aria-hidden="true" className="demo-accordion-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7a9fc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div style={{ padding: '2px 14px 4px' }}>{children}</div>
    </details>
  )
}

/** Cancel / primary action row at the foot of a modal. */
export function ModalActions({
  cancelLabel = 'Cancel',
  submitLabel,
  onCancel,
  onSubmit,
  submitBlocked = false,
  submitDescribedBy,
}: {
  cancelLabel?: string
  submitLabel: string
  onCancel(): void
  onSubmit(): void
  /**
   * The form's gate is unsatisfied: the primary action reads as unavailable (dimmed +
   * `aria-disabled`) but STILL FIRES `onSubmit`. **The caller MUST guard** — this prop is
   * presentation + a11y only, and deleting a caller's validate-and-return re-opens the submit.
   *
   * Never the `disabled` attribute: it drops keyboard focus to `<body>`, and a gate that flips
   * on a keystroke would strand the visitor mid-form (the R-7/R-15 house choice, and §45a's
   * `aria-disabled`-over-`disabled` precedent on the GPS capture button).
   *
   * WHY THE CLICK IS NOT SWALLOWED HERE (P3 assembly — three spellings of this gate landed in
   * parallel and this is the union of their semantics): the phone hard-`disabled`s Create Case
   * while Case Number or Unit is blank (`NewCaseModal.tsx:445`) using the SAME predicate as its
   * `validateForm`, which makes that function's messages ("Case number is required" / "Unit is
   * required") permanently unreachable. Letting the click through so the caller's handler can
   * surface those verbatim messages ships the phone's copy live instead of dead (§50a). A
   * caller whose reason is ALREADY on screen (a live region, per `submitDescribedBy`) simply
   * returns from its guard and nothing further happens — the same user-visible behaviour a
   * swallow gave it, with enforcement kept where it can be read.
   */
  submitBlocked?: boolean
  /** Id of the element stating WHY the action is blocked; described from the button while
   *  blocked so a keyboard user landing on it hears the reason without activating it. */
  submitDescribedBy?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <button type="button" onClick={onCancel} style={{ flex: 1, textAlign: 'center', padding: 13, ...glassBtnSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        {cancelLabel}
      </button>
      <button
        type="button"
        // Deliberately unguarded — the caller's handler is the enforcement point. See the
        // `submitBlocked` doc above before "fixing" this.
        onClick={onSubmit}
        aria-disabled={submitBlocked}
        aria-describedby={submitBlocked ? submitDescribedBy : undefined}
        style={{
          flex: 1,
          textAlign: 'center',
          padding: 13,
          ...glassBtnPrimary,
          fontSize: 15,
          fontWeight: 600,
          cursor: submitBlocked ? 'not-allowed' : 'pointer',
          opacity: submitBlocked ? 0.45 : 1,
        }}
      >
        {submitLabel}
      </button>
    </div>
  )
}

/** Sticky wizard header — back arrow + title + hamburger (opens the wizard drawer). */
export function WizardHeader({ title, onBack, onMenu }: { title: string; onBack(): void; onMenu(): void }) {
  const iconBtn: CSSProperties = { cursor: 'pointer', display: 'flex', padding: 4, background: 'transparent', border: 'none' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 16, background: 'linear-gradient(180deg,#1b2e48,#15273b)', padding: '56px 12px 11px', borderBottom: GLASS.border }}>
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
    <button type="button" onClick={onClick} style={{ width: '100%', textAlign: 'center', padding: 14, ...glassBtnPrimary, fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 6px 18px rgba(37,128,173,0.35)' }}>
      {label}
    </button>
  )
}

/** A titled form section card. */
export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18, ...glassCard, padding: 16 }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: '#f0f4f8', paddingBottom: 10, marginBottom: 14, borderBottom: GLASS.border }}>{title}</div>
      {children}
    </div>
  )
}

/** Date+time field bound to a store 'YYYY-MM-DD HH:MM:SS' string — separate Date/Time
 *  buttons (bottom-sheet calendar + HH:MM:SS wheel) matching the phone app. */
export function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  return <DateTimeFieldImpl label={label} value={value} onChange={onChange} />
}

/** A labelled dropdown bound to a string value — the custom picker matching the phone app.
 *  Options are plain strings or `{ label, value }` pairs (see `DropdownProps`). */
export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange(value: string): void; options: ReadonlyArray<string | PickerOption> }) {
  return <Dropdown label={label} value={value} onChange={onChange} options={options} placeholder="Select…" />
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
