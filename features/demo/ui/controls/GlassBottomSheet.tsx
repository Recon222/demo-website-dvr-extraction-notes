'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import {
  SCRIM_FADE_KEYFRAME,
  SHEET_ENTER_MS,
  SHEET_EXIT_MS,
  SHEET_SLIDE_KEYFRAME,
  sheetAccentDot,
  sheetAccentStrip,
  sheetBody,
  sheetBodyFill,
  sheetFooter,
  sheetHandle,
  sheetHandleZone,
  sheetHeaderBand,
  sheetHeaderTitleRow,
  sheetScrim,
  sheetSubtitle,
  sheetSurface,
  sheetTitle,
} from '@/features/demo/ui/controls/sheet-chrome'

/**
 * The LOWEST layer a sheet paints on — its scrim; the panel sits one above (`+ 1`).
 *
 * Exported (review FD-2) because it is the upper bound of the modal-over-modal ordering: a
 * sheet that OPENS pickers (the User Profile editor, whose two date fields do) must stay
 * strictly below this, or the picker it opened would render behind it. Bounding against the
 * scrim rather than the panel is deliberate — the scrim is what dims the surface underneath,
 * so it is the layer the opener has to be under.
 *
 * The NAME is kept and the NUMBER must not move (D14 froze the z schemes; three pins in
 * `settings/__tests__/UserProfilePane.test.tsx:306,315,316` read it, and `screens/_shared.tsx`
 * `:30`/`:92` reason about it by name). It moved FILE in U4.1 because the shell that paints it
 * moved file; `inputs/PickerSheet.tsx` re-exports it so every existing import is unchanged.
 */
export const PICKER_SHEET_Z = 31

/**
 * The demo's frozen phone-screen height (`PhoneFrame.tsx:55`, plan §4.2). Stands in for the
 * phone's `Dimensions.get('window').height` (`GlassBottomSheet.tsx:26`) as the dismiss
 * threshold's fallback when the sheet has not been measured.
 */
const SCREEN_FALLBACK_HEIGHT = 786

/** Fraction of the sheet's height a downward drag must exceed to dismiss. Phone `:35`. */
export const DISMISS_DISTANCE_RATIO = 0.25
/** Downward fling velocity (px/s) that dismisses regardless of distance. Phone `:37`. */
export const DISMISS_VELOCITY = 800
/**
 * Downward travel before the drag CLAIMS the pointer — the web analog of the phone's
 * `Gesture.Pan().activeOffsetY(10)` (`:242`), and it is there for the same reason: the grab
 * zone contains the header, so a tap must still reach the ✕ or whatever the caller put in
 * `headerRight`. Capturing the pointer on `pointerdown` would swallow that click.
 */
const DRAG_ACTIVATE_PX = 10
/**
 * Floor on the interval a velocity sample is divided by, in ms — one frame at 60Hz.
 *
 * `pointermove` can fire twice inside the same millisecond, and `event.timeStamp` has ms
 * resolution, so an unfloored `delta / dt` turns a sub-frame sample into an arbitrarily large
 * px/s figure and flings the sheet shut on a drag that barely moved. Sub-frame timing is noise;
 * a real interval larger than this is used as measured. Measured consequence in jsdom, where
 * every synthetic move lands 0-1ms apart: without the floor the flick arm fires
 * nondeterministically and the "drag falls short" case passes or fails by the run.
 */
const MIN_VELOCITY_SAMPLE_MS = 1000 / 60

/**
 * Pure dismiss decision for a downward drag-release on the sheet — phone `:44-51`, ported
 * verbatim including the fallback.
 *
 * Dismiss if dragged past a fraction of the sheet height OR flung down fast. Upward
 * drags/velocity never dismiss (both comparisons are strictly greater against positive
 * thresholds, so a negative `translationY`/`velocityY` fails both).
 *
 * NOT `MapBottomSheet`'s `DRAG_THRESHOLD = 40`. That constant is frozen (plan §4.2) and it
 * decides a DETENT STEP on a three-snap sheet, not a dismissal; the plan's U4.1 row conflates
 * the two. The phone's dismissal rule is this ratio-plus-velocity pair and nothing else.
 */
export function shouldDismissSheet(
  translationY: number,
  velocityY: number,
  sheetHeight: number,
): boolean {
  const distanceThreshold = (sheetHeight || SCREEN_FALLBACK_HEIGHT) * DISMISS_DISTANCE_RATIO
  return translationY > distanceThreshold || velocityY > DISMISS_VELOCITY
}

/**
 * The three states a sheet can be in, and the only three.
 *
 *   closed  → nothing rendered. No scrim, no key listener, no layer occupied.
 *   open    → `visible`, playing or having played the enter.
 *   closing → NOT `visible`, still mounted so the exit can play. Left after `SHEET_EXIT_MS`.
 *
 * `closing` is unreachable under reduced motion, by construction: with no animation there is
 * nothing to wait out, so waiting would leave the sheet up for 200ms of nothing. That is the
 * one invalid state this machine exists to exclude.
 *
 * DECISION — the exit is timed off `SHEET_EXIT_MS`, not off `animationend`.
 * `animationend` is the tidier mechanism and it is UNOBSERVABLE here: this jsdom defines no
 * `AnimationEvent` (measured — `typeof AnimationEvent === 'undefined'`), so
 * `fireEvent.animationEnd` reaches no React handler at all and an `onAnimationEnd` exit would
 * be a code path no test in this repo can execute. It also hangs the sheet in a real browser
 * whenever the animation is dropped or interrupted. The timer duplicates nothing: the same
 * `SHEET_EXIT_MS` builds the CSS duration two lines below.
 */
type SheetPhase = 'closed' | 'open' | 'closing'

export interface GlassBottomSheetProps {
  /** Controls visibility. The parent owns this state. */
  visible: boolean
  /** Called on scrim click, swipe-down, Escape, and whatever the caller puts in `footer`. */
  onClose(): void
  /** Uppercased header title. Also the dialog's accessible name. */
  title: string
  /** Secondary line under the title (e.g. a count). */
  subtitle?: string
  /**
   * Trailing slot in the header row, opposite the title — a ✕, a filter reset, nothing.
   *
   * The shell owns NO close affordance of its own, exactly as the phone's does not
   * (`GlassBottomSheet.tsx:135-137`): what it would say and do is the caller's. `PickerSheet`
   * passes the demo's existing ✕ through here; matrix A82's map filters sheet passes nothing
   * and puts "Done" in the footer.
   */
  headerRight?: ReactNode
  /**
   * Screen-reader label for the dismiss scrim. Phone `:105`, `closeLabel="Close export
   * options"` / `"Close map filters"` / `"Close media library"` at its three call sites.
   *
   * OPTIONAL, and the scrim is announced ONLY when it is given — which is the demo's honest
   * difference from the phone. There, the scrim is the only dismiss affordance, so it always
   * carries the label. Here a sheet that renders a labelled ✕ already has one, and giving the
   * scrim the same words would put two identically-named controls in the tree. Pass it when
   * the sheet has no visible close control (A82's does not); leave it off when `headerRight`
   * carries one.
   */
  closeLabel?: string
  /** Sheet body — fills the sheet edge to edge. Content pads itself (A82 carries 16/16/8). */
  children: ReactNode
  /** Sticky footer, below the body and never scrolled away. */
  footer?: ReactNode
  /** Max sheet height as a fraction of the screen. Phone default 0.9 (`:153`). */
  maxHeightRatio?: number
  /**
   * Give the sheet a DEFINITE height instead of hugging its content, so a scrolling list body
   * can `flex: 1` into it. Off by default because every picker depends on shrink-to-content.
   * Phone `:75-86`.
   */
  fillHeight?: boolean
  /** Show the drag-handle pill. Phone default true (`:156`). */
  showHandle?: boolean
  /**
   * Show the tapering accent strip under the header. Phone default true (`:157`). Reads well
   * over a flat surface (calendar) but is noise over a recessed drum or list, so those callers
   * turn it off.
   */
  showAccentStrip?: boolean
}

/**
 * SEAM(U4.1b) — `GlassBottomSheet`, the demo's ONE bottom-sheet shell. Matrix A58.
 *
 * Phone twin: `src/components/common/GlassBottomSheet.tsx` at `dd5551ec`. This is the
 * generalisation of the demo's own `PickerSheet`, in place rather than beside it: that
 * component already had the portal, the scrim, `title` + `footer`, the slide-up and three of
 * the four close routes, and building a second shell next to it would have made a FOURTH sheet
 * implementation in a package whose whole point is to end up with one. `inputs/PickerSheet.tsx`
 * is now a preset over this file and its seven consumers are untouched.
 *
 * ## Four close routes, one handler
 *
 * Scrim click · swipe down past `shouldDismissSheet` · `Escape` (the web's analog of the
 * phone's Android hardware back, `:346`) · whatever the caller renders in `footer` or
 * `headerRight`. All four call `onClose` and nothing else; the parent decides what closing
 * means.
 *
 * ## The scrim FADES; it does not travel
 *
 * PR #127 (`07ff0ea4`) on the phone: `animationType="slide"` translated the Modal's entire
 * content view, so the scrim rode up from the bottom WITH the sheet and retracted with it
 * (`:373-375`). Here the two are siblings with separate animations — the panel on
 * `sheetUp` (transform), the scrim on `termFadeIn` (opacity) — so the scrim cannot inherit
 * the panel's transform. That separation is structural, not a value, and is pinned as one.
 *
 * ## The phone's enter-gate (DEF-065) has no web counterpart, deliberately
 *
 * The phone holds its enter until the first `onLayout` because its transform interpolates
 * against a MEASURED `sheetHeight`, which is 0 on a mount's first open (`:180-192`); without
 * the gate the sheet sat offscreen for ~140ms while the scrim faded on schedule. CSS
 * `translateY(100%)` is self-relative, so there is nothing to measure and nothing to gate:
 * the enter is correct from the first frame. The `!isExiting` guard DEF-065 records as
 * un-pinnable exists only to protect that gate, so it has nothing to protect here either.
 * This is an absence with a reason, not an omission.
 */
export function GlassBottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  headerRight,
  closeLabel,
  children,
  footer,
  maxHeightRatio = 0.9,
  fillHeight = false,
  showHandle = true,
  showAccentStrip = true,
}: GlassBottomSheetProps) {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<SheetPhase>(visible ? 'open' : 'closed')
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (visible) {
      setPhase('open')
      return
    }
    // Never enter `closing` with no animation to leave it on — see `SheetPhase`. The
    // functional form is what keeps an already-`closed` sheet from mounting an exit it never
    // opened for (a `visible={false}` sheet re-rendering for an unrelated prop change).
    setPhase((previous) => (previous === 'closed' || reducedMotion ? 'closed' : 'closing'))
  }, [visible, reducedMotion])

  useEffect(() => {
    if (phase !== 'closing') return
    const timer = window.setTimeout(() => setPhase('closed'), SHEET_EXIT_MS)
    // Cancels on re-open (`closing` -> `open`) as well as on unmount. Without it a sheet
    // re-shown mid-exit is unmounted a moment later, in the middle of its own enter.
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  // --- swipe-to-dismiss -------------------------------------------------------------------
  // One ref, not four pieces of state: nothing here should re-render until the drag actually
  // claims the pointer, and the velocity sample must be read at pointer time rather than at
  // the last committed render.
  const drag = useRef<{
    startY: number
    lastY: number
    lastT: number
    velocity: number
    /** Set once the drag has travelled `DRAG_ACTIVATE_PX` and CLAIMED the pointer. Explicit
     *  rather than inferred from `dragY !== 0`, because a drag that returns to its start has
     *  a zero offset and is still very much claimed. */
    active: boolean
  } | null>(null)
  const [dragY, setDragY] = useState(0)

  const endDrag = useCallback(
    (clientY: number) => {
      const state = drag.current
      drag.current = null
      setDragY(0)
      if (state === null) return
      const travelled = clientY - state.startY
      const height = panelRef.current?.getBoundingClientRect().height ?? 0
      if (shouldDismissSheet(travelled, state.velocity, height)) onClose()
    },
    [onClose],
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, velocity: 0, active: false }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (state === null) return
    if (e.buttons === 0) {
      // The button is no longer down — a release we never got a `pointerup` for. Ending here
      // is what stops the sheet being stranded stuck to the cursor; `MapBottomSheet:79-84`
      // carries the same safety net for the same reason.
      endDrag(e.clientY)
      return
    }
    const dt = Math.max(e.timeStamp - state.lastT, MIN_VELOCITY_SAMPLE_MS)
    state.velocity = ((e.clientY - state.lastY) / dt) * 1000
    state.lastY = e.clientY
    state.lastT = e.timeStamp

    const travelled = e.clientY - state.startY
    if (!state.active) {
      if (travelled <= DRAG_ACTIVATE_PX) return
      state.active = true
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId)
      } catch {
        /* jsdom / unsupported — the `e.buttons` guard above is the safety net */
      }
    }
    // Negative travel is left to the `dragY > 0` guard on the transform rather than clamped
    // here: an upward drag on a bottom sheet moves nothing, and a `Math.max(0, ...)` would be
    // a second guard saying the same thing that no test could tell from its absence.
    setDragY(travelled)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => endDrag(e.clientY)

  if (phase === 'closed') return null

  const closing = phase === 'closing'
  const durationMs = closing ? SHEET_EXIT_MS : SHEET_ENTER_MS
  // `reverse` plays the keyframes end-to-start and `forwards` holds the result, so the exit is
  // the enter run backwards rather than a second keyframe block D9 would not let us add.
  const direction = closing ? ' reverse forwards' : ''
  const animation = (name: string) => (reducedMotion ? undefined : `${name} ${durationMs}ms ease${direction}`)

  const panel: CSSProperties = {
    ...sheetSurface,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: PICKER_SHEET_Z + 1,
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
    // The phone also takes `insets.top` here (`:421`), because at fill height its chrome can
    // reach the status bar. NOT ported: nothing inside the demo's 378x786 frame has a status
    // bar, `env(safe-area-inset-top)` resolves to 0 there, matrix A58 names only the BOTTOM
    // inset, and jsdom drops `env()` so the line would be unpinnable as well as inert.
    ...(fillHeight ? { height: `${Math.round(maxHeightRatio * 100)}%` } : null),
    // Only while the finger is down: a transform written every render would fight the enter.
    ...(dragY > 0 ? { transform: `translateY(${dragY}px)` } : null),
    animation: animation(SHEET_SLIDE_KEYFRAME),
  }

  // Handle + header are the non-scrolling grab zone, exactly as on the phone (`:295-370`):
  // the body keeps its own scroll because the drag never covers it.
  const chrome = (
    <div
      data-sheet-grab
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'none', flexShrink: 0 }}
    >
      {showHandle && (
        <div style={sheetHandleZone}>
          <div data-sheet-handle style={sheetHandle} />
        </div>
      )}

      <div style={sheetHeaderBand}>
        <div style={sheetHeaderTitleRow}>
          <div style={sheetAccentDot} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={sheetTitle}>{title}</div>
            {subtitle && <div style={sheetSubtitle}>{subtitle}</div>}
          </div>
        </div>
        {headerRight}
      </div>

      {showAccentStrip && <div data-sheet-accent-strip style={sheetAccentStrip} />}
    </div>
  )

  return (
    <PhoneOverlayPortal>
      <div
        data-sheet-scrim
        // Announced only when the caller named what is being dismissed — see `closeLabel`.
        role={closeLabel ? 'button' : undefined}
        aria-label={closeLabel}
        onClick={onClose}
        style={{ ...sheetScrim, zIndex: PICKER_SHEET_Z, animation: animation(SCRIM_FADE_KEYFRAME) }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={panel}
      >
        {chrome}
        <div data-sheet-body style={fillHeight ? sheetBodyFill : sheetBody}>
          {children}
        </div>
        {footer && <div style={sheetFooter}>{footer}</div>}
      </div>
    </PhoneOverlayPortal>
  )
}
