'use client'

import { useId } from 'react'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { CentredDialog } from '@/features/demo/ui/controls/CentredDialog'
import { GLASS } from '@/features/demo/ui/glass-tokens'

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
/**
 * The destructive arm's red re-tint, UNCHANGED in value and now expressed as four side
 * longhands instead of spreading the old secondary fragment and then setting `border` — the second
 * of the two live instances §4.3 names of a `border` SHORTHAND written after a spread. Nothing
 * carried a `borderTopColor` here yet, so it was latent rather than broken; W1's web lane proved
 * the documented "re-set the longhand after" escape hatch does not survive a spread at all, so
 * the shape goes rather than the comment.
 *
 * NOT converted to `variant: 'danger'`. There is no phone recipe to port: RN renders this
 * confirm through the OS `Alert.alert` with `style: 'destructive'`, so the demo's dialog is a
 * demo-only surface (D12: follow, inside the frame) and A67 names exactly two danger sites,
 * neither of them this one. `AlertDialog.test.tsx:168` pins destructive != cancel RELATIONALLY,
 * which §4.4 trap 2 says to leave alone — and it still holds.
 *
 * RESIDUAL FOR U4.3, which opens this file whole: `#ff6b7a` is red AS TEXT, which is what C.3
 * rule 1 forbids ("severity on the icon, text in `colors.text`"). Out of U2.2's rows; flagged.
 */
const DESTRUCTIVE_EDGE = 'rgba(255,71,87,0.3)' // the colour half of `GLASS.borderError`
const destructiveTint = {
  borderTopColor: DESTRUCTIVE_EDGE,
  borderRightColor: DESTRUCTIVE_EDGE,
  borderBottomColor: DESTRUCTIVE_EDGE,
  borderLeftColor: DESTRUCTIVE_EDGE,
  color: '#ff6b7a',
} as const

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
              // U2.2's recipe, kept THROUGH U4.3's CentredDialog adoption: `glassBtn*` no
              // longer exists, and `destructiveTint` is four border LONGHANDS because W1
              // proved the documented "re-set the longhand after" hatch does not survive
              // a spread (see this file's note above) — a `border` shorthand erases it.
              ...buttonStyle({ variant: a.style === 'default' || a.style === undefined ? 'primary' : 'secondary' }),
              ...(a.style === 'destructive' ? destructiveTint : {}),
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </CentredDialog>
  )
}
