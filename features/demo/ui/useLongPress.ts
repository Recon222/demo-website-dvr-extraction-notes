'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

/**
 * The demo's honest web equivalent of the phone's long-press gesture (P3.5; parity plan §5:
 * "web: pointer long-press + row action buttons — match intent, not gesture").
 *
 * A pointer held still on the element for `delayMs` fires `onLongPress`; a right-click /
 * context-menu gesture fires it too, which is the desktop idiom for "actions for this row"
 * and also suppresses the browser menu that a touch-hold would otherwise raise. Callers pair
 * this with a VISIBLE actions button — the gesture alone is undiscoverable and unreachable by
 * keyboard, so it is an accelerator, never the only way in.
 *
 * `delayMs` defaults to React Native's own `delayLongPress` (500ms), so the demo and the phone
 * respond to the same hold.
 */
export const LONG_PRESS_MS = 500

/** A press that wanders further than this is a drag/scroll, not a hold. */
const MOVE_TOLERANCE_PX = 10

export interface LongPressBinding {
  /** Spread onto the pressable element. */
  handlers: {
    onPointerDown(e: ReactPointerEvent): void
    onPointerUp(): void
    onPointerCancel(): void
    onPointerMove(e: ReactPointerEvent): void
    onContextMenu(e: ReactMouseEvent): void
  }
  /**
   * Wraps the element's own click handler so the click that ENDS a long press is swallowed
   * (otherwise a hold on a row would both open the chooser and activate the row).
   *
   * Keyboard activation is never swallowed: a click synthesised by Enter/Space carries
   * `detail === 0`, which also clears a flag left standing by a hold that ended off-element.
   */
  guardClick(run: () => void): (e: ReactMouseEvent) => void
}

export function useLongPress(onLongPress: () => void, opts: { delayMs?: number } = {}): LongPressBinding {
  const delayMs = opts.delayMs ?? LONG_PRESS_MS
  // The callback is read through a ref so a fresh closure per render never restarts a timer
  // mid-press (the DemoNotification idiom).
  const cbRef = useRef(onLongPress)
  cbRef.current = onLongPress

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    origin.current = null
  }, [])

  // A press in flight when the row unmounts (case collapsed, list re-rendered) must not fire.
  useEffect(() => clear, [clear])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return // secondary buttons are the context-menu path
      clear()
      fired.current = false
      origin.current = { x: e.clientX, y: e.clientY }
      timer.current = setTimeout(() => {
        timer.current = null
        fired.current = true
        cbRef.current()
      }, delayMs)
    },
    [clear, delayMs],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const start = origin.current
      if (!start) return
      if (Math.abs(e.clientX - start.x) > MOVE_TOLERANCE_PX || Math.abs(e.clientY - start.y) > MOVE_TOLERANCE_PX) {
        clear()
      }
    },
    [clear],
  )

  const onContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault() // and with it the touch-hold menu that would cover the chooser
      clear()
      // No `fired` flag here: a context-menu gesture produces no follow-up click to swallow.
      cbRef.current()
    },
    [clear],
  )

  const guardClick = useCallback(
    (run: () => void) => (e: ReactMouseEvent) => {
      const swallow = fired.current && e.detail > 0
      fired.current = false
      if (swallow) return
      run()
    },
    [],
  )

  // No `onPointerLeave`: on touch, `pointerleave` fires BEFORE the compatibility click, so
  // cancelling there would defeat the click guard on exactly the platform the gesture is for.
  // A mouse wandering off the row trips the move tolerance instead.
  return {
    handlers: { onPointerDown, onPointerUp: clear, onPointerCancel: clear, onPointerMove, onContextMenu },
    guardClick,
  }
}
