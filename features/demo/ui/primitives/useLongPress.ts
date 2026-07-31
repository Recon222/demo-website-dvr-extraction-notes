'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

/**
 * Pointer long-press, with the click that follows it SWALLOWED and the OS context menu that
 * accompanies it CONSUMED.
 *
 * The demo's honest web equivalent of the phone's long-press gesture (parity plan §5:
 * "web: pointer long-press + row action buttons — match intent, not gesture"). Callers pair it
 * with a VISIBLE actions button — a hold is undiscoverable, unreachable from a keyboard and
 * unannounced to a screen reader, so it is an accelerator, never the only way in.
 *
 * ONE HOOK, for real this time (P3 review R-1). THREE shipped in P3 — P3.1's
 * `ui/primitives/useLongPress.ts`, P3.5's `ui/useLongPress.ts` and P3.2's private copy inside
 * `DashboardScreen.tsx`. The first two merged silently at different paths (§56f); the third the
 * assembly never saw, because it was not a module at all. This is the union of all three, and
 * the surviving lesson is worth stating plainly: **a shared primitive re-implemented at a new
 * path, or inline in a screen, will not conflict with the copy it duplicates.**
 *
 * ## The platform fact both halves encode
 *
 * A TOUCH hold fires the delay timer AND raises the OS `contextmenu` a moment later — one
 * gesture, two events. A MOUSE hold fires the timer and raises no `contextmenu` at all. So:
 *
 * - a `fired` latch is required, or the touch gesture runs the callback twice (P3.1/P3.5's
 *   hooks: `onContextMenu` called `clear()`, which only cancels a PENDING timer and is a no-op
 *   once the timer has fired, then invoked the callback unconditionally — on the Cases rows,
 *   whose callback is a toggle, that read as open-then-close, i.e. the hold doing nothing);
 * - the latch must be cleared at the START of every gesture, INCLUDING a secondary-button one,
 *   or a mouse hold leaves it standing and the next genuine right-click is swallowed (P3.2's
 *   copy reset it only after the `e.button !== 0` early return).
 *
 * Hence the ordering below: **reset first, guard second.** It is commit `2b18a0a`'s
 * "every new gesture starts from a clean slate" rule, applied to both latches rather than one.
 *
 * ## The swallow
 *
 * The rows this attaches to are already interactive (a case header toggles, a location row
 * opens the wizard), so a hold that fired its action and then let the trailing click through
 * would open the wizard on the very row the operator was reaching for the actions on.
 * `onClickCapture` runs before any `onClick` on the same element **or below it**, and stopping
 * propagation there stops React's bubble dispatch outright. That subtree reach is why the
 * capture mechanism was kept over P3.5's `guardClick(run)` wrapper, which only ever guards the
 * one callback it is threaded through.
 *
 * KEYBOARD IS NEVER SWALLOWED: a click synthesised by Enter/Space carries `detail === 0`.
 *
 * ## Nested controls
 *
 * A hold that starts on a control OTHER than the long-press surface itself does not arm —
 * those own their own press, as the phone's inner Touchables claim the responder. The check is
 * `closest(control) !== e.currentTarget`, which is uniform across both layouts **only because
 * each caller attaches the hook to the element that IS the gesture surface**:
 *
 * - Dashboard: the card DIV. A press on a location pill or the ⋯ button resolves to that
 *   control, which is not the card — bail.
 * - Cases: the row/header BUTTON itself. A press anywhere inside resolves to that same button —
 *   arm. The ⋯ trigger is its SIBLING, outside the surface, so it never reaches this hook.
 *
 * P3.2's bail was `e.target.closest('button')` with no `currentTarget` comparison. Lifting THAT
 * verbatim, as the review's fix shape suggested, would have killed the Cases gesture outright:
 * every pointerdown there lands inside a `<button>`, so every hold would bail. The comparison is
 * what makes one rule serve both.
 *
 * `enabled: false` makes every handler inert (the phone's "swipe disabled while the card is
 * expanded" rule) and cancels any hold already in progress.
 */

/**
 * React Native's `Pressable`/`TouchableOpacity` default `delayLongPress`. The phone's row
 * affordances all sit behind a deliberate hold — `LocationItem`'s `onLongPress`
 * (`LocationItem.tsx:34-38`) uses this default — so the demo holds for the same beat.
 *
 * THE one definition: P3.2's card re-declared its own `LONG_PRESS_MS = 500` while three suites
 * imported this one, so the shared beat could have been changed with the dashboard left behind
 * and every test green.
 */
export const LONG_PRESS_MS = 500

/** A press that wanders further than this is a drag/scroll, not a hold. */
const MOVE_TOLERANCE_PX = 10

/**
 * Controls that own their own press. Anything matching this that is not the gesture surface
 * itself suppresses the hold — see "Nested controls" above.
 */
const NESTED_CONTROL_SELECTOR = 'button, a, input, select, textarea, [role="button"]'

/**
 * Spread into a long-press surface's own `style`. A hold that selects the row's text reads as a
 * broken gesture rather than a menu about to appear (review R-1's WEB-8 rider).
 *
 * Deliberately NOT part of the returned handler object: callers spread that object alongside
 * their own `style` prop, and a `style` key inside it would silently win or lose depending on
 * attribute order at each call site.
 */
export const LONG_PRESS_SURFACE_STYLE = { userSelect: 'none' } as const satisfies CSSProperties

export interface LongPressHandlers {
  onPointerDown(e: ReactPointerEvent): void
  onPointerUp(): void
  onPointerLeave(): void
  onPointerCancel(): void
  onPointerMove(e: ReactPointerEvent): void
  onContextMenu(e: ReactMouseEvent): void
  onClickCapture(e: ReactMouseEvent): void
}

export function useLongPress(
  onLongPress: () => void,
  { enabled = true, delayMs = LONG_PRESS_MS }: { enabled?: boolean; delayMs?: number } = {},
): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  /** Set when the timer fires; consumed by the trailing click. */
  const swallowNextClick = useRef(false)
  /**
   * Set when a TOUCH hold's timer fires; consumed by that gesture's trailing `contextmenu`.
   *
   * Touch-only, deliberately (review R-20). It used to be set for every hold, which was
   * correct for every `contextmenu` PRECEDED BY A POINTERDOWN — R-1's reset-first-guard-second
   * rule covers those. The keyboard context-menu key (Shift+F10, or the Menu key) raises
   * `contextmenu` on the FOCUSED element with no pointer event at all, so nothing cleared the
   * latch and the first press after a mouse hold was swallowed. R-1's own improvement made
   * that reachable: the Cases gesture surface is now a real `<button>`, hence focusable.
   *
   * Setting the latch only when it can be NEEDED removes the residual class rather than adding
   * a second clearing path: a mouse hold raises no trailing `contextmenu`, so it never had a
   * use for it. The dashboard card was never affected — a non-focusable `<div>` receives no
   * keyboard context-menu event.
   */
  const fired = useRef(false)
  /** The pointer type of the gesture in flight, read by the timer body (see `fired`). */
  const pointerType = useRef<string>('')
  // Held in a ref so the returned handlers stay stable across the re-render the long-press
  // itself causes (opening the tray) — a handler identity change mid-gesture is how
  // pointerup/pointerdown pairs get orphaned.
  const cb = useRef(onLongPress)
  cb.current = onLongPress

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    origin.current = null
  }, [])

  // A hold in flight when the row is disabled (its card just expanded) or unmounted (its case
  // was just deleted) must not fire into a surface that no longer exists.
  useEffect(() => {
    if (!enabled) clear()
  }, [enabled, clear])
  useEffect(() => clear, [clear])

  return {
    onPointerDown: (e) => {
      // RESET FIRST, GUARD SECOND — load-bearing, see the header. Both latches belong to the
      // gesture that just ENDED, and this is the start of a new one whatever its button. The
      // secondary-button case is the whole point: a mouse hold raises no `contextmenu` to
      // consume `fired`, so the right-click that follows must be the thing that clears it.
      swallowNextClick.current = false
      fired.current = false
      clear()
      if (!enabled) return
      if (e.button !== 0) return // primary button only; a right-click is the context-menu path
      if (isNestedControl(e)) return
      pointerType.current = e.pointerType
      origin.current = { x: e.clientX, y: e.clientY }
      timer.current = setTimeout(() => {
        timer.current = null
        swallowNextClick.current = true
        // Only a touch hold raises a trailing `contextmenu` to be consumed — see `fired`.
        fired.current = pointerType.current === 'touch'
        cb.current()
      }, delayMs)
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onPointerMove: (e) => {
      const start = origin.current
      if (start === null) return
      if (Math.abs(e.clientX - start.x) > MOVE_TOLERANCE_PX || Math.abs(e.clientY - start.y) > MOVE_TOLERANCE_PX) {
        clear()
      }
    },
    onContextMenu: (e) => {
      if (!enabled) return
      // Suppressed whole-element, nested controls included: the browser menu must not cover the
      // tray, and on touch this is the same gesture as the hold, so the OS selection menu must
      // not appear over it either.
      e.preventDefault()
      clear()
      if (fired.current) {
        fired.current = false // this gesture already ran the callback — consume, don't repeat
        return
      }
      cb.current()
    },
    onClickCapture: (e) => {
      if (!swallowNextClick.current) return
      swallowNextClick.current = false
      if (e.detail === 0) return // keyboard activation — never a hold's trailing click
      e.preventDefault()
      e.stopPropagation()
    },
  }
}

/** True when the press landed on a control that is not the gesture surface itself. */
function isNestedControl(e: ReactPointerEvent): boolean {
  if (!(e.target instanceof Element)) return false
  const control = e.target.closest(NESTED_CONTROL_SELECTOR)
  return control !== null && control !== e.currentTarget
}
