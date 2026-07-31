'use client'

import { useEffect, useId, useRef } from 'react'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { GLASS, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'

/** One alert button. Mirrors React Native's `Alert.alert` button shape, styles included. */
export interface AlertAction {
  label: string
  /** RN `AlertButton.style`: 'cancel' reads secondary, 'destructive' error-tinted. */
  style?: 'default' | 'cancel' | 'destructive'
  onPress(): void
}

export interface AlertDialogProps {
  title: string
  /** Body copy. `\n` renders as a line break — the phone joins message lines the same way. */
  message: string
  /** Rendered left to right in the order the phone declares them. */
  actions: readonly AlertAction[]
  /** Escape. The caller wires this to whatever "cancel" means for that alert. */
  onDismiss(): void
}

/**
 * The demo's in-phone analog of the phone's `Alert.alert(title, message, buttons)` — an
 * OS-level blocking dialog on the device, so it renders over the phone SCREEN (through
 * `PhoneOverlayPortal`, like every other overlay) rather than over the page.
 *
 * Presentational: props in, callbacks out. Nothing here touches the store.
 *
 * Deliberate behaviours:
 * - The scrim does NOT dismiss. A native alert is answered by choosing a button, and this
 *   is the demo's blocking-dialog primitive; a click-away escape hatch would let a visitor
 *   skip a decision the phone forces. Escape still dismisses (keyboard parity with every
 *   other overlay in this feature: ModalShell, WizardDrawer, PdfPreview, ExitDialog).
 * - Focus moves to the dialog container on mount (`tabIndex={-1}`, the R-17 idiom shared
 *   with the import large-batch confirm) so a screen reader hears title AND body, not just
 *   the first button; it is handed back to the opener on unmount (the PdfPreview idiom).
 */
export function AlertDialog({ title, message, actions, onDismiss }: AlertDialogProps) {
  const uid = useId()
  const titleId = `${uid}-title`
  const bodyId = `${uid}-body`
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDismiss])

  useEffect(() => {
    const opener = document.activeElement
    dialogRef.current?.focus()
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  const content = (
    <>
      {/* Inert by design — see the scrim note above. It exists to blank the screen behind
          the alert and swallow taps, exactly like the OS dimming layer. */}
      <div
        data-alert-scrim
        style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(4,8,14,0.66)', pointerEvents: 'auto' }}
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 61,
          borderRadius: 16,
          border: GLASS.borderSoft,
          background: GLASS.gradientPanel,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          padding: '20px 20px 16px',
          outline: 'none',
          pointerEvents: 'auto',
          animation: 'screenIn 0.2s ease',
        }}
      >
        <div id={titleId} style={{ fontSize: 17, fontWeight: 700, color: '#f0f4f8', marginBottom: 8 }}>
          {title}
        </div>
        <div
          id={bodyId}
          style={{ fontSize: 13.5, lineHeight: 1.55, color: '#cdd9e6', whiteSpace: 'pre-line', marginBottom: 16 }}
        >
          {message}
        </div>
        {/* Like the OS alert this mirrors, 3+ buttons stack into full-width rows (the
            iOS multi-option shape — the phone's three-arm Notes/OCR confirms render this
            way); 1–2 keep the side-by-side row. */}
        <div style={{ display: 'flex', gap: 8, ...(actions.length > 2 ? { flexDirection: 'column' as const } : {}) }}>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onPress}
              style={{
                flex: 1,
                padding: 12,
                fontSize: 14.5,
                fontWeight: 600,
                cursor: 'pointer',
                ...(a.style === 'destructive'
                  ? { ...glassBtnSecondary, border: GLASS.borderError, color: '#ff6b7a' }
                  : a.style === 'cancel'
                    ? glassBtnSecondary
                    : glassBtnPrimary),
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
  return <PhoneOverlayPortal>{content}</PhoneOverlayPortal>
}
