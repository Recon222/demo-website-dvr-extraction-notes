'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

/**
 * React Native's `Pressable`/`TouchableOpacity` default long-press delay. The phone's
 * destructive row affordances all sit behind a deliberate hold or drag — `LocationItem`'s
 * `onLongPress` (`LocationItem.tsx:34-38`) uses this default — so the demo holds for the same
 * beat rather than inventing its own.
 */
export const LONG_PRESS_MS = 500

export interface LongPressHandlers {
  onPointerDown(e: ReactPointerEvent): void
  onPointerUp(): void
  onPointerLeave(): void
  onPointerCancel(): void
  onClickCapture(e: ReactMouseEvent): void
}

/**
 * Pointer long-press on a row, with the click that follows it SWALLOWED.
 *
 * The swallow is the whole difficulty and the reason this is a hook rather than a `setTimeout`
 * at each call site: the rows this is attached to are already interactive (a case header
 * toggles, a location row opens the wizard), so a hold that fired its action and then let the
 * click through would open the wizard on the very row the operator was reaching for the delete
 * affordance on. `onClickCapture` runs before any `onClick` on the same element or below it,
 * and stopping propagation there stops the native event outright, so the row's own handler
 * never sees it. The flag clears on that first swallowed click — a normal tap after it works.
 *
 * `enabled: false` makes every handler inert (used to honour the phone's "swipe disabled while
 * the card is expanded" rule), and cancels any hold already in progress.
 */
export function useLongPress(
  onLongPress: () => void,
  { enabled = true, delayMs = LONG_PRESS_MS }: { enabled?: boolean; delayMs?: number } = {},
): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
      if (e.button !== 0) return // primary button only; a right-click is not a long press
      // A new gesture starts with a clean slate. Without this, a hold whose pointer was
      // released OFF the row (no click follows, so nothing consumes the flag) would leave it
      // armed and eat the row's next genuine tap. The timer below re-arms it if this gesture
      // also turns into a hold, so the swallow itself is unaffected.
      swallowNextClick.current = false
      clear()
      timer.current = setTimeout(() => {
        timer.current = null
        swallowNextClick.current = true
        cb.current()
      }, delayMs)
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClickCapture: (e) => {
      if (!swallowNextClick.current) return
      swallowNextClick.current = false
      e.preventDefault()
      e.stopPropagation()
    },
  }
}
