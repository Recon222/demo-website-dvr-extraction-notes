'use client'

import { useId } from 'react'
import { CentredDialog } from '@/features/demo/ui/controls/CentredDialog'
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

/** Scrim z; the panel paints on 61. D14 — this package does not renumber. */
const ALERT_Z = 60

/**
 * The demo's in-phone analog of the phone's `Alert.alert(title, message, buttons)` — an
 * OS-level blocking dialog on the device, so it renders over the phone SCREEN (through
 * `CentredDialog`, which portals like every other overlay) rather than over the page.
 *
 * Presentational: props in, callbacks out. Nothing here touches the store.
 *
 * SEAM(U4.3): the panel, the scrim, the z pair, the focus mechanism and the Escape route all
 * live in `CentredDialog` now. What is left here is what makes an ALERT an alert rather than a
 * dialog: one title, one `\n`-joined body, and the RN button row.
 *
 * The scrim does NOT dismiss (`dismissOnScrim={false}`). A native alert is answered by choosing
 * a button, and this is the demo's blocking-dialog primitive; a click-away escape hatch would
 * let a visitor skip a decision the phone forces. Escape still dismisses — keyboard parity with
 * every other overlay in this feature (ModalShell, WizardDrawer, PdfPreview, ExitDialog).
 */
export function AlertDialog({ title, message, actions, onDismiss }: AlertDialogProps) {
  const uid = useId()
  const titleId = `${uid}-title`
  const bodyId = `${uid}-body`

  return (
    <CentredDialog
      z={ALERT_Z}
      labelledBy={titleId}
      describedBy={bodyId}
      onDismiss={onDismiss}
      dismissOnScrim={false}
      dismissOnEscape
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
    </CentredDialog>
  )
}
