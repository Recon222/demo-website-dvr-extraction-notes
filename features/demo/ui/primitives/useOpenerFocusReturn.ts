'use client'

import { useEffect, type RefObject } from 'react'

/**
 * SEAM(W3-F64): focus in on mount, back to the opener on unmount — the demo's ONE mechanism.
 *
 * Extracted from `controls/CentredDialog.tsx` by deferral ledger §103's own prescription, whose
 * trigger ("U7.2 opening `MediaLibrarySheet`") fired in W3 and was not performed. §103's list:
 * *"the mover extracts the hook from `CentredDialog.tsx` (tracker + `canTakeFocus` + the mount
 * effect minus the `openDialogs` push/pop), adopts it at its own surface, fixes the stale
 * citations, and the remaining sites follow one line each."*
 *
 * ## Why a gesture tracker and not `document.activeElement`
 *
 * This is the whole finding U4.3 recorded, and every site this hook replaces had the broken
 * shape. A control that is DISABLED by the very action that raises an overlay loses focus to
 * `<body>` **before React runs passive effects**, so a mount-time `document.activeElement` read
 * captures `<body>` and the unmount hand-back goes nowhere — the keyboard user is dropped at the
 * top of the document. `ExportActionSheet`'s and `PdfPreview`'s openers are self-disabling, which
 * is why §103 calls those two "the likeliest reproducers".
 *
 * So the origin is captured at GESTURE time by a capture-phase listener, and
 * `document.activeElement` survives only as the fallback for an overlay nobody clicked open — a
 * finished pipeline, a store change.
 *
 * The capture is SINGLE-USE (W3 rider F80): the mount effect consumes it, so one gesture supplies
 * exactly one overlay's opener and anything mounting after it reads the live focus instead of a
 * stale button.
 *
 * ## What is deliberately NOT here
 *
 * `CentredDialog`'s `openDialogs` stack (its Escape-goes-to-the-topmost rule) stays in that file.
 * It is dialog-stacking policy, not focus, and the two sheets and the PDF layer answer Escape
 * their own way. §103 scopes the extraction the same way, in those words.
 *
 * A focus TRAP is also not here. The two `aria-modal` shells still do not trap, and that half of
 * §103 is unchanged and re-proposed — trapping is a different mechanism with a different failure
 * mode (it must not strand a user inside a layer with no exit), and bundling it into a hand-back
 * extraction would be the speculative half of a fix whose non-speculative half is overdue.
 */

/** What a restored focus can legally land on. Mirrors the focusable set the demo renders. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

let activationOrigin: HTMLElement | null = null
let tracking = false

/**
 * Can this element still take focus at RESTORE time? A disconnected or still-disabled opener is
 * not an error — it is the normal outcome of a destructive or state-changing action — so focus is
 * left where it is rather than forced somewhere arbitrary.
 *
 * Deliberately NOT applied when the origin is captured: at mount the opener is very often
 * disabled, because disabling it is what raised the overlay. That is the whole finding.
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
export function trackDialogActivationOrigin(): void {
  if (typeof document === 'undefined' || tracking) return
  tracking = true
  document.addEventListener('pointerdown', rememberPointerOrigin, true)
  document.addEventListener('keydown', rememberKeyOrigin, true)
}

trackDialogActivationOrigin()

/**
 * Take focus on mount (if `focusRef` is given) and hand it back to the opener on unmount.
 *
 * @param focusRef what to focus on mount. OMIT IT to restore only — `PdfPreview` does, because
 *   its own iframe/close button ordering already puts focus somewhere useful and forcing the
 *   layer to take it would move the visitor off the control they were about to press. A hook that
 *   forced both halves would have made that site's adoption a behaviour change.
 * @param enabled gate for a surface that mounts before it is interactive; defaults to `true`.
 */
export function useOpenerFocusReturn(
  focusRef?: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return
    // The gesture's own origin wins; `document.activeElement` is the fallback for an overlay
    // nobody clicked open.
    //
    // W3 rider F80: the origin is SINGLE-USE. `isConnected` proves the element still EXISTS, not
    // that the gesture which set it raised THIS overlay — a button clicked minutes ago is still
    // connected, so an overlay opened by a store change with no gesture at all inherited it.
    // Consuming the capture is what makes the guard match the claim, and the fallback on the next
    // line is already the right answer for the second reader.
    //
    // It also fixes the STACKED case, which is the one that reaches a visitor. `DemoExperience`
    // renders `AlertDialog` after every other overlay (`CentredDialog.tsx:170-176`) so an alert can
    // be raised over an open confirmation. Both used to capture the same button; dismissing the
    // alert then yanked focus out of the still-open confirmation to a control behind its scrim.
    // Now the alert falls back to `document.activeElement` — the confirmation's own panel — and
    // hands focus back there, which is where the visitor still is.
    const captured = activationOrigin?.isConnected ? activationOrigin : null
    activationOrigin = null
    const active = document.activeElement
    const opener = captured ?? (active instanceof HTMLElement && active !== document.body ? active : null)
    focusRef?.current?.focus()
    return () => {
      if (canTakeFocus(opener)) opener.focus()
    }
    // Mount/unmount only: `focusRef` is a stable ref object and `enabled` is constant per mount
    // at every current caller. A caller that flips `enabled` mid-life gets a re-run, which is the
    // correct behaviour for it — the hand-back is an unmount cleanup either way.
  }, [focusRef, enabled])
}
