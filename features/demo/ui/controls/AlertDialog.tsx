'use client'

import { useEffect, useId, useRef } from 'react'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
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

/**
 * The element that started the current interaction, captured at GESTURE time (review D-2).
 *
 * WHY NOT `document.activeElement` IN THE MOUNT EFFECT. A handler that disables its own control
 * — R-8's in-flight belt on the map's Export Map button is the live example, and
 * `ExportHub`'s footer CTA has had the same shape all along — makes that control
 * non-focusable in the SAME commit that mounts this dialog. HTML's focus fixup then moves focus
 * to `<body>` before React runs passive effects, so the mount effect captured `<body>` and
 * dismissing dropped the keyboard visitor at document start. Capture-phase listeners run before
 * all of it: before the click handler, before the disable, before the fixup.
 *
 * Installed at MODULE scope, not on mount: by the time a dialog mounts, the gesture that opened
 * it is already over.
 */
let activationOrigin: HTMLElement | null = null
let tracking = false

/** What a restored focus can legally land on. Mirrors the focusable set the demo actually
 *  renders — every overlay opener here is a button or a `tabIndex` div. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

/**
 * Can this element still take focus at RESTORE time? A disconnected or still-disabled opener is
 * not an error — it is the normal outcome of a destructive or state-changing action — so focus
 * is left where it is rather than forced somewhere arbitrary.
 *
 * Deliberately NOT applied when the origin is captured: at mount the opener is very often
 * disabled, because disabling it is what raised this dialog. That is the whole finding.
 */
function canTakeFocus(el: HTMLElement | null): el is HTMLElement {
  return !!el && el.isConnected && (el as Partial<HTMLButtonElement>).disabled !== true
}

function rememberPointerOrigin(e: Event) {
  const target = e.target
  activationOrigin = target instanceof HTMLElement ? target.closest<HTMLElement>(FOCUSABLE) : null
}

function rememberKeyOrigin() {
  // Keyboard activation fires on the focused element, and at keydown it is still focused.
  const active = document.activeElement
  activationOrigin = active instanceof HTMLElement && active !== document.body ? active : null
}

/** Idempotent; exported so a test can assert the tracker is armed without importing internals. */
export function trackAlertActivationOrigin(): void {
  if (typeof document === 'undefined' || tracking) return
  tracking = true
  document.addEventListener('pointerdown', rememberPointerOrigin, true)
  document.addEventListener('keydown', rememberKeyOrigin, true)
}

trackAlertActivationOrigin()

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
 *   The opener comes from the gesture tracker above, NOT from `document.activeElement` at
 *   mount — see its note for why a control that disables itself broke the old read.
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
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDismiss])

  useEffect(() => {
    // The gesture's own origin wins; `document.activeElement` is the fallback for a dialog
    // nobody clicked open (a finished pipeline, a store change). The captured value is
    // connectivity-checked HERE as well as at restore time, so a stale origin left by an
    // earlier interaction can never become this dialog's opener.
    const captured = activationOrigin?.isConnected ? activationOrigin : null
    const active = document.activeElement
    const opener = captured ?? (active instanceof HTMLElement && active !== document.body ? active : null)
    dialogRef.current?.focus()
    return () => {
      if (canTakeFocus(opener)) opener.focus()
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
                ...buttonStyle({ variant: a.style === 'default' || a.style === undefined ? 'primary' : 'secondary' }),
                ...(a.style === 'destructive' ? destructiveTint : {}),
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
