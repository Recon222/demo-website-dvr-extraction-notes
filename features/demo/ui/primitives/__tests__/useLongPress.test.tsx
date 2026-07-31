import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useLongPress, LONG_PRESS_MS } from '@/features/demo/ui/primitives/useLongPress'

/**
 * The honest web stand-in for the phone's long-press gesture (P3.5's suite, carried onto the
 * merged hook at the P3 assembly — see the hook's header for what each package contributed).
 * What matters behaviourally: a held pointer fires once after the delay, movement/release
 * cancels it, the click that ends a hold does NOT also activate the row, keyboard activation is
 * never swallowed, and `enabled: false` makes the whole thing inert.
 *
 * The probe mirrors the real call site: the handlers ride a WRAPPER, and the interactive child
 * carries its own plain `onClick`. That is what the capture-phase swallow is for — it has to
 * reach a descendant's handler, which a `guardClick`-style wrapper threaded through one
 * callback could not.
 */

function Probe({ onLongPress, onClick, enabled }: { onLongPress(): void; onClick(): void; enabled?: boolean }) {
  const press = useLongPress(onLongPress, { enabled })
  return (
    <button type="button" onClick={onClick} {...press}>
      <span>Row</span>
    </button>
  )
}

/**
 * The dashboard's shape: the surface is a plain element with its own interactive children.
 * `Probe` above is the Cases shape (the surface IS the button). Between them the two real call
 * sites are covered, which matters because the nested-control rule is `closest(control) !==
 * currentTarget` — it has to arm on one and bail on the other.
 */
function CardProbe({ onLongPress, onNested }: { onLongPress(): void; onNested(): void }) {
  const press = useLongPress(onLongPress)
  return (
    <div {...press}>
      <span>card body</span>
      <button type="button" onClick={onNested}>
        pill
      </button>
    </div>
  )
}

const row = () => screen.getByRole('button', { name: 'Row' })
/** A pointerdown on the surface. Defaults to MOUSE — since R-20 the hook branches on
 *  `pointerType`, so an arm about touch has to say so. */
const down = (o: { clientX?: number; clientY?: number; button?: number; pointerType?: string } = {}) =>
  fireEvent.pointerDown(row(), { pointerId: 1, button: 0, pointerType: 'mouse', clientX: 10, clientY: 10, ...o })
const touchDown = (o: { clientX?: number; clientY?: number } = {}) => down({ pointerType: 'touch', ...o })
/** A real (pointer-originated) click carries detail ≥ 1; keyboard activation carries 0. */
const click = (detail = 1) => fireEvent.click(row(), { detail })

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useLongPress', () => {
  it('fires once after the hold delay', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    down()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS - 1))
    expect(onLongPress).not.toHaveBeenCalled()

    act(() => void vi.advanceTimersByTime(1))
    expect(onLongPress).toHaveBeenCalledOnce()

    act(() => void vi.advanceTimersByTime(2000))
    expect(onLongPress).toHaveBeenCalledOnce() // no repeat
  })

  it('a quick tap opens the row instead', () => {
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={onClick} />)

    down()
    act(() => void vi.advanceTimersByTime(120))
    fireEvent.pointerUp(row())
    click()

    expect(onLongPress).not.toHaveBeenCalled()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('swallows the click that ends a hold (one gesture, one outcome)', () => {
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={onClick} />)

    down()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    fireEvent.pointerUp(row())
    click()

    expect(onLongPress).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()

    // …and only that one click: the next tap works normally.
    down()
    fireEvent.pointerUp(row())
    click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('cancels when the pointer wanders (a scroll or drag is not a hold)', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    down({ clientX: 10, clientY: 10 })
    fireEvent.pointerMove(row(), { pointerId: 1, clientX: 10, clientY: 60 })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('tolerates a small jitter within the hold', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    down({ clientX: 10, clientY: 10 })
    fireEvent.pointerMove(row(), { pointerId: 1, clientX: 13, clientY: 14 })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))

    expect(onLongPress).toHaveBeenCalledOnce()
  })

  it('cancels on release and on pointer cancellation', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    down()
    fireEvent.pointerUp(row())
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))
    expect(onLongPress).not.toHaveBeenCalled()

    down()
    fireEvent.pointerCancel(row())
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('ignores non-primary buttons (that gesture is the context menu)', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    down({ button: 2 })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('opens on the context menu instead of showing the browser one', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    const prevented = !fireEvent.contextMenu(row())
    expect(onLongPress).toHaveBeenCalledOnce()
    expect(prevented).toBe(true)
  })

  // ---- the two halves of the touch/mouse contextmenu asymmetry (review R-1) ----------------
  //
  // A TOUCH hold fires the timer AND raises `contextmenu`; a MOUSE hold fires the timer and
  // raises none. Before R-1 the two surviving hooks each got one of these right and the other
  // wrong, and neither sequence was pinned anywhere — `useLongPress.test.tsx` fired
  // `contextMenu` with no prior hold, `DashboardScreen.test.tsx` pinned only the suppression.

  it('a touch hold that also raises contextmenu fires ONCE, and the next right-click still works', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    touchDown()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    expect(onLongPress).toHaveBeenCalledOnce()

    // The OS menu arrives mid-gesture, with no pointerdown between. The latch consumes it —
    // the pre-R-1 `clear()` was a no-op here (the timer had already nulled itself), so this
    // fired a second time. On the Cases rows, whose callback is a toggle, that read as the
    // hold doing nothing at all.
    fireEvent.contextMenu(row())
    expect(onLongPress).toHaveBeenCalledOnce()

    // …and the latch is spent, so a deliberate right-click afterwards is not swallowed.
    fireEvent.contextMenu(row())
    expect(onLongPress).toHaveBeenCalledTimes(2)
  })

  it('a MOUSE hold does not leave a latch that eats the next right-click', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    // No contextmenu follows a mouse hold, so nothing consumes the latch during the gesture.
    down()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    fireEvent.pointerUp(row())
    fireEvent.click(row(), { detail: 1 })
    expect(onLongPress).toHaveBeenCalledOnce()

    // The right-click's OWN pointerdown (button 2) is what clears it — which is why the reset
    // runs BEFORE the `e.button !== 0` guard, not after it as P3.2's copy did.
    fireEvent.pointerDown(row(), { pointerId: 1, button: 2, clientX: 10, clientY: 10 })
    fireEvent.contextMenu(row())
    expect(onLongPress).toHaveBeenCalledTimes(2)
  })

  it('never swallows keyboard activation, even with the flag armed by an abandoned hold [R-18]', () => {
    // The exemption `if (e.detail === 0) return`. A hold released OFF the row leaves
    // `swallowNextClick` armed — `clear()` touches only the timer and the origin — and an
    // Enter/Space activation synthesises a click with `detail: 0`. Without the line that click
    // would be `preventDefault`ed on the surface carrying Delete and Duplicate…
    //
    // §56f recorded this exemption as a known wrong-reason trap, and R-1's rewrite of this file
    // then replaced the arm that pinned it instead of adding beside it. Restored (R-18): a
    // repo-wide grep for `detail: 0` had returned nothing at all.
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={onClick} />)

    down()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    expect(onLongPress).toHaveBeenCalledOnce()

    click(0) // keyboard
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('a MOUSE hold leaves nothing for the keyboard menu key to trip over [R-20]', () => {
    // Shift+F10 / the Menu key raises `contextmenu` on the FOCUSED element with NO pointer event
    // at all, so R-1's reset-first-guard-second rule — which keys off pointerdown — could not
    // clear the latch. R-1's own improvement made this reachable: the Cases gesture surface is
    // now a real `<button>`, hence focusable. The latch is now set only for touch, which is the
    // only gesture that has a trailing `contextmenu` to consume it.
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    down()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    fireEvent.pointerUp(row())
    fireEvent.click(row(), { detail: 1 })
    expect(onLongPress).toHaveBeenCalledOnce()

    fireEvent.contextMenu(row()) // keyboard menu key: no pointerdown precedes it
    expect(onLongPress).toHaveBeenCalledTimes(2)
  })

  it('does not arm on a nested control, but still arms on the surface itself', () => {
    // The rule is `closest(control) !== currentTarget`, not P3.2's bare `closest('button')`:
    // the Cases rows attach the hook TO a button (see `Probe`, which arms throughout this
    // suite), so lifting the bare check would have killed the gesture there outright.
    const onLongPress = vi.fn()
    const onNested = vi.fn()
    render(<CardProbe onLongPress={onLongPress} onNested={onNested} />)

    fireEvent.pointerDown(screen.getByText('pill'), { pointerId: 1, button: 0, clientX: 1, clientY: 1 })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))
    expect(onLongPress).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('pill'), { detail: 1 })
    expect(onNested).toHaveBeenCalledOnce() // the pill's own press is untouched

    fireEvent.pointerDown(screen.getByText('card body'), { pointerId: 1, button: 0, clientX: 1, clientY: 1 })
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    expect(onLongPress).toHaveBeenCalledOnce()
  })

  it('is wholly inert while disabled, and cancels a hold already in flight', () => {
    // The phone's "swipe disabled while the card is expanded" rule (`SwipeableCaseCard.tsx:99`).
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    const { rerender } = render(<Probe onLongPress={onLongPress} onClick={onClick} enabled={false} />)

    down()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))
    expect(onLongPress).not.toHaveBeenCalled()
    fireEvent.contextMenu(row())
    expect(onLongPress).not.toHaveBeenCalled()
    click()
    expect(onClick).toHaveBeenCalledOnce() // and the row itself still works

    // A hold in flight when the row is disabled must not fire into a surface that just changed.
    rerender(<Probe onLongPress={onLongPress} onClick={onClick} enabled />)
    down()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS - 50))
    rerender(<Probe onLongPress={onLongPress} onClick={onClick} enabled={false} />)
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('a press in flight when the element unmounts never fires', () => {
    const onLongPress = vi.fn()
    const { unmount } = render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    down()
    unmount()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))

    expect(onLongPress).not.toHaveBeenCalled()
  })
})
