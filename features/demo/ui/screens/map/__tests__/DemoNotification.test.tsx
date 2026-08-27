import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DemoNotification } from '@/features/demo/ui/screens/map/DemoNotification'

describe('DemoNotification', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders the message and auto-dismisses', () => {
    const onDismiss = vi.fn()
    render(<DemoNotification message="Calling isn't available in the demo." onDismiss={onDismiss} />)
    expect(screen.getByText(/Calling isn't available/)).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(3000))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('gives a SECOND notice its own full dwell, not the first one\'s remainder [R-8]', () => {
    // The bridge renders this element positionally, so a `notice` change re-uses the same
    // instance. With `[durationMs]` deps the text swapped and the timer did not restart: a
    // notice raised at t≈2.4s lived ~200ms. P3 made this banner the ENTIRE outcome of the two
    // export actions and the failure arms, so a sub-perceptual flash reads as a dead button —
    // exactly what the honest-notice treatment exists to prevent.
    const onDismiss = vi.fn()
    const { rerender } = render(<DemoNotification message="Export ZIP isn't available yet." onDismiss={onDismiss} />)

    act(() => vi.advanceTimersByTime(2400))
    expect(onDismiss).not.toHaveBeenCalled()

    rerender(<DemoNotification message="Export GeoJSON isn't available yet." onDismiss={onDismiss} />)
    act(() => vi.advanceTimersByTime(2400)) // past the FIRST notice's deadline, short of its own
    expect(screen.getByText(/GeoJSON/)).toBeInTheDocument()
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(300))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('is a live region — for the export and failure arms it is the only feedback there is [R-9]', () => {
    render(<DemoNotification message="Error. Location not found." onDismiss={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Error. Location not found.')
  })

  it('clears its timer on unmount (no post-unmount dismiss)', () => {
    const onDismiss = vi.fn()
    const { unmount } = render(<DemoNotification message="x" onDismiss={onDismiss} />)
    unmount()
    act(() => vi.advanceTimersByTime(5000))
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
