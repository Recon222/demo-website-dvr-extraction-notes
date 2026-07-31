import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useLongPress, LONG_PRESS_MS } from '@/features/demo/ui/useLongPress'

/**
 * P3.5 — the honest web stand-in for the phone's long-press gesture. What matters behaviourally:
 * a held pointer fires once after the delay, movement/release cancels it, the click that ends a
 * hold does NOT also activate the row, and keyboard activation is never swallowed.
 */

function Probe({ onLongPress, onClick }: { onLongPress(): void; onClick(): void }) {
  const press = useLongPress(onLongPress)
  return (
    <button type="button" onClick={press.guardClick(onClick)} {...press.handlers}>
      Row
    </button>
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

  it('a press in flight when the element unmounts never fires', () => {
    const onLongPress = vi.fn()
    const { unmount } = render(<Probe onLongPress={onLongPress} onClick={vi.fn()} />)

    down()
    unmount()
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))

    expect(onLongPress).not.toHaveBeenCalled()
  })
})
