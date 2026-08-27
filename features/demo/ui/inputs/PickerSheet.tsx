'use client'

import type { CSSProperties, ReactNode } from 'react'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { GlassBottomSheet } from '@/features/demo/ui/controls/GlassBottomSheet'

/**
 * Re-exported, not redefined. `PICKER_SHEET_Z` moved to `controls/GlassBottomSheet.tsx` with
 * the shell that paints it; D14 froze the NUMBER and three pins
 * (`settings/__tests__/UserProfilePane.test.tsx:306,315,316`) plus two `screens/_shared.tsx`
 * docblocks read it from HERE, so the import path is unchanged for every existing consumer.
 */
export { PICKER_SHEET_Z } from '@/features/demo/ui/controls/GlassBottomSheet'

export interface PickerSheetProps {
  title: string
  onClose(): void
  children: ReactNode
  /** Sticky action row at the foot of the sheet (e.g. Cancel / Confirm or Done). */
  footer?: ReactNode
}

/**
 * Demo-owned picker chrome the shell does not carry.
 *
 * Body: the phone's sheet body has no padding at all (`GlassBottomSheet.tsx:368-370`) because
 * its callers pad their own content — matrix A82's map filters body carries `16/16/8`. The
 * demo's three pickers do not, so the padding they have always had lives here.
 *
 * Footer: `16px 16px 4px` rather than a flat 16, because the shell's own footer node adds
 * `paddingBottom: 12` (A58). 4 + 12 = the 16 the pickers rendered before this package, so the
 * three footers are unmoved to the pixel. The divider is demo-owned too: the phone's sheet
 * footer has no border and A58 does not give it one, so removing it would be a visible change
 * to three surfaces with nothing phone-sourced to replace it. Kept, and named as demo chrome —
 * the same call U1.4 made for `WizardHeader`'s 56px top padding.
 */
const pickerBody: CSSProperties = { padding: 16 }
const pickerFooter: CSSProperties = { padding: '16px 16px 4px', borderTop: `1px solid ${T.border}` }

/**
 * The demo's ✕. The shell owns no close affordance by design (phone `:135-137`), so the three
 * pickers' existing button is passed in as `headerRight` rather than deleted: it is a real
 * close route for a pointer user who cannot reach a keyboard's Escape, and three tests press
 * it by its accessible name.
 */
function CloseButton({ onClose }: { onClose(): void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      style={{ cursor: 'pointer', display: 'flex', background: 'transparent', border: 'none', padding: 0 }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  )
}

/**
 * The picker preset over `GlassBottomSheet` (SEAM(U4.1b)) — the calendar, the time wheel and
 * the dropdown all mount this.
 *
 * It is a preset and not a second sheet: everything below it — the portal, the scrim, the
 * ground, the header band, the handle, the four close routes and the motion — is the shell's.
 * What survives here is the three pickers' own chrome and nothing else.
 *
 * `visible` is hard-coded true because all three callers already mount this conditionally
 * (`DateField.tsx:81`, `TimeField.tsx:63`, `Dropdown.tsx:127` are all `{open && <PickerSheet`).
 * The consequence, stated rather than hidden: the pickers get the shell's ENTER animation and
 * NOT its exit — unmounting the shell skips the `closing` phase entirely, which is exactly the
 * behaviour they have today. Threading `visible` through would edit three files that U2.4
 * owns; it is proposed as a deferral with that package as the trigger.
 *
 * `showAccentStrip={false}` is not a demo preference — every form sheet on the phone passes it
 * (`Picker.tsx:175`, `TimePicker.tsx:133`, `DateTimePicker.tsx:262`, `ExportActionSheet.tsx:107`).
 * `DateTimePicker.tsx:253-261` records why: the 2px tapering rule stacked under the header's
 * uniform 1px border reads as one doubled band, "thicker and brighter in the middle" (measured
 * there at dE 0.0 at the edges to 22.5 at the centre against the border's flat 10.9).
 */
export function PickerSheet({ title, onClose, children, footer }: PickerSheetProps) {
  return (
    <GlassBottomSheet
      visible
      title={title}
      onClose={onClose}
      showAccentStrip={false}
      headerRight={<CloseButton onClose={onClose} />}
      footer={footer ? <div style={pickerFooter}>{footer}</div> : undefined}
    >
      <div style={pickerBody}>{children}</div>
    </GlassBottomSheet>
  )
}
