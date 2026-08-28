// Authored preview — CentredDialog (U4.3). The demo's one centred blocking-dialog shell: a
// scrim, and a panel on the `elevated` tier floating in the middle of the phone screen.
//
// It renders through PhoneOverlayPortal, which falls back to rendering INLINE when there is no
// context — so, like ModalShell / PickerSheet / WizardDrawer, it needs a position:relative,
// explicitly sized frame to anchor into. Wrapped in <div data-demo-root> with the ported navy
// backdrop (#002853 = colors.background, tokens/palette.ts:99): demo.css scopes every rule,
// box-sizing included, to that attribute.
//
// The shell owns the scrim, the panel, the z pair, focus and Escape. What a caller supplies is
// the BODY — so both stories are its three real callers' bodies:
//   Alert  — AlertDialog.tsx (title + \n-joined message + the RN button row), scrim does NOT
//            dismiss: a native alert is answered by choosing a button (AlertDialog.tsx:40-43).
//   Delete — DeleteConfirmationModal's destructive confirm, whose scrim DOES dismiss
//            (the phone's `handleOverlayPress`, DeleteConfirmationModal.tsx:43-47).
//
// `z` is a caller decision (D14 — the demo's five z schemes are out of scope for this port);
// the alert's 60/61 and the export prompt's 40/41 are the real values, not renumbered here.
import { CentredDialog } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ position: 'relative', background: '#002853', width: 378, height: 560, overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

/* colors.text (#f0f4f8, palette.ts:104) and colors.textSecondary (#99badd, palette.ts:106) —
   the panel's title and body tones. Previews cannot import the token modules: they resolve
   'open-pro-next', the bundle global, which exports only the pinned components. */
const titleStyle = { fontSize: 17, fontWeight: 700, color: '#f0f4f8', marginBottom: 8 } as const
const messageStyle = { fontSize: 14, lineHeight: '21px', color: '#99badd', marginBottom: 20 } as const
const buttonRow = { display: 'flex', gap: 10, justifyContent: 'flex-end' } as const
const buttonBase = {
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  borderStyle: 'solid',
  borderWidth: 1,
} as const

/* colors.border (#1c4e84, palette.ts:117) and colors.errorLight (#b72136, palette.ts:127) —
   the secondary and destructive fills; onError (#ffffff, palette.ts:140) is the label that
   clears 6.39:1 on the deep red (palette.ts's D7a rider). */
const cancelButton = { ...buttonBase, background: 'transparent', borderColor: '#1c4e84', color: '#99badd' } as const
const destructiveButton = { ...buttonBase, background: '#b72136', borderColor: '#b72136', color: '#ffffff' } as const

export function Alert() {
  return (
    <Phone>
      <CentredDialog
        z={60}
        labelledBy="alert-title"
        describedBy="alert-body"
        onDismiss={() => {}}
        dismissOnScrim={false}
        dismissOnEscape
      >
        <div id="alert-title" style={titleStyle}>
          Location Has No Cameras
        </div>
        <div id="alert-body" style={messageStyle}>
          Add at least one camera before completing the extraction notes for this location.
        </div>
        <div style={buttonRow}>
          <button type="button" style={cancelButton}>
            OK
          </button>
        </div>
      </CentredDialog>
    </Phone>
  )
}

export function DestructiveConfirm() {
  return (
    <Phone>
      <CentredDialog
        z={60}
        labelledBy="delete-title"
        describedBy="delete-body"
        onDismiss={() => {}}
        dismissOnScrim
        dismissOnEscape
      >
        <div id="delete-title" style={titleStyle}>
          Delete Location
        </div>
        <div id="delete-body" style={messageStyle}>
          Deleting 1420 Kingsway Retail removes its DVR details, 3 requested time frames and 4 cameras. This cannot be
          undone.
        </div>
        <div style={buttonRow}>
          <button type="button" style={cancelButton}>
            Cancel
          </button>
          <button type="button" style={destructiveButton}>
            Delete
          </button>
        </div>
      </CentredDialog>
    </Phone>
  )
}
