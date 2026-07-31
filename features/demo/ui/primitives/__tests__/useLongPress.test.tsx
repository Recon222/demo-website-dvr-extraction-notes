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
    <div {...press}>
      <button type="button" onClick={onClick}>
        Row
      </button>
    </div>
  )
}

const row = () => screen.getByRole('button', { name: 'Row' })
const down = (o: { clientX?: number; clientY?: number; button?: number } = {}) =>
  fireEvent.pointerDown(row(), { pointerId: 1, button: 0, clientX: 10, clientY: 10, ...o })
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

  it('never swallows keyboard activation', () => {
    const onLongPress = vi.fn()
    const onClick = vi.fn()
    render(<Probe onLongPress={onLongPress} onClick={onClick} />)

    // A hold that ended off-element leaves the guard armed; Enter (detail 0) must still work.
    down()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    click(0)

    expect(onClick).toHaveBeenCalledOnce()
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
