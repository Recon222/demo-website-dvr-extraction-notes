'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

/**
 * Pointer long-press on a row, with the click that follows it SWALLOWED.
 *
 * The demo's honest web equivalent of the phone's long-press gesture (parity plan §5:
 * "web: pointer long-press + row action buttons — match intent, not gesture"). Callers pair it
 * with a VISIBLE actions button — a hold is undiscoverable, unreachable from a keyboard and
 * unannounced to a screen reader, so it is an accelerator, never the only way in.
 *
 * ONE HOOK (P3 assembly). P3.1 and P3.5 each shipped one, at different paths
 * (`ui/primitives/useLongPress.ts` and `ui/useLongPress.ts`), so git merged both in silently
 * rather than conflicting. This is their union, at P3.1's path — `primitives/` is the
 * documented home for UI primitives. From P3.1: the `enabled` gate and the capture-phase
 * swallow. From P3.5: the context-menu gesture, the movement tolerance, and the keyboard-safe
 * `detail` check.
 *
 * THE SWALLOW is the whole difficulty and the reason this is a hook rather than a `setTimeout`
 * at each call site: the rows this attaches to are already interactive (a case header toggles,
 * a location row opens the wizard), so a hold that fired its action and then let the click
 * through would open the wizard on the very row the operator was reaching for the actions on.
 * `onClickCapture` runs before any `onClick` on the same element **or below it**, and stopping
 * propagation there stops React's bubble dispatch outright, so neither the row's own handler
 * nor a sibling control in the same strip sees it. That subtree reach is why the capture
 * mechanism was kept over P3.5's `guardClick(run)` wrapper: these rows hold more than one
 * interactive child, and a wrapper only ever guards the one handler it is threaded through.
 *
 * KEYBOARD IS NEVER SWALLOWED: a click synthesised by Enter/Space carries `detail === 0`, which
 * also clears a flag left standing by a hold that ended off-element (no click follows a release
 * outside the row, so nothing consumes the flag until the next gesture).
 *
 * `enabled: false` makes every handler inert (the phone's "swipe disabled while the card is
 * expanded" rule) and cancels any hold already in progress.
 */

/**
 * React Native's `Pressable`/`TouchableOpacity` default `delayLongPress`. The phone's row
 * affordances all sit behind a deliberate hold — `LocationItem`'s `onLongPress`
 * (`LocationItem.tsx:34-38`) uses this default — so the demo holds for the same beat.
 */
export const LONG_PRESS_MS = 500

/** A press that wanders further than this is a drag/scroll, not a hold. */
const MOVE_TOLERANCE_PX = 10

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
  const swallowNextClick = useRef(false)
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
      if (!enabled) return
      if (e.button !== 0) return // primary button only; a right-click is the context-menu path
      // A new gesture starts with a clean slate. Without this, a hold whose pointer was
      // released OFF the row (no click follows, so nothing consumes the flag) would leave it
      // armed and eat the row's next genuine tap. The timer below re-arms it if this gesture
      // also turns into a hold, so the swallow itself is unaffected.
      swallowNextClick.current = false
      clear()
      origin.current = { x: e.clientX, y: e.clientY }
      timer.current = setTimeout(() => {
        timer.current = null
        swallowNextClick.current = true
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
      e.preventDefault() // and with it the touch-hold menu that would cover the tray
      clear()
      // No swallow flag: a context-menu gesture produces no follow-up click to eat.
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
