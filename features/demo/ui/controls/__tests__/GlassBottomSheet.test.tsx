import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CSSProperties, ReactNode } from 'react'
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  DISMISS_DISTANCE_RATIO,
  DISMISS_VELOCITY,
  GlassBottomSheet,
  PICKER_SHEET_Z,
  shouldDismissSheet,
} from '@/features/demo/ui/controls/GlassBottomSheet'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'
import {
  SCRIM_FADE_KEYFRAME,
  SHEET_ENTER_MS,
  SHEET_EXIT_MS,
  SHEET_SLIDE_KEYFRAME,
  sheetAccentStrip,
  sheetHandle,
  sheetHeaderBand,
  sheetScrim,
  sheetSurface,
} from '@/features/demo/ui/controls/sheet-chrome'

/**
 * SEAM(U4.1b) — matrix A58.
 *
 * MOTION MODE: every case below runs motion-ON unless it calls `preferReducedMotion()`.
 * `vitest.setup.ts:47-60` hard-codes `matchMedia().matches` to false, so that is the default
 * and the gate would otherwise never be exercised — the mirror of the v1 campaign's loss
 * (`docs/planning/demo-phone-parity/HANDOFF.md:5`).
 */

/** jsdom re-spaces `rgba()` on the way back out of the CSSOM. Same shape as `CentredDialog.test.tsx:46`. */
const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')

const realMatchMedia = window.matchMedia
function preferReducedMotion() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
afterEach(() => {
  window.matchMedia = realMatchMedia
})

function mount(props: Partial<Parameters<typeof GlassBottomSheet>[0]> = {}) {
  const onClose = props.onClose ?? vi.fn()
  const utils = render(
    <GlassBottomSheet visible title="Select Date" {...props} onClose={onClose}>
      {props.children ?? <div>body content</div>}
    </GlassBottomSheet>,
  )
  const rerender = (next: Partial<Parameters<typeof GlassBottomSheet>[0]>, children?: ReactNode) =>
    utils.rerender(
      <GlassBottomSheet visible title="Select Date" {...props} {...next} onClose={onClose}>
        {children ?? props.children ?? <div>body content</div>}
      </GlassBottomSheet>,
    )
  return { ...utils, onClose, rerender }
}

const panel = () => screen.getByRole('dialog')
const scrim = () => document.querySelector<HTMLElement>('[data-sheet-scrim]')!
const grab = () => document.querySelector<HTMLElement>('[data-sheet-grab]')!
const header = () => document.querySelector<HTMLElement>('[data-sheet-header]')!
const handle = () => document.querySelector<HTMLElement>('[data-sheet-handle]')!
const strip = () => document.querySelector<HTMLElement>('[data-sheet-accent-strip]')!

/**
 * Which of a fragment's declarations the rendered element is NOT carrying.
 *
 * W2/F28: this file had 45 cases and zero paint reads, so deleting `...sheetSurface` from the
 * panel survived all 3,881 tests — the gradient, the four border longhands, radius 22,
 * `SHEET_SHADOW` and `overflow: hidden` all vanished unobserved. `sheet-chrome.test.tsx` pins
 * the fragments and this file pins the behaviour; nothing joined the two. This is the join.
 *
 * Compared against what REACT makes of the fragment (a bare div carrying it) rather than a
 * hand-listed set of declarations — the idiom `SettingsModal.test.tsx:232-246` established, and
 * for its reason: `toHaveStyle` does not px-suffix a numeric value, so an object comparison
 * silently passes over half the keys. Reading `cssText` also means the per-side longhand rule
 * is satisfied for free: jsdom never synthesizes `border-color`, so whatever the fragment
 * declares is exactly what is compared.
 *
 * SUBSET, not equality: every element here composes its fragment with its own layout, z and
 * animation. What must hold is that none of the fragment's declarations went missing.
 */
function missing(el: HTMLElement, fragment: CSSProperties): string[] {
  const { container } = render(<div data-fragment-ref style={fragment} />)
  const reference = container.querySelector<HTMLElement>('[data-fragment-ref]')!
  const have = el.style.cssText
  return reference.style.cssText
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => !have.includes(d))
}
const body = () => document.querySelector<HTMLElement>('[data-sheet-body]')!

/**
 * A downward drag on the grab zone, delivered in `steps` moves.
 *
 * The step size is the flick signal: a velocity sample is `delta / max(dt, one frame) * 1000`,
 * and in jsdom every synthetic move lands 0-1ms apart, so the floor always binds and each
 * step of `d` px reads as `d * 60` px/s. Below ~13.3px per step the drag is a slow pull; above
 * it, a fling. Cases that mean one and not the other say which by choosing `steps`.
 */
function swipe(from: number, to: number, steps = 1) {
  const zone = grab()
  fireEvent.pointerDown(zone, { clientY: from, pointerId: 1 })
  for (let i = 1; i <= steps; i++) {
    fireEvent.pointerMove(zone, { clientY: from + ((to - from) * i) / steps, pointerId: 1, buttons: 1 })
  }
  fireEvent.pointerUp(zone, { clientY: to, pointerId: 1 })
}

// ---------------------------------------------------------------------------------------
// The state machine: closed / open / closing, times motion mode.
// ---------------------------------------------------------------------------------------

describe('GlassBottomSheet — the three phases', () => {
  it('renders NOTHING when it has never been visible', () => {
    mount({ visible: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelector('[data-sheet-scrim]')).toBeNull()
    expect(screen.queryByText('body content')).not.toBeInTheDocument()
  })

  it('stays unmounted across a re-render that never made it visible', () => {
    // The `previous === 'closed'` term in the phase reducer. Without it an unrelated prop
    // change on a hidden sheet mounts an exit animation for an open it never had.
    const { rerender } = mount({ visible: false })
    rerender({ visible: false, subtitle: '3 locations' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens with the enter motion on BOTH layers', () => {
    mount({ visible: true })
    expect(panel().style.animation).toBe(`${SHEET_SLIDE_KEYFRAME} ${SHEET_ENTER_MS}ms ease`)
    expect(scrim().style.animation).toBe(`${SCRIM_FADE_KEYFRAME} ${SHEET_ENTER_MS}ms ease`)
  })

  it('enters `closing` when hidden — still mounted, both layers running the exit backwards', () => {
    const { rerender } = mount({ visible: true })
    rerender({ visible: false })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(panel().style.animation).toBe(`${SHEET_SLIDE_KEYFRAME} ${SHEET_EXIT_MS}ms ease reverse forwards`)
    expect(scrim().style.animation).toBe(`${SCRIM_FADE_KEYFRAME} ${SHEET_EXIT_MS}ms ease reverse forwards`)
  })

  it('returns to `open` when re-shown mid-exit', () => {
    const { rerender } = mount({ visible: true })
    rerender({ visible: false })
    rerender({ visible: true })
    expect(panel().style.animation).toBe(`${SHEET_SLIDE_KEYFRAME} ${SHEET_ENTER_MS}ms ease`)
  })
})

describe('GlassBottomSheet — the exit is timed, and the timer is cancellable', () => {
  // `animationend` would be the tidier mechanism and is UNOBSERVABLE in this harness: this
  // jsdom defines no `AnimationEvent` (measured: `typeof AnimationEvent === 'undefined'`), so
  // `fireEvent.animationEnd` reaches no React handler and an `onAnimationEnd` exit would be a
  // path no test here can execute. These three cases are what that buys.
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('stays mounted for the whole exit window, then unmounts', () => {
    const { rerender } = mount({ visible: true })
    rerender({ visible: false })
    act(() => vi.advanceTimersByTime(SHEET_EXIT_MS - 1))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('CANCELS the pending unmount when re-shown mid-exit', () => {
    // Without the effect cleanup, a sheet re-opened during its exit is torn down a moment
    // later — in the middle of its own enter.
    const { rerender } = mount({ visible: true })
    rerender({ visible: false })
    act(() => vi.advanceTimersByTime(SHEET_EXIT_MS - 20))
    rerender({ visible: true })
    act(() => vi.advanceTimersByTime(SHEET_EXIT_MS * 3))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('never schedules an unmount under reduced motion — there is no exit to wait out', () => {
    preferReducedMotion()
    const { rerender } = mount({ visible: true })
    rerender({ visible: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('GlassBottomSheet — reduced motion', () => {
  it('paints no animation on either layer', () => {
    preferReducedMotion()
    mount({ visible: true })
    expect(panel().style.animation).toBe('')
    expect(scrim().style.animation).toBe('')
  })

  it('skips `closing` entirely — 200ms of nothing is not a transition', () => {
    // The single invalid state this machine exists to exclude. With no animation to wait out,
    // a `closing` phase would just hold the sheet up for 200ms after the caller closed it.
    preferReducedMotion()
    const { rerender } = mount({ visible: true })
    rerender({ visible: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('still opens, and still closes by every route', async () => {
    preferReducedMotion()
    const { onClose } = mount({ visible: true })
    expect(screen.getByText('body content')).toBeInTheDocument()
    fireEvent.click(scrim())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------------------
// Four close routes, one handler.
// ---------------------------------------------------------------------------------------

describe('GlassBottomSheet — the four close routes', () => {
  it('1. the scrim', () => {
    const { onClose } = mount({ visible: true })
    fireEvent.click(scrim())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('2. Escape — the web analog of the phone`s Android back', () => {
    const { onClose } = mount({ visible: true })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('3. a swipe down past the dismiss threshold', () => {
    const { onClose } = mount({ visible: true })
    // jsdom measures every element at height 0, so the threshold falls back to the frozen
    // 786px screen: 786 * 0.25 = 196.5. 30 steps of 10px is a slow pull (600 px/s), so this
    // dismisses on DISTANCE and the flick arm is not what closes it.
    swipe(100, 400, 30)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('4. whatever the caller puts in the footer', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mount({ visible: true, onClose, footer: <button onClick={onClose}>Done</button> })
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stops listening for Escape the moment it is hidden', () => {
    // Otherwise a sheet mid-exit fires a second `onClose` at a parent that has already closed
    // it — and, with a `closing` sheet still in the DOM, so would the sheet BELOW it.
    const { rerender, onClose } = mount({ visible: true })
    rerender({ visible: false })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not close when the body is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = mount({ visible: true, children: <div>inside</div> })
    await user.click(screen.getByText('inside'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------------------
// The swipe.
// ---------------------------------------------------------------------------------------

describe('shouldDismissSheet — the ported dismiss decision', () => {
  const H = 400
  const overDistance = H * DISMISS_DISTANCE_RATIO + 1

  it('does not dismiss on a small drag with no velocity', () => {
    expect(shouldDismissSheet(20, 0, H)).toBe(false)
  })

  it('does not dismiss exactly AT the distance threshold — strictly greater', () => {
    expect(shouldDismissSheet(H * DISMISS_DISTANCE_RATIO, 0, H)).toBe(false)
  })

  it('dismisses when dragged past the distance threshold', () => {
    expect(shouldDismissSheet(overDistance, 0, H)).toBe(true)
  })

  it('dismisses on a fast downward flick even with a small drag', () => {
    expect(shouldDismissSheet(10, DISMISS_VELOCITY + 1, H)).toBe(true)
    expect(shouldDismissSheet(10, DISMISS_VELOCITY, H)).toBe(false)
  })

  it('never dismisses on an upward drag or flick', () => {
    expect(shouldDismissSheet(-500, -5000, H)).toBe(false)
  })

  it('falls back to the frozen 786px screen height when unmeasured (0)', () => {
    expect(shouldDismissSheet(196, 0, 0)).toBe(false)
    expect(shouldDismissSheet(197, 0, 0)).toBe(true)
  })
})

describe('GlassBottomSheet — the drag', () => {
  it('follows the finger once past the activation offset', () => {
    mount({ visible: true })
    const zone = grab()
    fireEvent.pointerDown(zone, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(zone, { clientY: 160, pointerId: 1, buttons: 1 })
    expect(panel().style.transform).toBe('translateY(60px)')
  })

  it('ignores travel inside the 10px activation offset, so a header tap still reaches its button', async () => {
    // The web analog of the phone's `activeOffsetY(10)`. Capturing the pointer on pointerdown
    // would swallow the click on whatever the caller put in `headerRight`.
    const user = userEvent.setup()
    const onHeaderAction = vi.fn()
    const { onClose } = mount({
      visible: true,
      headerRight: <button onClick={onHeaderAction}>Close</button>,
    })
    const zone = grab()
    fireEvent.pointerDown(zone, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(zone, { clientY: 108, pointerId: 1, buttons: 1 })
    expect(panel().style.transform).toBe('')
    fireEvent.pointerUp(zone, { clientY: 108, pointerId: 1 })
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onHeaderAction).toHaveBeenCalledTimes(1)
  })

  it('springs back and leaves no transform behind when the drag falls short', () => {
    const { onClose } = mount({ visible: true })
    swipe(100, 250, 15) // 150px in 10px steps: under 196.5px AND under 800 px/s
    expect(onClose).not.toHaveBeenCalled()
    expect(panel().style.transform).toBe('')
  })

  it('dismisses on a FLICK the distance arm alone would refuse', () => {
    // 40px of travel — nowhere near 196.5 — delivered in one frame, i.e. 2400 px/s.
    const { onClose } = mount({ visible: true })
    swipe(100, 140, 1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('floors the velocity sample at one frame, so a sub-frame sample cannot manufacture a fling', () => {
    // Without the floor, two moves in the same millisecond divide by ~0 and ANY delta reads as
    // a fling — which is the nondeterminism this pin exists to keep out of the suite.
    const { onClose } = mount({ visible: true })
    swipe(100, 220, 12) // 10px per step = 600 px/s, and 120px < 196.5px
    expect(onClose).not.toHaveBeenCalled()
  })

  it('puts the flick boundary at 800 px/s, two-sided — 13px a frame pulls, 14px flings', () => {
    // The floor is 1000/60, so a step of `d` px reads as `d * 60` px/s and DISMISS_VELOCITY
    // lands at 13.34px per frame. Both cases stay well under the 196.5px distance arm, so it
    // is the velocity arm and the floor's VALUE that decide them: at a 30Hz floor the same two
    // gestures read 390 and 420 px/s and neither closes the sheet.
    const slow = mount({ visible: true })
    swipe(100, 230, 10) // 13px per step = 780 px/s, 130px travel
    expect(slow.onClose).not.toHaveBeenCalled()
    cleanup()

    const flick = mount({ visible: true })
    swipe(100, 240, 10) // 14px per step = 840 px/s, 140px travel
    expect(flick.onClose).toHaveBeenCalledTimes(1)
  })

  it('ends a drag whose release was never delivered', () => {
    // `MapBottomSheet:79-84` carries the same net: a move that finds the button already up is
    // a release we missed, and without this the sheet stays stuck to the cursor.
    const { onClose } = mount({ visible: true })
    const zone = grab()
    fireEvent.pointerDown(zone, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(zone, { clientY: 400, pointerId: 1, buttons: 0 })
    expect(onClose).toHaveBeenCalledTimes(1) // 300px of travel, over the 196.5px threshold
    fireEvent.pointerMove(zone, { clientY: 700, pointerId: 1, buttons: 0 }) // stray hover
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not start a drag at all when swipe-to-dismiss is off', () => {
    // `MediaLibrarySheet.tsx:230` and `ExportActionSheet.tsx:112` are the two named consumers.
    const { onClose } = mount({ visible: true, enableSwipeToDismiss: false })
    swipe(100, 400, 30)
    expect(onClose).not.toHaveBeenCalled()
    expect(panel().style.transform).toBe('')
  })

  it('never dismisses on an upward swipe, and never translates upward', () => {
    const { onClose } = mount({ visible: true })
    const zone = grab()
    fireEvent.pointerDown(zone, { clientY: 500, pointerId: 1 })
    fireEvent.pointerMove(zone, { clientY: 100, pointerId: 1, buttons: 1 })
    // A bottom sheet does not travel up out of its own frame.
    expect(panel().style.transform).toBe('')
    fireEvent.pointerUp(zone, { clientY: 100, pointerId: 1 })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('stays CLAIMED once activated, even when the finger returns to where it started', () => {
    // The activation flag lives on the drag ref, not on `dragY !== 0`: a drag that comes back
    // to its origin has a zero offset and is still claimed. Inferring it from the offset makes
    // the sheet demand a second 10px before it will follow the finger again.
    mount({ visible: true })
    const zone = grab()
    fireEvent.pointerDown(zone, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(zone, { clientY: 150, pointerId: 1, buttons: 1 })
    expect(panel().style.transform).toBe('translateY(50px)')
    fireEvent.pointerMove(zone, { clientY: 100, pointerId: 1, buttons: 1 }) // back to origin
    expect(panel().style.transform).toBe('')
    fireEvent.pointerMove(zone, { clientY: 105, pointerId: 1, buttons: 1 }) // 5px — under the offset
    expect(panel().style.transform).toBe('translateY(5px)')
    // …and now ABOVE the start, which is the only way to reach the transform guard with a
    // negative offset. A bottom sheet dragged upward paints nothing; `dragY !== 0` here would
    // lift it out of the top of its own frame.
    fireEvent.pointerMove(zone, { clientY: 80, pointerId: 1, buttons: 1 })
    expect(panel().style.transform).toBe('')
  })
})

// ---------------------------------------------------------------------------------------
// The scrim fades; it does not travel. (PR #127)
// ---------------------------------------------------------------------------------------

describe('GlassBottomSheet — scrim motion is independent of the sheet`s transform', () => {
  it('animates the scrim on the fade keyframe and the panel on the slide keyframe', () => {
    mount({ visible: true })
    expect(scrim().style.animation).toContain(SCRIM_FADE_KEYFRAME)
    expect(scrim().style.animation).not.toContain(SHEET_SLIDE_KEYFRAME)
    expect(panel().style.animation).toContain(SHEET_SLIDE_KEYFRAME)
  })

  it('makes the scrim a SIBLING of the panel, so it cannot inherit the transform', () => {
    // The structural half, and the one that matters: PR #127's bug was that RN's
    // `animationType="slide"` translated the Modal's whole content view, so the scrim rode up
    // WITH the sheet. Nesting the scrim inside the panel would reproduce it exactly, and every
    // value-level pin above would still be green.
    mount({ visible: true })
    expect(panel().contains(scrim())).toBe(false)
    expect(scrim().parentElement).toBe(panel().parentElement)
  })

  it('leaves the scrim untransformed while the sheet is dragged', () => {
    mount({ visible: true })
    const zone = grab()
    fireEvent.pointerDown(zone, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(zone, { clientY: 200, pointerId: 1, buttons: 1 })
    expect(panel().style.transform).toBe('translateY(100px)')
    expect(scrim().style.transform).toBe('')
  })
})

// ---------------------------------------------------------------------------------------
// Layering — D14 froze these numbers.
// ---------------------------------------------------------------------------------------

describe('GlassBottomSheet — layering', () => {
  it('paints the scrim on PICKER_SHEET_Z and the panel one above it', () => {
    mount({ visible: true })
    expect(scrim().style.zIndex).toBe(String(PICKER_SHEET_Z))
    expect(panel().style.zIndex).toBe(String(PICKER_SHEET_Z + 1))
    expect(PICKER_SHEET_Z).toBe(31)
  })

  it('portals into the phone-overlay node when one is present', () => {
    const overlay = document.createElement('div')
    document.body.appendChild(overlay)
    render(
      <PhoneOverlayContext.Provider value={overlay}>
        <GlassBottomSheet visible title="Ported" onClose={vi.fn()}>
          <div>portaled body</div>
        </GlassBottomSheet>
      </PhoneOverlayContext.Provider>,
    )
    expect(overlay.querySelector('[role="dialog"]')).toBeTruthy()
    expect(overlay).toHaveTextContent('portaled body')
    document.body.removeChild(overlay)
  })
})

// ---------------------------------------------------------------------------------------
// Chrome and slots.
// ---------------------------------------------------------------------------------------

describe('GlassBottomSheet — the five sheet-chrome fragments reach the DOM (W2/F28)', () => {
  it('paints panel, scrim, header band, handle and accent strip from the seam', () => {
    // One case, five spread points. Deleting any `...fragment` in `GlassBottomSheet.tsx` leaves
    // that key's declarations missing here and names which ones — the five mutations that
    // previously SURVIVED the full suite.
    mount({ visible: true })
    expect({
      panel: missing(panel(), sheetSurface),
      scrim: missing(scrim(), sheetScrim),
      header: missing(header(), sheetHeaderBand),
      handle: missing(handle(), sheetHandle),
      strip: missing(strip(), sheetAccentStrip),
    }).toEqual({ panel: [], scrim: [], header: [], handle: [], strip: [] })
  })

  it('composes the panel ON TOP of the fragment, never instead of it', () => {
    // The subset check above cannot see a panel that re-declares a fragment key with a
    // different value (the declaration would simply differ and be reported), but it also
    // cannot see WHICH layer won. These four are the ones the shell adds around the fragment,
    // and the sheet tier's ground and lit edge must survive underneath them.
    mount({ visible: true })
    const el = panel()
    expect(el.style.position).toBe('absolute')
    expect(el.style.zIndex).toBe(String(PICKER_SHEET_Z + 1))
    expect(el.style.maxHeight).toBe('90%')
    expect(el.style.overflow).toBe('hidden')
    // W4/F85: read the edges off the FRAGMENT, not off a hand-spelled dark string. What this
    // cell asserts is that the shell's four keys did not erase the sheet tier's ground and lit
    // edge underneath them — a relationship, and one that holds in either scheme. jsdom re-spaces
    // the tier's unspaced `rgba()`, hence `norm` on both sides.
    expect(norm(el.style.borderTopColor)).toBe(norm(String(sheetSurface.borderTopColor)))
    expect(norm(el.style.borderRightColor)).toBe(norm(String(sheetSurface.borderRightColor)))
  })
})

describe('GlassBottomSheet — chrome', () => {
  it('names the dialog by its title and shows a subtitle only when given one', () => {
    const { rerender } = mount({ visible: true })
    expect(screen.getByRole('dialog', { name: 'Select Date' })).toBeInTheDocument()
    expect(panel().getAttribute('aria-modal')).toBe('true')
    rerender({ subtitle: '3 of 8 locations shown' })
    expect(screen.getByText('3 of 8 locations shown')).toBeInTheDocument()
  })

  it('shows the handle and the accent strip by default, and drops each on request', () => {
    const { rerender } = mount({ visible: true })
    expect(document.querySelector('[data-sheet-handle]')).toBeTruthy()
    expect(document.querySelector('[data-sheet-accent-strip]')).toBeTruthy()
    rerender({ showHandle: false, showAccentStrip: false })
    expect(document.querySelector('[data-sheet-handle]')).toBeNull()
    expect(document.querySelector('[data-sheet-accent-strip]')).toBeNull()
  })

  it('owns NO close affordance — a ✕ is the caller`s, via headerRight', () => {
    // Phone `:135-137`: "The shell owns no close affordance; a caller that wants one passes it
    // as `headerRight` or renders it in `footer`." A shell-owned ✕ is what made five sheets
    // announce a bare "Close" (DEF-UI-006).
    mount({ visible: true })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('announces the scrim ONLY when the caller named what is being dismissed', () => {
    const { rerender } = mount({ visible: true })
    expect(scrim().getAttribute('role')).toBeNull()
    expect(scrim().getAttribute('aria-label')).toBeNull()
    expect(scrim().getAttribute('tabindex')).toBeNull()
    rerender({ closeLabel: 'Close map filters' })
    expect(screen.getByRole('button', { name: 'Close map filters' })).toBe(scrim())
  })

  it('makes the announced scrim keyboard-OPERABLE, not just labelled (W2/F46)', () => {
    // A `role="button"` that cannot be reached or activated from a keyboard fails WCAG 2.1.1.
    // The role, the tab stop and the key handler are one decision.
    const { onClose } = mount({ visible: true, closeLabel: 'Close map filters' })
    expect(scrim().getAttribute('tabindex')).toBe('0')
    fireEvent.keyDown(scrim(), { key: 'Enter' })
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(scrim(), { key: ' ' })
    expect(onClose).toHaveBeenCalledTimes(2)
    // …and nothing else on the scrim activates it — Escape is the sheet's own route, handled
    // on `document`, and must not double-fire through here.
    fireEvent.keyDown(scrim(), { key: 'a' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('caps at maxHeightRatio and hugs its content by default', () => {
    const { rerender } = mount({ visible: true })
    expect(panel().style.maxHeight).toBe('90%')
    expect(panel().style.height).toBe('')
    rerender({ maxHeightRatio: 0.5 })
    expect(panel().style.maxHeight).toBe('50%')
  })

  it('hands the body a definite height to flex into at fillHeight', () => {
    const { rerender } = mount({ visible: true })
    // Default: the sheet hugs its content and the body only SHRINKS. A `flex: 1` list inside
    // a content-sized column measures to zero, which is the whole reason `fillHeight` exists.
    expect(panel().style.height).toBe('')
    expect(body().style.flexShrink).toBe('1')
    expect(body().style.flex).toBe('')
    rerender({ fillHeight: true })
    expect(panel().style.height).toBe('90%')
    expect(body().style.flex).toBe('1 1 0%')
  })

  it('renders a footer only when given one', () => {
    const { rerender } = mount({ visible: true })
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    rerender({ footer: <button>Done</button> })
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })
})
